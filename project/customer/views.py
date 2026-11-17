import json
import mimetypes
import re
from datetime import date
from functools import wraps
from threading import Lock
from django.conf import settings
from django.contrib.auth import login, logout
from django.contrib.auth.forms import AuthenticationForm, UserCreationForm
from django.core.cache import cache
from django.core.exceptions import RequestDataTooBig
from django.db import IntegrityError, transaction
from django.db.models import F
from django.http import FileResponse, Http404, JsonResponse
from django.middleware.csrf import get_token
from django.utils import timezone
from django.views.decorators.http import require_GET, require_POST, require_http_methods
from .models import Profile

POLICY = 'local-test-v1'
FIELDS = {'birth', 'calendar', 'time_precision', 'birth_time', 'birth_country', 'birth_city', 'residence_country', 'residence_city', 'relationship', 'topic', 'question', 'goal'}
AUTH_LOCK = Lock()


def error(message, status=400):
    return JsonResponse({'error': message}, status=status)


def csrf_failure(request, reason=''):
    return error('登入狀態已更新，請重新整理後再試。', 403)


class PrivateHeaders:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        response['X-Content-Type-Options'] = 'nosniff'
        response['Referrer-Policy'] = 'no-referrer'
        response['X-Frame-Options'] = 'DENY'
        if request.path.startswith('/api/'):
            response['Cache-Control'] = 'no-store, private'
            response['Vary'] = 'Cookie'
        return response


def payload(request):
    if request.content_type != 'application/json':
        raise ValueError('請以正確格式提交。')
    try:
        body = json.loads(request.body)
    except (ValueError, UnicodeDecodeError, RequestDataTooBig):
        raise ValueError('提交內容過大或格式不正確。') from None
    if not isinstance(body, dict):
        raise ValueError('提交格式不正確。')
    return body


def json_view(view):
    @wraps(view)
    def wrapped(request):
        try:
            return view(request)
        except ValueError as exc:
            return error(str(exc))
    return wrapped


def profile_data(value):
    if not isinstance(value, dict) or set(value) != FIELDS:
        raise ValueError('資料欄位不完整或包含未支援欄位。')
    birth = value['birth']
    if not isinstance(birth, dict) or set(birth) != {'year', 'month', 'day'}:
        raise ValueError('請填齊出生年月日。')
    for field, limit in [('year', 4), ('month', 2), ('day', 2)]:
        if not isinstance(birth[field], str) or not re.fullmatch(r'[0-9]{1,' + str(limit) + '}', birth[field]):
            raise ValueError('出生年月日格式不正確，請勿輸入超長數字。')
    try:
        birthday = date(int(birth['year']), int(birth['month']), int(birth['day']))
    except ValueError:
        raise ValueError('出生日期並不存在。') from None
    if birthday > timezone.localdate():
        raise ValueError('出生日期唔可以係未來日子。')
    for key in FIELDS - {'birth'}:
        limit = 500 if key == 'question' else 80
        if not isinstance(value[key], str) or len(value[key]) > limit:
            raise ValueError('答案過長或格式不正確。')
    if value['calendar'] != 'gregorian':
        raise ValueError('現階段只接受西曆出生日期。')
    if value['time_precision'] not in ['', 'exact', 'approximate', 'unknown']:
        raise ValueError('請核對出生時間狀態。')
    if value['time_precision'] in ['exact', 'approximate']:
        if not re.fullmatch(r'(?:[01][0-9]|2[0-3]):[0-5][0-9]', value['birth_time']):
            raise ValueError('請填有效出生時間，或選不知道。')
    elif value['birth_time']:
        raise ValueError('未知時間不可同時填入時間值。')
    if value['relationship'] not in ['', 'single', 'dating', 'married', 'other', 'private']:
        raise ValueError('請核對感情狀況。')
    if value['topic'] not in ['work', 'love', 'self'] or value['goal'] not in ['clarity', 'understand', 'action']:
        raise ValueError('請先選主題及目標。')
    return value


def packed(row):
    return {'data': row.data, 'revision': row.revision, 'updated_at': row.updated_at.isoformat(), 'analysis_status': 'not_available'}


def session_response(request):
    return JsonResponse({'authenticated': request.user.is_authenticated, 'username': request.user.username if request.user.is_authenticated else '', 'csrf': get_token(request), 'policy_version': POLICY, 'mode': 'local-test'})


@require_GET
def session(request):
    return session_response(request)

def auth_throttled(request):
    # shortcut: one local process; a hosted service needs a shared, reviewed rate limiter.
    key = 'auth:' + request.META.get('REMOTE_ADDR', '')
    with AUTH_LOCK:
        attempts = cache.get(key, 0)
        if attempts >= 15:
            return True
        cache.set(key, attempts + 1, 600)
    return False


@require_POST
@json_view
def signup(request):
    if auth_throttled(request):
        return error('嘗試次數太多，請稍後再試。', 429)
    body = payload(request)
    if set(body) != {'username', 'password1', 'password2'} or not all(isinstance(v, str) and len(v) <= 256 for v in body.values()):
        return error('帳戶欄位格式不正確。')
    form = UserCreationForm(body)
    if not form.is_valid():
        return error('未能建立帳戶。請換個帳戶名稱，並用至少12字元、非純數字且不常見的密碼。')
    try:
        with transaction.atomic():
            user = form.save()
    except IntegrityError:
        return error('未能建立帳戶，請換個帳戶名稱。')
    login(request, user)
    return session_response(request)


@require_POST
@json_view
def signin(request):
    if auth_throttled(request):
        return error('嘗試次數太多，請稍後再試。', 429)
    body = payload(request)
    if set(body) != {'username', 'password'} or not all(isinstance(v, str) and len(v) <= 256 for v in body.values()):
        return error('帳戶欄位格式不正確。')
    form = AuthenticationForm(request, data=body)
    if not form.is_valid():
        return error('帳戶名稱或密碼不正確。', 401)
    login(request, form.get_user())
    return session_response(request)


@require_POST
def signout(request):
    logout(request)
    return session_response(request)


@require_http_methods(['GET', 'POST', 'DELETE'])
@json_view
def profile(request):
    if not request.user.is_authenticated:
        return error('請先登入私人帳戶。', 401)
    row = Profile.objects.filter(user=request.user).first()
    if request.method == 'GET':
        return JsonResponse({'profile': packed(row) if row else None})
    body = payload(request)
    revision = body.get('revision')
    if type(revision) is not int or revision < 0:
        return error('資料版本不正確。')
    if request.method == 'DELETE':
        if set(body) != {'revision', 'confirmed'} or body['confirmed'] is not True:
            return error('請先確認刪除。')
        count, _ = Profile.objects.filter(user=request.user, revision=revision).delete()
        if not count:
            return error('資料已變更或已刪除，請先重新載入。', 409)
        return JsonResponse({'deleted': True})
    if set(body) != {'revision', 'consent', 'policy_version', 'data'} or body['consent'] is not True or body['policy_version'] != POLICY:
        return error('請先閱讀並同意本機測試資料保存安排。')
    data = profile_data(body['data'])
    now = timezone.now()
    if revision == 0:
        try:
            with transaction.atomic():
                row = Profile.objects.create(user=request.user, data=data, consent_version=POLICY, consented_at=now)
        except IntegrityError:
            return error('帳戶已有資料，請先重新載入再更改。', 409)
    else:
        count = Profile.objects.filter(user=request.user, revision=revision).update(data=data, revision=F('revision') + 1, consent_version=POLICY, consented_at=now, updated_at=now)
        if not count:
            return error('資料已在其他工作階段更改，請先重新載入。', 409)
        row = Profile.objects.get(user=request.user)
    row.refresh_from_db()
    return JsonResponse({'profile': packed(row)})


@require_GET
def page(request, name='index.html'):
    allowed = {'motion/motion.mjs', 'motion/motion.css', 'assets/xuan-fan-idle-web-v1.mp4', 'assets/xuan-fan-poster-v1.png', 'ziwei.js', 'vendor/iztro-v2.6.5.min.js', 'vendor/THIRD_PARTY_NOTICES.txt', 'index.html', 'styles.css', 'app.js', 'content.js', 'customer.js', '玄與九爺-網頁初稿.html', 'assets/office-scene-v1.png', 'assets/xuan-v2.png', 'assets/jiuye-v2.png', 'assets/story-hall.png', 'assets/journey-door.mp4', 'assets/journey-idle.mp4', 'assets/journey-response.mp4', 'assets/journey-reveal.mp4', 'assets/journey-room.webp', 'assets/journey-response.webp', 'assets/journey-reveal.webp', 'assets/journey-door.webp', 'assets/journey-altar.webp'}
    if name not in allowed:
        raise Http404
    return FileResponse((settings.BASE_DIR / name).open('rb'), content_type=mimetypes.guess_type(name)[0])
