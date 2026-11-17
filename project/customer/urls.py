from django.urls import path
from . import views

urlpatterns = [
    path('api/session', views.session),
    path('api/signup', views.signup),
    path('api/login', views.signin),
    path('api/logout', views.signout),
    path('api/profile', views.profile),
    path('', views.page),
    path('<path:name>', views.page),
]
