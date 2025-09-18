# core/serializers.py
from rest_framework import serializers
from .models import TipoCliente, CategoriaProducto

class TipoClienteSerializer(serializers.ModelSerializer):
    class Meta:
        model = TipoCliente
        fields = ['id_tipo_cliente', 'nombre_tipo_cliente', 'tasa_interes_default']

class CategoriaProductoSerializer(serializers.ModelSerializer):
    class Meta:
        model = CategoriaProducto
        fields = ('id_categoria', 'nombre_categoria')