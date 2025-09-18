# core/models.py
from django.db import models

class TipoCliente(models.Model):
    id_tipo_cliente = models.AutoField(primary_key=True)
    nombre_tipo_cliente = models.CharField(max_length=100, unique=True)
    tasa_interes_default = models.DecimalField(max_digits=5, decimal_places=2, default=0)

    class Meta:
        managed = False
        db_table = 'tipo_clientes'

    def __str__(self):
        return self.nombre_tipo_cliente

class CategoriaProducto(models.Model):
    id_categoria = models.AutoField(primary_key=True, db_column='id_categoria')
    nombre_categoria = models.CharField(max_length=100, unique=True, db_column='nombre_categoria')

    class Meta:
        managed = False
        db_table = 'categoria_productos'  

    def __str__(self):
        return self.nombre_categoria
    
class TipoTransaccion(models.Model):
    id_tipo_transaccion = models.AutoField(primary_key=True, db_column='id_tipo_transaccion')
    nombre_tipo_transaccion = models.CharField(max_length=100, unique=True, db_column='nombre_tipo_transaccion')

    class Meta:
        managed = False
        db_table = 'tipo_transacciones'

    def __str__(self):
        return self.nombre_tipo_transaccion

class CategoriaGasto(models.Model):
    id_categoria_gastos = models.AutoField(primary_key=True, db_column='id_categoria_gastos')
    nombre_categoria = models.CharField(max_length=100, unique=True, db_column='nombre_categoria')

    class Meta:
        managed = False
        db_table = 'categoria_gastos'  

    def __str__(self):
        return self.nombre_categoria