import copy
import json
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import Client, TestCase
from .models import Profile

# Synthetic credentials and answers exist only in the disposable test database.
PASSWORD = 'Local-fixture!2026-only'
DATA = {'birth': {'year': '2000', 'month': '02', 'day': '29'}, 'calendar': 'gregorian', 'time_precision': 'unknown', 'birth_time': '', 'birth_country': '測試甲地', 'birth_city': '甲城', 'residence_country': '測試乙地', 'residence_city': '乙城', 'relationship': 'single', 'topic': 'work', 'question': '虛構測試問題', 'goal': 'clarity'}


class CustomerTests(TestCase):
    def setUp(self):
        cache.clear()
        self.user = get_user_model().objects.create_user(username='fixture_a', password=PASSWORD)
        self.client.force_login(self.user)

    def send(self, body, client=None, method='post', path='/api/profile'):
        return getattr(client or self.client, method)(path, json.dumps(body), content_type='application/json')

    def save(self, data=None, revision=0, client=None):
        return self.send({'revision': revision, 'consent': True, 'policy_version': 'local-test-v1', 'data': data or copy.deepcopy(DATA)}, client)

    def test_anonymous_profile_and_method_guards(self):
        self.assertEqual(Client().get('/api/profile').status_code, 401)
        self.assertEqual(Client().get('/api/login').status_code, 405)
        self.assertEqual(self.client.put('/api/profile').status_code, 405)

    def test_real_login_signup_csrf_and_private_cookie(self):
        browser = Client(enforce_csrf_checks=True)
        body = {'username': 'new_fixture', 'password1': PASSWORD, 'password2': PASSWORD}
        self.assertEqual(self.send(body, browser, path='/api/signup').status_code, 403)
        token = browser.get('/api/session').json()['csrf']
        result = browser.post('/api/signup', json.dumps(body), content_type='application/json', HTTP_X_CSRFTOKEN=token)
        self.assertEqual(result.status_code, 200)
        self.assertTrue(result.json()['authenticated'])
        cookie = result.cookies['sessionid']
        self.assertTrue(cookie['httponly'])
        self.assertEqual(cookie['samesite'], 'Strict')
        self.assertNotEqual(get_user_model().objects.get(username='new_fixture').password, PASSWORD)
        token = result.json()['csrf']
        self.assertEqual(browser.post('/api/logout', '{}', content_type='application/json', HTTP_X_CSRFTOKEN=token, HTTP_ORIGIN='https://untrusted.invalid').status_code, 403)
        self.assertEqual(browser.post('/api/logout', '{}', content_type='application/json', HTTP_X_CSRFTOKEN=token).status_code, 200)
        self.assertEqual(browser.get('/api/profile').status_code, 401)

    def test_independent_login_sessions_read_same_saved_record(self):
        first = self.save().json()['profile']
        second_browser = Client()
        login = self.send({'username': 'fixture_a', 'password': PASSWORD}, second_browser, path='/api/login')
        self.assertEqual(login.status_code, 200)
        self.assertEqual(second_browser.get('/api/profile').json()['profile'], first)
        self.assertEqual(self.client.get('/api/profile')['Cache-Control'], 'no-store, private')

    def test_second_account_cannot_read_modify_or_delete_first(self):
        original = self.save().json()['profile']
        other = get_user_model().objects.create_user(username='fixture_b', password=PASSWORD)
        second = Client(); second.force_login(other)
        self.assertIsNone(second.get('/api/profile?owner=fixture_a').json()['profile'])
        self.assertEqual(self.send({'revision': 1, 'confirmed': True}, second, method='delete').status_code, 409)
        self.assertEqual(self.save(revision=1, client=second).status_code, 409)
        self.assertEqual(self.client.get('/api/profile').json()['profile'], original)

    def test_explicit_current_policy_consent_required(self):
        for consent, policy in [(False, 'local-test-v1'), (True, 'old-policy'), ('true', 'local-test-v1')]:
            result = self.send({'revision': 0, 'consent': consent, 'policy_version': policy, 'data': DATA})
            self.assertEqual(result.status_code, 400)
        self.assertEqual(Profile.objects.count(), 0)

    def test_dates_and_untrusted_values_do_not_overwrite_saved_data(self):
        original = self.save().json()['profile']
        for birth in [dict(year='', month='1', day='1'), dict(year='10000', month='1', day='1'), dict(year='00001', month='1', day='1'), dict(year='1900', month='2', day='29'), dict(year='2000', month='001', day='1'), dict(year='2000', month='1', day='001'), dict(year='9999', month='1', day='1')]:
            changed = copy.deepcopy(DATA); changed['birth'] = birth
            self.assertEqual(self.save(changed, 1).status_code, 400)
        self.assertEqual(self.client.get('/api/profile').json()['profile'], original)

    def test_ancient_year_and_real_leap_day_accepted(self):
        data = copy.deepcopy(DATA); data['birth'] = {'year': '0001', 'month': '01', 'day': '01'}
        self.assertEqual(self.save(data).status_code, 200)
        self.assertEqual(self.save(revision=1).status_code, 200)

    def test_unknown_time_not_fabricated_and_places_remain_distinct(self):
        result = self.save().json()['profile']['data']
        self.assertEqual(result['birth_time'], '')
        self.assertNotEqual(result['birth_city'], result['residence_city'])
        changed = copy.deepcopy(DATA); changed['birth_time'] = '12:00'
        self.assertEqual(self.save(changed, 1).status_code, 400)
        changed['time_precision'] = 'exact'; changed['birth_time'] = '25:61'
        self.assertEqual(self.save(changed, 1).status_code, 400)

    def test_optimistic_revision_rejects_stale_write_without_data_loss(self):
        self.save()
        changed = copy.deepcopy(DATA); changed['question'] = '較新虛構問題'
        updated = self.save(changed, 1)
        self.assertEqual(updated.json()['profile']['revision'], 2)
        self.assertEqual(self.save(revision=1).status_code, 409)
        self.assertEqual(self.client.get('/api/profile').json()['profile']['data']['question'], changed['question'])
        self.assertEqual(self.save().status_code, 409)

    def test_delete_requires_confirmation_and_matching_revision(self):
        self.save()
        self.assertEqual(self.send({'revision': 1, 'confirmed': False}, method='delete').status_code, 400)
        self.assertEqual(self.send({'revision': 2, 'confirmed': True}, method='delete').status_code, 409)
        self.assertEqual(Profile.objects.count(), 1)
        self.assertTrue(self.send({'revision': 1, 'confirmed': True}, method='delete').json()['deleted'])
        self.assertIsNone(self.client.get('/api/profile').json()['profile'])
        self.assertTrue(get_user_model().objects.filter(pk=self.user.pk).exists())

    def test_unknown_fields_and_oversize_payload_rejected(self):
        changed = copy.deepcopy(DATA); changed['owner'] = 'someone-else'
        self.assertEqual(self.save(changed).status_code, 400)
        changed = copy.deepcopy(DATA); changed['question'] = '字' * 501
        self.assertEqual(self.save(changed).status_code, 400)
        self.assertEqual(self.send({'unexpected': 'x' * 17000}).status_code, 400)

    def test_question_is_roundtripped_as_text_not_rendered_html(self):
        data = copy.deepcopy(DATA); data['question'] = '<img src=x onerror=alert(1)>'
        self.assertEqual(self.save(data).json()['profile']['data']['question'], data['question'])
        self.assertEqual(self.client.get('/api/profile')['Content-Type'], 'application/json')

    def test_private_database_source_and_evidence_are_never_static_files(self):
        for path in ['motion/motion.test.mjs', 'motion/NOTICE.md', 'customer/settings.py', 'customers.sqlite3', 'django-secret', 'requirements.txt', 'evidence/customer-v030/source-before.json', 'assets/../customer/settings.py']:
            self.assertEqual(self.client.get('/' + path).status_code, 404, path)
        self.assertEqual(self.client.get('/').status_code, 200)
        self.assertEqual(self.client.get('/app.js').status_code, 200)
        for name in ['assets/journey-door.mp4', 'assets/journey-idle.mp4', 'assets/journey-response.mp4', 'assets/journey-reveal.mp4', 'assets/journey-room.webp', 'assets/journey-response.webp', 'assets/journey-reveal.webp', 'assets/journey-door.webp', 'assets/journey-altar.webp', 'motion/motion.mjs', 'motion/motion.css', 'assets/xuan-fan-idle-web-v1.mp4', 'assets/xuan-fan-poster-v1.png', 'ziwei.js', 'vendor/iztro-v2.6.5.min.js', 'vendor/THIRD_PARTY_NOTICES.txt']:
            self.assertEqual(self.client.get('/' + name).status_code, 200, name)

    def test_weak_password_and_invalid_login_do_not_create_session(self):
        browser = Client()
        self.assertEqual(self.send({'username': 'weak_fixture', 'password1': '1234', 'password2': '1234'}, browser, path='/api/signup').status_code, 400)
        self.assertEqual(self.send({'username': 'fixture_a', 'password': 'wrong-fixture'}, browser, path='/api/login').status_code, 401)
        self.assertFalse(browser.get('/api/session').json()['authenticated'])

    def test_auth_attempts_are_bounded_in_local_process(self):
        browser = Client()
        for _ in range(15):
            self.assertEqual(self.send({'username': 'x', 'password': 'wrong'}, browser, path='/api/login').status_code, 401)
        self.assertEqual(self.send({'username': 'x', 'password': 'wrong'}, browser, path='/api/login').status_code, 429)
