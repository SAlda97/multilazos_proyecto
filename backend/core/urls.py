# core/urls.py
from django.urls import path
from .views import health, auth_login, auth_logout, auth_me  
from .views_clientes import TipoClienteListView, TipoClienteDetailView
from django.http import JsonResponse
from .views_categoria_productos import categoria_productos_list, categoria_productos_detail 
from .views_tipo_transacciones import  tipo_transacciones_list, tipo_transacciones_detail
from .views_categoria_gastos import categoria_gastos_list, categoria_gastos_detail



urlpatterns = [
    path('ping/', lambda r: JsonResponse({'ok': True})),
    path("health/", health, name="health"),
    path("auth/login", auth_login, name="auth_login"),
    path("auth/logout", auth_logout, name="auth_logout"),
    path("auth/me", auth_me, name="auth_me"),

    #TIPO CLIENTES
    path('tipo-clientes/', TipoClienteListView.as_view(), name='tipo-clientes-list'),
    path('tipo-clientes/<int:id_tipo_cliente>/', TipoClienteDetailView.as_view(), name='tipo-clientes-detail'),
    #CATEGORIA PRODUCTOS
    path('categorias-productos/', categoria_productos_list, name='categorias-productos-list'),
    path('categorias-productos/<int:id_categoria>/', categoria_productos_detail, name='categorias-productos-detail'),
    #TIPOS TRANSACCIONES
    path('tipo-transacciones/', tipo_transacciones_list, name='tipo-transacciones-list'),
    path('tipo-transacciones/<int:id_tipo_transaccion>/', tipo_transacciones_detail, name='tipo-transacciones-detail'),
    #CATEGORIA GASTOS
    path('categorias-gastos/', categoria_gastos_list, name='categorias-gastos-list'),
    path('categorias-gastos/<int:id_categoria_gastos>/', categoria_gastos_detail, name='categorias-gastos-detail'),

]
