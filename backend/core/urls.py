# core/urls.py
from django.urls import path
from .views import health, auth_login, auth_logout, auth_me  
from .views_clientes import TipoClienteListView, TipoClienteDetailView
from django.http import JsonResponse
from .views_categoria_productos import categoria_productos_list, categoria_productos_detail 


urlpatterns = [
    path('ping/', lambda r: JsonResponse({'ok': True})),
    path("health/", health, name="health"),
    path("auth/login", auth_login, name="auth_login"),
    path("auth/logout", auth_logout, name="auth_logout"),
    path("auth/me", auth_me, name="auth_me"),
    path('tipo-clientes/', TipoClienteListView.as_view(), name='tipo-clientes-list'),
    path('tipo-clientes/<int:id_tipo_cliente>/', TipoClienteDetailView.as_view(), name='tipo-clientes-detail'),

    path('categorias-productos/', categoria_productos_list, name='categorias-productos-list'),
    path('categorias-productos/<int:id_categoria>/', categoria_productos_detail, name='categorias-productos-detail'),

]
