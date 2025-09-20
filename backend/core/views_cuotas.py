# core/views_cuotas.py
import json
from decimal import Decimal
from django.http import JsonResponse, HttpResponseNotAllowed, Http404
from django.views.decorators.csrf import csrf_exempt
from django.db import connection, IntegrityError
from django.utils import timezone
from .models import CuotaCredito, Venta

def _fecha_iso_from_id(id_fecha: int) -> str | None:
    with connection.cursor() as cur:
        cur.execute("SELECT fecha FROM dim_fecha WHERE id_fecha = %s", [id_fecha])
        row = cur.fetchone()
    return row[0].isoformat() if row and row[0] else None

def _id_fecha_from_iso(iso_str: str) -> int | None:
    with connection.cursor() as cur:
        cur.execute("SELECT id_fecha FROM dim_fecha WHERE fecha = %s", [iso_str])
        row = cur.fetchone()
    return int(row[0]) if row else None

@csrf_exempt
def cuotas_list(request):
    """
    GET /cuotas/?page=&page_size=&q=&desde=&hasta=&id_venta=
      - Solo lectura
      - Devuelve: id_cuota, id_venta, numero_cuota, id_fecha_venc, fecha_venc_iso, monto_programado
    """
    if request.method != "GET":
        return HttpResponseNotAllowed(["GET"])

    page = int(request.GET.get("page") or 1)
    page_size = int(request.GET.get("page_size") or 10)
    q = (request.GET.get("q") or "").strip().lower()
    desde = request.GET.get("desde")
    hasta = request.GET.get("hasta")
    id_venta = request.GET.get("id_venta")

    qs = CuotaCredito.objects.all().order_by('id_venta', 'numero_cuota')
    if id_venta:
        try:
            qs = qs.filter(id_venta_id=int(id_venta))
        except:
            pass

    items = []
    for c in qs:
        iso = _fecha_iso_from_id(int(c.id_fecha_venc))
        # filtros de fecha
        if desde and (not iso or iso < desde):
            continue
        if hasta and (not iso or iso > hasta):
            continue
        # filtro de texto
        texto = f"venta:{c.id_venta_id} n:{c.numero_cuota} {iso or ''}".lower()
        if q and q not in texto:
            continue

        items.append({
            "id_cuota": c.id_cuota,
            "id_venta": c.id_venta_id,
            "numero_cuota": c.numero_cuota,
            "id_fecha_venc": c.id_fecha_venc,
            "fecha_venc_iso": iso,
            "monto_programado": str(c.monto_programado),
        })

    total = len(items)
    start = (page - 1) * page_size
    end = start + page_size
    return JsonResponse({
        "count": total,
        "next": None,
        "previous": None,
        "results": items[start:end],
    })


@csrf_exempt
def cuota_asignar_pago(request, id_cuota: int):
    """
    POST /cuotas/<id_cuota>/asignar-pago/
      body: { monto_pago: number, fecha_iso?: "YYYY-MM-DD" }
    Inserta en pagos apuntando a la venta de la cuota.
    """
    if request.method != "POST":
        return HttpResponseNotAllowed(["POST"])

    try:
        cuota = CuotaCredito.objects.get(pk=id_cuota)
    except CuotaCredito.DoesNotExist:
        raise Http404("Cuota no encontrada")

    try:
        payload = json.loads(request.body or "{}")
    except:
        return JsonResponse({"detail": "JSON inválido."}, status=400)

    try:
        monto = Decimal(str(payload.get("monto_pago")))
        if monto <= 0:
            raise ValueError()
    except:
        return JsonResponse({"detail": "monto_pago debe ser > 0"}, status=400)

    fecha_iso = payload.get("fecha_iso")
    if not fecha_iso:
        # por defecto hoy (debe existir en dim_fecha)
        today = timezone.now().date().isoformat()
        fecha_iso = today

    id_fecha = _id_fecha_from_iso(fecha_iso)
    if not id_fecha:
        return JsonResponse({"detail": f"fecha {fecha_iso} no existe en dim_fecha"}, status=400)

    user = getattr(getattr(request, "user", None), "username", None) or "web"
    now = timezone.now()

    try:
        with connection.cursor() as cur:
            cur.execute("""
                INSERT INTO pagos (id_venta, id_fecha, monto_pago, fecha_creacion, usuario_creacion)
                VALUES (%s, %s, %s, %s, %s)
            """, [cuota.id_venta_id, id_fecha, str(monto), now, user])
    except IntegrityError as e:
        return JsonResponse({"detail": f"Violación de integridad: {e}"}, status=400)

    return JsonResponse({"detail": "Pago registrado", "id_venta": cuota.id_venta_id})
