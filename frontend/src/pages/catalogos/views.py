from rest_framework.generics import ListAPIView
from rest_framework.pagination import PageNumberPagination
from .models import TipoCliente
from .serializers import TipoClienteSerializer

class StdPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100

class TipoClienteListView(ListAPIView):
    serializer_class = TipoClienteSerializer
    pagination_class = StdPagination

    def get_queryset(self):
        qs = TipoCliente.objects.all().order_by('id_tipo_cliente')
        q = self.request.query_params.get('q')
        if q:
            qs = qs.filter(nombre_tipo_cliente__icontains=q)
        return qs
