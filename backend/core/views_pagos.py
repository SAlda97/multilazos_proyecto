# core/views_pagos.py
import json
from decimal import Decimal
from django.http import JsonResponse, HttpResponseNotAllowed, Http404
from django.db import connection, IntegrityError, transaction
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt

from .models import Pago, Venta, PagoCuota
from .utils_fechas import ensure_dim_fecha  # o from .utils_cuotas import _ensure_dim_fecha as ensure_dim_fecha

def _fecha_iso(id_fecha: int) -> str | None:
    with connection.cursor() as cur:
        cur.execute("SELECT fecha FROM dim_fecha WHERE id_fecha=%s", [id_fecha])
        r = cur.fetchone()
    return r[0].isoformat() if r and r[0] else None
    

@csrf_exempt
def pagos_list(request):
    """
    GET  /pagos/?page=&page_size=&q=&desde=&hasta=&min=&max=
    POST /pagos/ { id_venta, fecha_iso, monto_pago }
    """
    if request.method == "GET":
        page = int(request.GET.get("page") or 1)
        page_size = int(request.GET.get("page_size") or 10)
        offset = (page - 1) * page_size

        q      = (request.GET.get("q") or "").strip()
        desde  = request.GET.get("desde")
        hasta  = request.GET.get("hasta")
        min_v  = request.GET.get("min")
        max_v  = request.GET.get("max")

        filtros = []
        params  = []

        if desde:
            filtros.append("df.fecha >= %s")
            params.append(desde)
        if hasta:
            filtros.append("df.fecha <= %s")
            params.append(hasta)
        if min_v:
            filtros.append("p.monto_pago >= %s")
            params.append(min_v)
        if max_v:
            filtros.append("p.monto_pago <= %s")
            params.append(max_v)
        if q:
            filtros.append("""
                (
                  LOWER(CONCAT(c.nombre_cliente,' ',c.apellido_cliente)) LIKE LOWER(%s)
                  OR CAST(p.id_pago AS VARCHAR(30)) LIKE %s
                  OR CAST(v.id_venta AS VARCHAR(30)) LIKE %s
                )
            """)
            like = f"%{q}%"
            params.extend([like, like, like])

        where = ("WHERE " + " AND ".join(filtros)) if filtros else ""

        # total real
        with connection.cursor() as cur:
            cur.execute(f"""
                SELECT COUNT(*)
                FROM pagos p
                JOIN ventas v   ON v.id_venta = p.id_venta
                JOIN clientes c ON c.id_cliente = v.id_cliente
                JOIN dim_fecha df ON df.id_fecha = p.id_fecha
                {where}
            """, params)
            total = cur.fetchone()[0]

        # datos paginados
        with connection.cursor() as cur:
            cur.execute(f"""
                SELECT
                  p.id_pago,
                  p.id_venta,
                  df.fecha,
                  CONVERT(DECIMAL(12,2), p.monto_pago) AS monto_pago,
                  v.id_tipo_transaccion,
                  CONCAT(c.nombre_cliente,' ',c.apellido_cliente) AS cliente,
                  CASE WHEN EXISTS (SELECT 1 FROM pago_cuota pc WHERE pc.id_pago = p.id_pago) THEN 1 ELSE 0 END AS tiene_asign
                FROM pagos p
                JOIN ventas v   ON v.id_venta = p.id_venta
                JOIN clientes c ON c.id_cliente = v.id_cliente
                JOIN dim_fecha df ON df.id_fecha = p.id_fecha
                {where}
                ORDER BY p.id_pago DESC
                OFFSET %s ROWS FETCH NEXT %s ROWS ONLY
            """, params + [offset, page_size])
            rows = cur.fetchall()

        results = []
        for r in rows:
            id_pago, id_venta, fecha_dt, monto_pago, id_tipo, cliente, tiene_asign = r
            results.append({
                "id_pago": id_pago,
                "id_venta": id_venta,
                "fecha_iso": fecha_dt.isoformat(),  # yyyy-mm-ddTHH:MM:SS
                "monto_pago": str(monto_pago),
                "cliente": cliente,
                "id_tipo_transaccion": id_tipo,  # 1=Contado, 2=Crédito
                "tiene_asignaciones": bool(tiene_asign),
            })

        return JsonResponse({
            "count": total,
            "next": None,
            "previous": None,
            "results": results
        })


    if request.method == "POST":
        try:
            payload = json.loads(request.body or "{}")
        except json.JSONDecodeError:
            return JsonResponse({"detail": "JSON inválido"}, status=400)

        try:
            id_venta = int(payload.get("id_venta"))
            fecha_iso = (payload.get("fecha_iso") or "").strip()
            monto = Decimal(str(payload.get("monto_pago")))
        except Exception:
            return JsonResponse({"detail": "Campos requeridos: id_venta (int), fecha_iso (YYYY-MM-DD), monto_pago (decimal)."}, status=400)

        if not Venta.objects.filter(pk=id_venta).exists():
            return JsonResponse({"detail": "Venta inválida."}, status=400)
        if not fecha_iso:
            return JsonResponse({"detail": "fecha_iso es obligatorio (YYYY-MM-DD)."}, status=400)
        if monto < 0:
            return JsonResponse({"detail": "monto_pago debe ser ≥ 0."}, status=400)

        try:
            id_fecha = ensure_dim_fecha(fecha_iso)
            p = Pago.objects.create(
                id_venta_id=id_venta,
                id_fecha=id_fecha,
                monto_pago=monto,
                fecha_creacion=timezone.now(),
                usuario_creacion="web",
            )
        except IntegrityError as e:
            return JsonResponse({"detail": f"Violación de integridad: {e}"}, status=400)

        return JsonResponse({"id_pago": p.id_pago}, status=201)

    return HttpResponseNotAllowed(["GET", "POST"])

@csrf_exempt
def pagos_detail(request, id_pago: int):
    try:
        p = Pago.objects.get(pk=id_pago)
    except Pago.DoesNotExist:
        raise Http404("Pago no encontrado")

    if request.method == "PUT":
        try:
            payload = json.loads(request.body or "{}")
        except json.JSONDecodeError:
            return JsonResponse({"detail": "JSON inválido"}, status=400)

        fecha_iso = (payload.get("fecha_iso") or "").strip()
        monto = payload.get("monto_pago")
        try:
            monto = Decimal(str(monto))
            if monto < 0: raise ValueError()
        except Exception:
            return JsonResponse({"detail": "monto_pago debe ser ≥ 0."}, status=400)

        if not fecha_iso:
            return JsonResponse({"detail": "fecha_iso es obligatorio (YYYY-MM-DD)."}, status=400)

        p.id_fecha = ensure_dim_fecha(fecha_iso)
        p.monto_pago = monto
        p.fecha_modificacion = timezone.now()
        p.usuario_modificacion = "web"
        p.save(update_fields=["id_fecha","monto_pago","fecha_modificacion","usuario_modificacion"])
        return JsonResponse({"detail": "Actualizado"})

    if request.method == "DELETE":
        p.delete()
        return JsonResponse({"detail": "Eliminado"})

    return HttpResponseNotAllowed(["PUT","DELETE"])


def _cuotas_estado_sql_por_venta(id_venta: int):
    """
    Devuelve filas (id_cuota, numero, fecha_iso, programado, asignado, saldo) para la venta.
    """
    with connection.cursor() as cur:
        cur.execute("""
            SELECT 
              c.id_cuota,
              c.numero_cuota,
              df.fecha AS fecha,
              CONVERT(DECIMAL(12,2), c.monto_programado) AS programado,
              CONVERT(DECIMAL(12,2), ISNULL((
                  SELECT SUM(pc.monto_asignado) 
                  FROM pago_cuota pc 
                  WHERE pc.id_cuota = c.id_cuota
              ),0)) AS asignado
            FROM cuota_creditos c
            JOIN dim_fecha df ON df.id_fecha = c.id_fecha_venc
            WHERE c.id_venta = %s
            ORDER BY c.numero_cuota
        """, [id_venta])
        rows = cur.fetchall()
    data = []
    for r in rows:
        id_cuota, numero, fecha, programado, asignado = r
        saldo = Decimal(programado) - Decimal(asignado or 0)
        data.append({
            "id_cuota": int(id_cuota),
            "numero_cuota": int(numero),
            "fecha_venc_iso": fecha.isoformat(),
            "monto_programado": str(programado),
            "monto_asignado": str(asignado or 0),
            "saldo_pendiente": str(saldo),
        })
    return data

@csrf_exempt
def cuotas_estado_por_venta(request, id_venta: int):
    if request.method != "GET":
        return HttpResponseNotAllowed(["GET"])
    # valida venta
    if not Venta.objects.filter(pk=id_venta).exists():
        raise Http404("Venta no encontrada")
    data = _cuotas_estado_sql_por_venta(id_venta)
    return JsonResponse({"count": len(data), "results": data})

@csrf_exempt
def pago_asignaciones(request, id_pago: int):
    """
    GET  /pagos/<id_pago>/asignaciones/ -> lista asignaciones actuales y meta-info de la venta
    POST /pagos/<id_pago>/asignaciones/ { items: [{id_cuota, monto_asignado}, ...] }
         Reemplaza las asignaciones del pago (transacción atómica).
    """
    try:
        pago = Pago.objects.get(pk=id_pago)
    except Pago.DoesNotExist:
        raise Http404("Pago no encontrado")

    # datos de la venta
    with connection.cursor() as cur:
        cur.execute("""
            SELECT v.id_venta, c.nombre_cliente, c.apellido_cliente, tt.nombre_tipo_transaccion
            FROM ventas v
            JOIN clientes c ON c.id_cliente = v.id_cliente
            JOIN tipo_transacciones tt ON tt.id_tipo_transaccion = v.id_tipo_transaccion
            WHERE v.id_venta=%s
        """, [pago.id_venta_id])
        venta_row = cur.fetchone()
    venta_info = None
    if venta_row:
        venta_info = {
            "id_venta": venta_row[0],
            "cliente": f"{venta_row[1]} {venta_row[2]}",
            "tipo_transaccion": venta_row[3],
        }

    if request.method == "GET":
        # asignaciones actuales
        with connection.cursor() as cur:
            cur.execute("""
                SELECT pc.id_cuota, CONVERT(DECIMAL(12,2), pc.monto_asignado)
                FROM pago_cuota pc
                WHERE pc.id_pago = %s
            """, [id_pago])
            asign = cur.fetchall()
        items = [{"id_cuota": r[0], "monto_asignado": str(r[1])} for r in asign]
        # y cuotas de la venta (para mostrar saldos)
        cuotas = _cuotas_estado_sql_por_venta(pago.id_venta_id)
        return JsonResponse({
            "pago": {
                "id_pago": pago.id_pago,
                "id_venta": pago.id_venta_id,
                "fecha_iso": None,  # opcional
                "monto_pago": str(pago.monto_pago),
            },
            "venta": venta_info,
            "cuotas": cuotas,
            "asignaciones": items,
        })

    if request.method == "POST":
        try:
            payload = json.loads(request.body or "{}")
        except json.JSONDecodeError:
            return JsonResponse({"detail": "JSON inválido"}, status=400)

        items = payload.get("items") or []
        # validar items
        parsed = []
        total_asignado = Decimal('0')
        for it in items:
            try:
                id_cuota = int(it.get("id_cuota"))
                monto = Decimal(str(it.get("monto_asignado")))
                if id_cuota <= 0 or monto <= 0:
                    raise ValueError()
            except Exception:
                return JsonResponse({"detail": "items inválidos: {id_cuota:int>0, monto_asignado:decimal>0}"}, status=400)
            parsed.append((id_cuota, monto))
            total_asignado += monto

        # la suma no puede exceder el monto del pago
        if total_asignado > pago.monto_pago:
            return JsonResponse({"detail": "La suma de asignaciones excede el monto del pago."}, status=400)

        # todas las cuotas deben ser de la misma venta del pago
        if parsed:
            ids = tuple({pid for pid, _ in parsed})
            with connection.cursor() as cur:
                cur.execute(f"""
                    SELECT COUNT(*) 
                    FROM cuota_creditos 
                    WHERE id_cuota IN ({",".join(["%s"]*len(ids))}) AND id_venta=%s
                """, [*ids, pago.id_venta_id])
                cnt = int(cur.fetchone()[0])
            if cnt != len(ids):
                return JsonResponse({"detail": "Hay cuotas que no pertenecen a la venta del pago."}, status=400)

        # validación contra saldos: no superar el saldo pendiente de cada cuota
        cuotas = _cuotas_estado_sql_por_venta(pago.id_venta_id)
        saldo_map = {c["id_cuota"]: Decimal(str(c["saldo_pendiente"])) for c in cuotas}
        for id_cuota, monto in parsed:
            if monto > saldo_map.get(id_cuota, Decimal('0')):
                return JsonResponse({"detail": f"Asignación a la cuota {id_cuota} excede su saldo pendiente."}, status=400)

        # aplicar (reemplazo total): transacción atómica
        with transaction.atomic():
            with connection.cursor() as cur:
                cur.execute("DELETE FROM pago_cuota WHERE id_pago=%s", [id_pago])
                for id_cuota, monto in parsed:
                    cur.execute("""
                        INSERT INTO pago_cuota (id_pago, id_cuota, monto_asignado, fecha_creacion, usuario_creacion)
                        VALUES (%s, %s, %s, GETDATE(), SUSER_SNAME())
                    """, [id_pago, id_cuota, monto])

        return JsonResponse({"detail": "Asignaciones guardadas"})

    return HttpResponseNotAllowed(["GET", "POST"])