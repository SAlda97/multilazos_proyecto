# core/utils_cuotas.py
from decimal import Decimal
from django.db import connection, transaction

def _ensure_dim_fecha(fecha_iso: str) -> int:
    """
    Devuelve id_fecha para la fecha dada (YYYY-MM-DD).
    Si no existe en dim_fecha, la inserta y retorna su id.
    """
    with connection.cursor() as cur:
        cur.execute("SELECT id_fecha FROM dim_fecha WHERE fecha=%s", [fecha_iso])
        r = cur.fetchone()
        if r and r[0]:
            return int(r[0])

        cur.execute("""
            DECLARE @f DATE = %s;
            INSERT INTO dim_fecha (fecha, anio, mes, trimestre, semana_iso, dia, nombre_mes, nombre_dia, es_fin_de_mes)
            SELECT 
              @f, YEAR(@f), MONTH(@f), DATEPART(QUARTER,@f), DATEPART(ISO_WEEK,@f),
              DAY(@f), DATENAME(MONTH,@f), DATENAME(WEEKDAY,@f),
              CASE WHEN EOMONTH(@f)=@f THEN 1 ELSE 0 END;
            SELECT CAST(SCOPE_IDENTITY() AS INT);
        """, [fecha_iso])
        return int(cur.fetchone()[0])

def _add_months_same_day(fecha_iso: str, months: int) -> str:
    """
    Suma 'months' meses a fecha_iso manteniendo el mismo día;
    si el mes de destino no lo tiene (p.e. 31), usa el último día del mes.
    Retorna YYYY-MM-DD.
    """
    with connection.cursor() as cur:
        cur.execute("""
            DECLARE @f DATE = %s, @n INT = %s;
            DECLARE @base DATE = DATEADD(MONTH, @n, @f);
            DECLARE @y INT = YEAR(@base), @m INT = MONTH(@base), @d INT = DAY(%s);
            DECLARE @ultimo DATE = EOMONTH(@base);
            DECLARE @target DATE = TRY_CONVERT(DATE, CONVERT(varchar(4),@y) + '-' + RIGHT('0'+CONVERT(varchar(2),@m),2) + '-' + RIGHT('0'+CONVERT(varchar(2),@d),2));
            SELECT CONVERT(varchar(10), CASE WHEN @target IS NULL OR @target > @ultimo THEN @ultimo ELSE @target END, 120);
        """, [fecha_iso, months, fecha_iso])
        return cur.fetchone()[0]

@transaction.atomic
def generar_cuotas_si_faltan(id_venta: int):
    """
    Genera cuotas para una venta a crédito SOLO si faltan (no duplica).
    - No genera nada si total_venta_final <= 0.
    - La última cuota se ajusta para que la suma sea exacta.
    """
    with connection.cursor() as cur:
        cur.execute("""
            SELECT id_tipo_transaccion, plazo_mes, 
                   CONVERT(DECIMAL(12,2), total_venta_final) AS total,
                   df.fecha
            FROM ventas v
            JOIN dim_fecha df ON df.id_fecha = v.id_fecha
            WHERE v.id_venta=%s
        """, [id_venta])
        row = cur.fetchone()
        if not row:
            return
        id_tipo, plazo, total, fecha_venta = int(row[0]), int(row[1]), Decimal(row[2]), row[3]

        # Solo para crédito y con total > 0
        if id_tipo != 2 or plazo <= 0 or total <= 0:
            return

        # ¿Cuántas existen ya?
        cur.execute("SELECT COUNT(*) FROM cuota_creditos WHERE id_venta=%s", [id_venta])
        existentes = int(cur.fetchone()[0])

        base = (total / Decimal(plazo)).quantize(Decimal("0.01"))

        for n in range(existentes + 1, plazo + 1):
            venc_iso = _add_months_same_day(fecha_venta.isoformat(), n)
            id_fecha_venc = _ensure_dim_fecha(venc_iso)

            if n < plazo:
                monto = base
            else:
                cur.execute("""
                    SELECT CONVERT(DECIMAL(12,2), ISNULL(SUM(monto_programado),0))
                    FROM cuota_creditos WHERE id_venta=%s
                """, [id_venta])
                ya_prog = Decimal(cur.fetchone()[0] or 0)
                monto = (total - ya_prog).quantize(Decimal("0.01"))

            cur.execute("""
                IF NOT EXISTS(SELECT 1 FROM cuota_creditos WHERE id_venta=%s AND numero_cuota=%s)
                INSERT INTO cuota_creditos (id_venta, numero_cuota, id_fecha_venc, monto_programado)
                VALUES (%s, %s, %s, %s)
            """, [id_venta, n, id_venta, n, id_fecha_venc, str(monto)])

@transaction.atomic
def recalcular_montos_cuotas(id_venta: int):
    """
    Recalcula monto_programado de TODAS las cuotas existentes de la venta,
    según total_venta_final/plazo. La última se ajusta.
    (No crea cuotas nuevas; para eso usar generar_cuotas_si_faltan.)
    """
    with connection.cursor() as cur:
        cur.execute("""
            SELECT id_tipo_transaccion, plazo_mes, CONVERT(DECIMAL(12,2), total_venta_final)
            FROM ventas WHERE id_venta=%s
        """, [id_venta])
        row = cur.fetchone()
        if not row:
            return
        id_tipo, plazo, total = int(row[0]), int(row[1]), Decimal(row[2])

        if id_tipo != 2 or plazo <= 0 or total <= 0:
            return

        base = (total / Decimal(plazo)).quantize(Decimal("0.01"))

        # ¿Cuántas cuotas hay?
        cur.execute("SELECT COUNT(*) FROM cuota_creditos WHERE id_venta=%s", [id_venta])
        qty = int(cur.fetchone()[0])

        if qty == 0:
            return

        # Cuotas 1..plazo-1 al base
        cur.execute("""
            UPDATE c SET monto_programado = %s
            FROM cuota_creditos c
            WHERE c.id_venta=%s AND c.numero_cuota < %s
        """, [str(base), id_venta, plazo])

        # Última ajustada
        cur.execute("""
            SELECT CONVERT(DECIMAL(12,2), ISNULL(SUM(monto_programado),0))
            FROM cuota_creditos WHERE id_venta=%s AND numero_cuota < %s
        """, [id_venta, plazo])
        sum_prev = Decimal(cur.fetchone()[0] or 0)
        last = (total - sum_prev).quantize(Decimal("0.01"))

        cur.execute("""
            UPDATE cuota_creditos SET monto_programado=%s
            WHERE id_venta=%s AND numero_cuota=%s
        """, [str(last), id_venta, plazo])
