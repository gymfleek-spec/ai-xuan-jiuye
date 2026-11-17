import os
import secrets
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = Path(os.environ.get('XUAN_DATA_DIR', Path.home() / 'Library/Application Support/XuanJiuye-local'))
if DATA_DIR.resolve().is_relative_to(BASE_DIR):
    raise RuntimeError('Private data must be outside the source/static directory.')
DATA_DIR.mkdir(mode=0o700, parents=True, exist_ok=True)
os.umask(0o077)
key_file = DATA_DIR / 'django-secret'
if not key_file.exists():
    try:
        with key_file.open('x') as stream:
            stream.write(secrets.token_urlsafe(64))
    except FileExistsError:
        pass
SECRET_KEY = key_file.read_text()
DEBUG = False
ALLOWED_HOSTS = ['127.0.0.1', 'localhost', 'testserver', '[::1]']
ROOT_URLCONF = 'customer.urls'
INSTALLED_APPS = ['django.contrib.auth', 'django.contrib.contenttypes', 'django.contrib.sessions', 'customer']
MIDDLEWARE = ['django.middleware.security.SecurityMiddleware', 'django.contrib.sessions.middleware.SessionMiddleware', 'django.middleware.csrf.CsrfViewMiddleware', 'django.contrib.auth.middleware.AuthenticationMiddleware', 'customer.views.PrivateHeaders']
DATABASES = {'default': {'ENGINE': 'django.db.backends.sqlite3', 'NAME': DATA_DIR / 'customers.sqlite3', 'TEST': {'NAME': os.environ.get('XUAN_TEST_DB')}}}
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator', 'OPTIONS': {'min_length': 12}},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Strict'
CSRF_COOKIE_SAMESITE = 'Strict'
SESSION_EXPIRE_AT_BROWSER_CLOSE = True
SESSION_COOKIE_AGE = 8 * 60 * 60
# shortcut: loopback HTTP development only; require HTTPS and secure cookies before any hosted release.
SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SECURE = False
CSRF_FAILURE_VIEW = 'customer.views.csrf_failure'
DATA_UPLOAD_MAX_MEMORY_SIZE = 16384
LANGUAGE_CODE = 'zh-hant'
TIME_ZONE = 'Asia/Hong_Kong'
USE_TZ = True
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
