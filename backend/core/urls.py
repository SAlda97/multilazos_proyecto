# core/urls.py
from django.urls import path
from .views import health, auth_login, auth_logout, auth_me  # importa solo lo que usas

urlpatterns = [
    path("health/", health, name="health"),
    path("auth/login", auth_login, name="auth_login"),
    path("auth/logout", auth_logout, name="auth_logout"),
    path("auth/me", auth_me, name="auth_me"),
]
