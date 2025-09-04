# core/views.py
from django.contrib.auth import authenticate, login, logout
from django.views.decorators.http import require_POST
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
import json

def health(request):
    return JsonResponse({"status": "ok"})

@csrf_exempt
@require_POST
def auth_login(request):
    data = json.loads(request.body.decode("utf-8"))
    user = authenticate(request,
        username=data.get("username"),
        password=data.get("password"),
    )
    if not user:
        return JsonResponse({"detail": "Credenciales inválidas"}, status=401)
    login(request, user)
    return JsonResponse({"ok": True, "user": user.username})

@csrf_exempt
@require_POST
def auth_logout(request):
    logout(request)
    return JsonResponse({"ok": True})


def auth_me(request):
    if not request.user.is_authenticated:
        return JsonResponse({"detail": "No autenticado"}, status=401)
    u = request.user
    return JsonResponse({"username": u.username, "is_staff": u.is_staff})