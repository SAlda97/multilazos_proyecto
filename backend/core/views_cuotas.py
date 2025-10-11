# core/views_cuotas.py
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse, HttpResponseNotAllowed, Http404
from django.db import connection, transaction 
from django.utils import timezone
from decimal import Decimal
import json
from .utils_fechas import ensure_dim_fecha 

@csrf_exempt
def cuotas_list(request):
    """
    GET /cuotas/?search=&desde=&hasta=&id_venta=&page=&page_size=
    """
    if request.method != "GET":
        return HttpResponseNotAllowed(["GET"])

    page      = int(request.GET.get("page") or 1)
    page_size = int(request.GET.get("page_size") or 10)
    search    = (request.GET.get("search") or "").strip()
    desde     = request.GET.get("desde")
    hasta     = request.GET.get("hasta")
    id_venta  = request.GET.get("id_venta")

    where = []
    params = []
    if id_venta:
        where.append("c.id_venta=%s"); params.append(id_venta)
    if desde:
        where.append("df.fecha>=%s"); params.append(desde)
    if hasta:
        where.append("df.fecha<=%s"); params.append(hasta)
    if search:
        like = f"%{search}%"
        where.append("""(
          CAST(c.id_venta AS varchar(20)) LIKE %s OR
          CAST(c.numero_cuota AS varchar(20)) LIKE %s OR
          CONVERT(varchar(10), df.fecha, 120) LIKE %s
        )""")
        params += [like, like, like]
    where_sql = "WHERE " + " AND ".join(where) if where else ""

    offset = (page - 1) * page_size

    # total real
    with connection.cursor() as cur:
        cur.execute(f"""
            SELECT COUNT(*)
            FROM cuota_creditos c
            JOIN dim_fecha df ON df.id_fecha = c.id_fecha_venc
            {where_sql}
        """, params)
        total = cur.fetchone()[0]

    with connection.cursor() as cur:
        cur.execute(f"""
            SELECT
            c.id_cuota,
            c.id_venta,
            c.numero_cuota,
            df.fecha AS fecha_venc,
            CONVERT(DECIMAL(12,2), c.monto_programado) AS monto_programado,
            CONVERT(DECIMAL(12,2), ISNULL((
                SELECT SUM(pc.monto_asignado) FROM pago_cuota pc WHERE pc.id_cuota = c.id_cuota
            ),0)) AS monto_asignado,
            CASE WHEN EXISTS (SELECT 1 FROM pago_cuota pc2 WHERE pc2.id_cuota = c.id_cuota) THEN 1 ELSE 0 END AS tiene_pago
            FROM cuota_creditos c
            JOIN dim_fecha df ON df.id_fecha = c.id_fecha_venc
            {where_sql}
            ORDER BY c.id_cuota DESC
            OFFSET %s ROWS FETCH NEXT %s ROWS ONLY
        """, params + [offset, page_size])
        rows = cur.fetchall()

        results = []
        for r in rows:
            id_cuota, id_venta, num, fecha_v, programado, asignado, tiene_pago = r
            saldo = Decimal(programado) - Decimal(asignado or 0)
            results.append({
                "id_cuota": int(id_cuota),
                "id_venta": int(id_venta),
                "numero_cuota": int(num),
                "fecha_venc_iso": fecha_v.isoformat(),
                "monto_programado": str(programado),
                "monto_asignado": str(asignado or 0),
                "saldo_pendiente": str(saldo),
                "tiene_pago": bool(tiene_pago),
            })

    return JsonResponse({"count": total, "next": None, "previous": None, "results": results})

@csrf_exempt
def cuota_asignar_pago(request):
    """
    POST { id_cuota:int, monto_pago:decimal, fecha_iso?:YYYY-MM-DD }
    Crea un pago para la venta de la cuota y asigna ese monto a la cuota.
    """
    if request.method != "POST":
        return HttpResponseNotAllowed(["POST"])

    try:
        payload = json.loads(request.body or "{}")
    except json.JSONDecodeError:
        return JsonResponse({"detail": "JSON inválido"}, status=400)

    try:
        id_cuota = int(payload.get("id_cuota"))
        monto = Decimal(str(payload.get("monto_pago")))
        if id_cuota <= 0 or monto <= 0:
            raise ValueError()
    except Exception:
        return JsonResponse({"detail": "id_cuota>0 y monto_pago>0 son requeridos."}, status=400)

    fecha_iso = (payload.get("fecha_iso") or "").strip()  # opcional, hoy si no viene

    with connection.cursor() as cur:
        cur.execute("""
            SELECT c.id_venta, c.id_fecha_venc, c.monto_programado,
                   ISNULL((SELECT SUM(pc.monto_asignado) FROM pago_cuota pc WHERE pc.id_cuota=c.id_cuota),0) AS asignado
            FROM cuota_creditos c
            WHERE c.id_cuota=%s
        """, [id_cuota])
        row = cur.fetchone()

    if not row:
        return JsonResponse({"detail": "Cuota no encontrada."}, status=404)

    id_venta, id_fecha_venc, programado, asignado = row
    saldo = Decimal(programado) - Decimal(asignado or 0)
    if monto > saldo:
        return JsonResponse({"detail": "El monto excede el saldo de la cuota."}, status=400)

    # usar fecha enviada o hoy
    if not fecha_iso:
        fecha_iso = timezone.now().date().isoformat()
    id_fecha = ensure_dim_fecha(fecha_iso)

    # crear pago + asignación atómica
    try:
        with transaction.atomic():
            with connection.cursor() as cur:
                # crear pago y devolver id creado con OUTPUT (más robusto que SCOPE_IDENTITY)
                cur.execute("""
                    INSERT INTO pagos (id_venta, id_fecha, monto_pago, fecha_creacion, usuario_creacion)
                    OUTPUT INSERTED.id_pago
                    VALUES (%s, %s, %s, GETDATE(), SUSER_SNAME())
                """, [id_venta, id_fecha, monto])
                row_id = cur.fetchone()
                if not row_id:
                    return JsonResponse({"detail": "No se pudo crear el pago."}, status=500)
                new_id_pago = int(row_id[0])

                # asignar a cuota
                # (el trigger de SQL protegerá que no se exceda el monto programado)
                cur.execute("""
                    INSERT INTO pago_cuota (id_pago, id_cuota, monto_asignado, fecha_creacion, usuario_creacion)
                    VALUES (%s, %s, %s, GETDATE(), SUSER_SNAME())
                """, [new_id_pago, id_cuota, monto])

    except Exception as e:
        # Devuelve el error legible al frontend para depurar rápido
        return JsonResponse({"detail": f"Error al guardar pago/asignación: {e}"}, status=500)

    return JsonResponse({"detail": "Pago y asignación registrados", "id_pago": new_id_pago}, status=201)

