# core/views_estado_cuotas.py
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse, HttpResponseNotAllowed
from django.db import connection
from decimal import Decimal

@csrf_exempt
def estado_cuotas_list(request):
    """
    GET /estado-cuotas/?search=&desde=&hasta=&id_venta=&estado=&page=&page_size=
      - estado: pendiente | parcial | pagada | atrasada (opcional)
    Devuelve: id_cuota, id_venta, numero_cuota, fecha_venc_iso,
              monto_programado, monto_pagado, saldo_pendiente, estado, cliente
    """
    if request.method != "GET":
        return HttpResponseNotAllowed(["GET"])

    page       = int(request.GET.get("page") or 1)
    page_size  = int(request.GET.get("page_size") or 10)
    search     = (request.GET.get("search") or "").strip()
    desde      = request.GET.get("desde")
    hasta      = request.GET.get("hasta")
    id_venta   = request.GET.get("id_venta")
    estado_flt = (request.GET.get("estado") or "").strip().lower()

    where = []
    params = []

    # Filtros base
    if id_venta:
        where.append("ve.id_venta = %s"); params.append(id_venta)
    if desde:
        where.append("df.fecha >= %s"); params.append(desde)
    if hasta:
        where.append("df.fecha <= %s"); params.append(hasta)
    if estado_flt in ("pendiente", "parcial", "pagada", "atrasada"):
        where.append("LOWER(ve.estado) = %s"); params.append(estado_flt)
    if search:
        like = f"%{search}%"
        where.append("""(
            CAST(ve.id_venta AS varchar(20)) LIKE %s OR
            CAST(ve.numero_cuota AS varchar(20)) LIKE %s OR
            CONVERT(varchar(10), df.fecha, 120) LIKE %s OR
            LOWER(CONCAT(cli.nombre_cliente,' ',cli.apellido_cliente)) LIKE LOWER(%s)
        )""")
        params += [like, like, like, like]

    where_sql = "WHERE " + " AND ".join(where) if where else ""
    offset = (page - 1) * page_size

    # TOTAL
    with connection.cursor() as cur:
        cur.execute(f"""
            SELECT COUNT(*)
            FROM v_cuotas_estado ve
            JOIN dim_fecha df ON df.id_fecha = ve.id_fecha_venc
            JOIN ventas v     ON v.id_venta   = ve.id_venta
            JOIN clientes cli ON cli.id_cliente = v.id_cliente
            {where_sql}
        """, params)
        total = cur.fetchone()[0]

    # DATOS
    with connection.cursor() as cur:
        cur.execute(f"""
            SELECT
              ve.id_cuota,
              ve.id_venta,
              ve.numero_cuota,
              df.fecha AS fecha_venc,
              CONVERT(DECIMAL(12,2), ve.monto_programado) AS programado,
              CONVERT(DECIMAL(12,2), ve.monto_pagado)     AS pagado,
              CONVERT(DECIMAL(12,2), ve.saldo_pendiente)  AS saldo,
              ve.estado,
              CONCAT(cli.nombre_cliente, ' ', cli.apellido_cliente) AS cliente
            FROM v_cuotas_estado ve
            JOIN dim_fecha df ON df.id_fecha = ve.id_fecha_venc
            JOIN ventas v     ON v.id_venta   = ve.id_venta
            JOIN clientes cli ON cli.id_cliente = v.id_cliente
            {where_sql}
            ORDER BY ve.id_cuota DESC
            OFFSET %s ROWS FETCH NEXT %s ROWS ONLY
        """, params + [offset, page_size])
        rows = cur.fetchall()

    results = []
    for r in rows:
        id_cuota, id_vta, num, fecha_v, programado, pagado, saldo, estado, cliente = r
        results.append({
            "id_cuota": int(id_cuota),
            "id_venta": int(id_vta),
            "numero_cuota": int(num),
            "fecha_venc_iso": fecha_v.isoformat(),
            "monto_programado": str(programado),
            "monto_pagado": str(pagado or 0),
            "saldo_pendiente": str(saldo or 0),
            "estado": estado,      # pendiente | parcial | pagada | atrasada
            "cliente": cliente,
        })

    return JsonResponse({"count": total, "next": None, "previous": None, "results": results})
