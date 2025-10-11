# core/utils_fechas.py
from django.db import connection

def ensure_dim_fecha(fecha_iso: str) -> int:
    """
    Devuelve id_fecha para YYYY-MM-DD. Inserta si no existe.
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
