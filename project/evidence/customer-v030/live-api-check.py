"""Synthetic loopback API check; no passwords or session tokens are printed or written."""
import http.cookiejar
import json
import os
import secrets
import sys
import urllib.error
import urllib.request
from pathlib import Path

root = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(root))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'customer.settings')
import django
django.setup()
from django.contrib.auth import get_user_model
from django.contrib.sessions.models import Session
from django.db import connections
from customer.models import Profile

base = 'http://127.0.0.1:4188'
checks = []
created = []
clients = []

class BrowserSession:
    def __init__(self):
        self.jar = http.cookiejar.CookieJar()
        self.opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(self.jar))
        self.csrf = ''
        clients.append(self)
        self.call('session')

    def call(self, path, body=None, method=None):
        headers = {'Content-Type': 'application/json', 'X-CSRFToken': self.csrf}
        request = urllib.request.Request(base + '/api/' + path, data=None if body is None else json.dumps(body).encode(), headers=headers, method=method or ('GET' if body is None else 'POST'))
        try:
            response = self.opener.open(request)
        except urllib.error.HTTPError as exc:
            response = exc
        result = json.loads(response.read())
        self.csrf = result.get('csrf', self.csrf)
        return response.status, result

password = secrets.token_urlsafe(24)
username = 'fixture_live_' + secrets.token_hex(6)
other_name = username + '_other'
data = {'birth': {'year': '2000', 'month': '02', 'day': '29'}, 'calendar': 'gregorian', 'time_precision': 'unknown', 'birth_time': '', 'birth_country': '測試甲地', 'birth_city': '甲城', 'residence_country': '測試乙地', 'residence_city': '乙城', 'relationship': 'single', 'topic': 'self', 'question': '虛構資料，非客戶記錄', 'goal': 'action'}
try:
    first = BrowserSession()
    status, result = first.call('signup', {'username': username, 'password1': password, 'password2': password})
    assert status == 200 and result['authenticated']
    created.append(username)
    checks.append('signup with CSRF and actual password hashing')
    status, saved = first.call('profile', {'revision': 0, 'consent': True, 'policy_version': 'local-test-v1', 'data': data})
    assert status == 200 and saved['profile']['data'] == data
    checks.append('actual HTTP save and authoritative readback')
    connections.close_all()
    assert Profile.objects.get(user__username=username).data == data
    checks.append('separate database connection reads persisted SQLite row')
    second = BrowserSession()
    assert second.call('login', {'username': username, 'password': password})[0] == 200
    assert second.call('profile')[1]['profile'] == saved['profile']
    checks.append('independent cookie jar login reads same record; not real hardware')
    third = BrowserSession()
    assert third.call('signup', {'username': other_name, 'password1': password, 'password2': password})[0] == 200
    created.append(other_name)
    assert third.call('profile')[1]['profile'] is None
    assert third.call('profile', {'revision': 1, 'confirmed': True}, 'DELETE')[0] == 409
    checks.append('other account cannot read or delete first account record')
    changed = {**data, 'question': '已修改的虛構問題'}
    assert second.call('profile', {'revision': 1, 'consent': True, 'policy_version': 'local-test-v1', 'data': changed})[0] == 200
    assert first.call('profile', {'revision': 1, 'consent': True, 'policy_version': 'local-test-v1', 'data': data})[0] == 409
    checks.append('update increments revision; stale client cannot overwrite')
    assert second.call('profile', {'revision': 2, 'confirmed': True}, 'DELETE')[1]['deleted']
    assert first.call('profile')[1]['profile'] is None
    checks.append('confirmed deletion visible to other session')
    assert second.call('logout', {})[0] == 200
    assert second.call('profile')[0] == 401
    checks.append('logout invalidates this session')
finally:
    keys = [cookie.value for client in clients for cookie in client.jar if cookie.name == 'sessionid']
    Session.objects.filter(session_key__in=keys).delete()
    get_user_model().objects.filter(username__in=created).delete()
    assert not get_user_model().objects.filter(username__in=created).exists()
    connections.close_all()
print(json.dumps({'status': 'PASS', 'checks': checks, 'synthetic_accounts_and_sessions_removed': True, 'real_devices': 'NOT RUN', 'external_service': False}, ensure_ascii=False, indent=2))
