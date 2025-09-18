# core/views_clientes.py
from rest_framework.generics import ListAPIView, RetrieveUpdateDestroyAPIView, ListCreateAPIView
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny
from django.db.models import Q
from rest_framework import viewsets, filters

from .models import TipoCliente, CategoriaProducto
from .serializers import TipoClienteSerializer, CategoriaProductoSerializer

class SmallPagePagination(PageNumberPagination):
    page_size = 10                 # ajusta si deseas
    page_size_query_param = 'page_size'
    max_page_size = 100

class TipoClienteListView(ListCreateAPIView): 
    permission_classes = [AllowAny]
    serializer_class = TipoClienteSerializer
    pagination_class = SmallPagePagination

    def get_queryset(self):
        qs = TipoCliente.objects.all().order_by('id_tipo_cliente')
        q = self.request.query_params.get('q')
        if q:
            qs = qs.filter(Q(nombre_tipo_cliente__icontains=q))
        return qs

class TipoClienteDetailView(RetrieveUpdateDestroyAPIView):
    permission_classes = [AllowAny]
    queryset = TipoCliente.objects.all().order_by('id_tipo_cliente')
    serializer_class = TipoClienteSerializer
    lookup_field = 'id_tipo_cliente'

class CategoriaProductoViewSet(viewsets.ModelViewSet):
    queryset = CategoriaProducto.objects.all()
    serializer_class = CategoriaProductoSerializer
    pagination_class = SmallPagePagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['nombre_categoria']     # permite ?search=texto
    ordering_fields = ['id_categoria', 'nombre_categoria']
    ordering = ['id_categoria']