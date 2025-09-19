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

class Cliente(models.Model):
    id_cliente = models.AutoField(primary_key=True, db_column='id_cliente')
    nombre_cliente = models.CharField(max_length=100, db_column='nombre_cliente')
    apellido_cliente = models.CharField(max_length=100, db_column='apellido_cliente')
    id_tipo_cliente = models.ForeignKey(
        'TipoCliente',  # tu modelo existente
        on_delete=models.PROTECT,
        db_column='id_tipo_cliente',
        related_name='clientes'
    )
    fecha_creacion = models.DateTimeField(db_column='fecha_creacion', null=True, blank=True)
    usuario_creacion = models.CharField(max_length=50, db_column='usuario_creacion', null=True, blank=True)
    fecha_modificacion = models.DateTimeField(db_column='fecha_modificacion', null=True, blank=True)
    usuario_modificacion = models.CharField(max_length=50, db_column='usuario_modificacion', null=True, blank=True)

    class Meta:
        managed = False
        db_table = 'clientes'

    def __str__(self):
        return f'{self.nombre_cliente} {self.apellido_cliente}'.strip()
    

class Producto(models.Model):
    id_producto = models.AutoField(primary_key=True, db_column='id_producto')
    nombre_producto = models.CharField(max_length=200, db_column='nombre_producto')
    precio_unitario = models.DecimalField(max_digits=12, decimal_places=2, db_column='precio_unitario', default=0)
    costo_unitario = models.DecimalField(max_digits=12, decimal_places=2, db_column='costo_unitario', default=0)
    id_categoria = models.ForeignKey(
        'CategoriaProducto',
        on_delete=models.PROTECT,
        db_column='id_categoria',
        related_name='productos'
    )
    fecha_creacion = models.DateTimeField(db_column='fecha_creacion', null=True, blank=True)
    usuario_creacion = models.CharField(max_length=50, db_column='usuario_creacion', null=True, blank=True)
    fecha_modificacion = models.DateTimeField(db_column='fecha_modificacion', null=True, blank=True)
    usuario_modificacion = models.CharField(max_length=50, db_column='usuario_modificacion', null=True, blank=True)

    class Meta:
        managed = False
        db_table = 'productos'

    def __str__(self):
        return self.nombre_producto

class Gasto(models.Model):
    id_gasto = models.AutoField(primary_key=True, db_column='id_gasto')
    nombre_gasto = models.CharField(max_length=100, db_column='nombre_gasto')
    monto_gasto = models.DecimalField(max_digits=12, decimal_places=2, db_column='monto_gasto', default=0)
    id_fecha = models.IntegerField(db_column='id_fecha')  # FK a dim_fecha (mantenemos int)
    id_categoria_gastos = models.ForeignKey(
        'CategoriaGasto',
        on_delete=models.PROTECT,
        db_column='id_categoria_gastos',
        related_name='gastos'
    )
    fecha_creacion = models.DateTimeField(db_column='fecha_creacion', null=True, blank=True)
    usuario_creacion = models.CharField(max_length=50, db_column='usuario_creacion', null=True, blank=True)
    fecha_modificacion = models.DateTimeField(db_column='fecha_modificacion', null=True, blank=True)
    usuario_modificacion = models.CharField(max_length=50, db_column='usuario_modificacion', null=True, blank=True)

    class Meta:
        managed = False
        db_table = 'gastos'

    def __str__(self):
        return self.nombre_gasto
    
class DimFecha(models.Model):
    id_fecha = models.AutoField(primary_key=True, db_column='id_fecha')

    class Meta:
        managed = False
        db_table = 'dim_fecha'




