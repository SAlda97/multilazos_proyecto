# core/views_bitacora.py
import json
from django.http import JsonResponse, HttpResponseNotAllowed
from django.views.decorators.csrf import csrf_exempt
from django.db import connection

def _parse_int(s, default=None):
    try:
        return int(s)
    except Exception:
        return default

@csrf_exempt
def bitacora_ventas_list(request):
    """
    GET /bitacora-ventas/?q=&operacion=&desde=YYYY-MM-DD&hasta=YYYY-MM-DD&venta=&page=&page_size=
      - q: texto libre (usuario, #venta, operación)
      - operacion: INSERT | UPDATE | DELETE
      - desde/hasta: fecha_evento (DATE)
      - venta: id_venta exacto
    Respuesta:
      { count, next, previous, results: [ {id_bitacora, id_venta, operacion, usuario_evento, fecha_evento_iso, datos_anteriores, datos_nuevos}, ... ] }
    """
    if request.method != "GET":
        return HttpResponseNotAllowed(["GET"])

    q         = (request.GET.get("q") or "").strip()
    oper      = (request.GET.get("operacion") or "").strip().upper()
    desde     = (request.GET.get("desde") or "").strip()  # 'YYYY-MM-DD'
    hasta     = (request.GET.get("hasta") or "").strip()
    venta_txt = (request.GET.get("venta") or "").strip()
    id_venta  = _parse_int(venta_txt, None)

    page      = _parse_int(request.GET.get("page"), 1) or 1
    page_size = _parse_int(request.GET.get("page_size"), 1000) or 1000
    offset    = (page - 1) * page_size

    where = []
    params = []

    if q:
        # buscamos en usuario_evento, operacion, id_venta y fecha_evento (formato texto)
        where.append("(usuario_evento LIKE %s OR operacion LIKE %s OR CAST(id_venta AS VARCHAR(20)) LIKE %s OR CONVERT(VARCHAR(19), fecha_evento, 120) LIKE %s)")
        like = f"%{q}%"
        params += [like, like, like, like]

    if oper in ("INSERT", "UPDATE", "DELETE"):
        where.append("operacion = %s")
        params.append(oper)

    if id_venta is not None:
        where.append("id_venta = %s")
        params.append(id_venta)

    if desde:
        where.append("CAST(fecha_evento AS DATE) >= %s")
        params.append(desde)

    if hasta:
        where.append("CAST(fecha_evento AS DATE) <= %s")
        params.append(hasta)

    where_sql = " WHERE " + " AND ".join(where) if where else ""
    base_sql = f"""
        FROM bitacora_ventas
        {where_sql}
    """

    with connection.cursor() as cur:
        # total
        cur.execute(f"SELECT COUNT(1) {base_sql}", params)
        total = cur.fetchone()[0] if cur.rowcount != -1 else 0

        # page
        cur.execute(f"""
            SELECT
              id_bitacora,
              id_venta,
              operacion,
              datos_anteriores,
              datos_nuevos,
              usuario_evento,
              CONVERT(VARCHAR(19), fecha_evento, 120) AS fecha_evento_iso
            {base_sql}
            ORDER BY fecha_evento DESC, id_bitacora DESC
            OFFSET %s ROWS FETCH NEXT %s ROWS ONLY
        """, params + [offset, page_size])
        rows = cur.fetchall()

    results = []
    for r in rows:
        results.append({
            "id_bitacora": r[0],
            "id_venta": r[1],
            "operacion": r[2],
            "datos_anteriores": r[3],
            "datos_nuevos": r[4],
            "usuario_evento": r[5],
            "fecha_evento_iso": r[6],
        })

    # no incluimos next/previous reales para simplificar
    return JsonResponse({
        "count": total,
        "next": None,
        "previous": None,
        "results": results
    })
