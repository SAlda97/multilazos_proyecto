# core/urls.py
from django.urls import path
from .views import health, auth_login, auth_logout, auth_me  
from .views_clientes import TipoClienteListView, TipoClienteDetailView
from django.http import JsonResponse
from .views_categoria_productos import categoria_productos_list, categoria_productos_detail 
from .views_tipo_transacciones import  tipo_transacciones_list, tipo_transacciones_detail
from .views_categoria_gastos import categoria_gastos_list, categoria_gastos_detail
from .views_clientes_crud import clientes_list, clientes_detail
from .views_productos import productos_list, productos_detail
from .views_gastos import gastos_list, gastos_detail
from .views_dim_fecha import dim_fecha_lookup, dim_fecha_detail


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
    #CLIENTES
    path('clientes/', clientes_list, name='clientes-list'),
    path('clientes/<int:id_cliente>/', clientes_detail, name='clientes-detail'),
    #PRODUCTOS
    path('productos/', productos_list, name='productos-list'),
    path('productos/<int:id_producto>/', productos_detail, name='productos-detail'),
    #GASTOS
    path('gastos/', gastos_list, name='gastos-list'),
    path('gastos/<int:id_gasto>/', gastos_detail, name='gastos-detail'),
    #DIM FECHA
    path('dim-fecha/', dim_fecha_lookup, name='dim-fecha-lookup'),
    path('dim-fecha/<int:id_fecha>/', dim_fecha_detail, name='dim-fecha-detail'),

]
