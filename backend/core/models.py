# core/models.py
from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver
from decimal import Decimal
from datetime import date
import calendar
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

class Venta(models.Model):
    id_venta = models.AutoField(primary_key=True, db_column='id_venta')
    id_cliente = models.ForeignKey(Cliente, on_delete=models.PROTECT, db_column='id_cliente')
    id_tipo_transaccion = models.ForeignKey(TipoTransaccion, on_delete=models.PROTECT, db_column='id_tipo_transaccion')
    id_fecha = models.IntegerField(db_column='id_fecha')
    plazo_mes = models.IntegerField(db_column='plazo_mes', default=0)
    interes = models.DecimalField(max_digits=5, decimal_places=2, db_column='interes', default=0)
    total_venta_final = models.DecimalField(max_digits=12, decimal_places=2, db_column='total_venta_final', default=0)
    fecha_creacion = models.DateTimeField(db_column='fecha_creacion', null=True, blank=True)
    usuario_creacion = models.CharField(max_length=50, db_column='usuario_creacion', null=True, blank=True)
    fecha_modificacion = models.DateTimeField(db_column='fecha_modificacion', null=True, blank=True)
    usuario_modificacion = models.CharField(max_length=50, db_column='usuario_modificacion', null=True, blank=True)
    class Meta:
        managed = False
        db_table = 'ventas'

class DetalleVenta(models.Model):
    id_detalle_venta = models.AutoField(primary_key=True, db_column='id_detalle_venta')
    id_venta = models.ForeignKey(Venta, on_delete=models.CASCADE, db_column='id_venta')
    id_producto = models.ForeignKey(Producto, on_delete=models.PROTECT, db_column='id_producto')
    cantidad = models.DecimalField(max_digits=12, decimal_places=2, db_column='cantidad')
    precio_unitario = models.DecimalField(max_digits=12, decimal_places=2, db_column='precio_unitario')
    costo_unitario_venta = models.DecimalField(max_digits=12, decimal_places=2, db_column='costo_unitario_venta')
    # subtotal es columna computada en SQL
    fecha_creacion = models.DateTimeField(db_column='fecha_creacion', null=True, blank=True)
    usuario_creacion = models.CharField(max_length=50, db_column='usuario_creacion', null=True, blank=True)
    fecha_modificacion = models.DateTimeField(db_column='fecha_modificacion', null=True, blank=True)
    usuario_modificacion = models.CharField(max_length=50, db_column='usuario_modificacion', null=True, blank=True)
    class Meta:
        managed = False
        db_table = 'detalle_ventas'

class CuotaCredito(models.Model):
    id_cuota = models.AutoField(primary_key=True)
    id_venta = models.ForeignKey('Venta', db_column='id_venta', on_delete=models.CASCADE)
    numero_cuota = models.IntegerField()
    id_fecha_venc = models.IntegerField()  # FK a dim_fecha.id_fecha
    monto_programado = models.DecimalField(max_digits=12, decimal_places=2)
    fecha_creacion = models.DateTimeField()
    usuario_creacion = models.CharField(max_length=50)
    fecha_modificacion = models.DateTimeField(null=True, blank=True)
    usuario_modificacion = models.CharField(max_length=50, null=True, blank=True)

    class Meta:
        managed = False
        db_table = 'cuota_creditos'

class Pago(models.Model):
    id_pago = models.AutoField(primary_key=True)
    id_venta = models.ForeignKey('Venta', db_column='id_venta', on_delete=models.CASCADE)
    id_fecha = models.IntegerField()  # FK a dim_fecha.id_fecha
    monto_pago = models.DecimalField(max_digits=12, decimal_places=2)
    fecha_creacion = models.DateTimeField()
    usuario_creacion = models.CharField(max_length=50)
    fecha_modificacion = models.DateTimeField(null=True, blank=True)
    usuario_modificacion = models.CharField(max_length=50, null=True, blank=True)

    class Meta:
        managed = False
        db_table = 'pagos'    

# ---------- Utilidades para cuotas ----------
def _clamp_day(year: int, month: int, day: int) -> int:
    """Si el mes no tiene 'day' (p.ej 31), usar último día del mes."""
    last = calendar.monthrange(year, month)[1]
    return min(day, last)

def _add_months_keep_day(d: date, months: int) -> date:
    """Sumar 'months' meses conservando el día (ajustando a fin de mes si no existe)."""
    y = d.year + (d.month - 1 + months) // 12
    m = (d.month - 1 + months) % 12 + 1
    dd = _clamp_day(y, m, d.day)
    return date(y, m, dd)

def _fecha_iso_to_id_fecha(fecha_iso: date) -> int | None:
    from django.db import connection
    with connection.cursor() as cur:
        cur.execute("SELECT id_fecha FROM dim_fecha WHERE fecha = %s", [fecha_iso])
        row = cur.fetchone()
    return int(row[0]) if row else None


@receiver(post_save, sender=Venta)
def generar_cuotas_al_crear(sender, instance: 'Venta', created: bool, **kwargs):
    """
    Al CREAR una venta a crédito (id_tipo_transaccion = 2),
    genera N cuotas si (y solo si) actualmente no existen.
    Ventas previas a esta implementación se ignoran (no se corren).
    """
    if not created:
        return  # ignorar updates para no duplicar
    if int(instance.id_tipo_transaccion_id or 0) != 2:
        return  # solo crédito

    from django.db import connection
    # ¿Ya existen cuotas para esta venta?
    with connection.cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM cuota_creditos WHERE id_venta = %s", [instance.id_venta])
        existe = cur.fetchone()[0]

    if existe and int(existe) > 0:
        return  # ya tiene cuotas (o parciales, no generamos aquí)

    # Tomar plazo y total
    plazo = int(instance.plazo_mes or 0)
    if plazo <= 0:
        return  # sin plazo => nada que generar

    total = Decimal(instance.total_venta_final or 0)
    if total <= 0:
        return

    # monto por cuota
    monto = (total / Decimal(plazo)).quantize(Decimal('0.01'))

    # fecha base = fecha de la venta (buscar en dim_fecha)
    from django.db import connection
    with connection.cursor() as cur:
        cur.execute("SELECT fecha FROM dim_fecha WHERE id_fecha = %s", [instance.id_fecha])
        row = cur.fetchone()
    if not row:
        return
    fecha_venta = row[0]  # datetime.date

    # Generar N cuotas
    from django.utils import timezone
    user = "web"
    now = timezone.now()

    registros = []
    for n in range(1, plazo + 1):
        fecha_venc = _add_months_keep_day(fecha_venta, n)
        id_fecha_venc = _fecha_iso_to_id_fecha(fecha_venc)
        if not id_fecha_venc:
            # si no existe en dim_fecha, saltamos (o podrías crearla en tu ETL)
            continue
        registros.append((
            instance.id_venta, n, id_fecha_venc, str(monto), now, user
        ))

    # Inserción por lote
    if registros:
        with connection.cursor() as cur:
            cur.executemany("""
                INSERT INTO cuota_creditos
                (id_venta, numero_cuota, id_fecha_venc, monto_programado, fecha_creacion, usuario_creacion)
                VALUES (%s,%s,%s,%s,%s,%s)
            """, registros)
        


