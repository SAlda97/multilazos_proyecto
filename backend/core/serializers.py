# core/serializers.py
from rest_framework import serializers
from .models import TipoCliente, CategoriaProducto, TipoTransaccion

class TipoClienteSerializer(serializers.ModelSerializer):
    class Meta:
        model = TipoCliente
        fields = ['id_tipo_cliente', 'nombre_tipo_cliente', 'tasa_interes_default']

class CategoriaProductoSerializer(serializers.ModelSerializer):
    class Meta:
        model = CategoriaProducto
        fields = ('id_categoria', 'nombre_categoria')

class TipoTransaccionSerializer(serializers.ModelSerializer):

    id = serializers.IntegerField(source='pk', read_only=True)
    nombre = serializers.CharField(source='nombre', max_length=100)

    class Meta:
        model = TipoTransaccion
        fields = ['id', 'nombre']

    def to_representation(self, instance):
        data = super().to_representation(instance)

        return {'id': data['id'], 'nombre': data['nombre']}