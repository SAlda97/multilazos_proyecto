# core/views_dim_fecha.py
from django.http import JsonResponse, HttpResponseNotAllowed, Http404
from django.views.decorators.csrf import csrf_exempt
from .models import DimFecha
from django.utils.dateparse import parse_date

@csrf_exempt
def dim_fecha_lookup(request):
    """
    GET /dim-fecha/?fecha=YYYY-MM-DD  -> { id_fecha, fecha }
    """
    if request.method != "GET":
        return HttpResponseNotAllowed(["GET"])
    fecha_str = (request.GET.get("fecha") or "").strip()
    d = parse_date(fecha_str)
    if not d:
        return JsonResponse({"detail": "Parámetro 'fecha' (YYYY-MM-DD) es obligatorio."}, status=400)
    obj = DimFecha.objects.filter().extra(where=["fecha = %s"], params=[d]).values("id_fecha").first()
    # Nota: como no mapeamos el campo fecha en el modelo, usamos extra() para comparar por nombre de columna;
    # si prefieres, mapea 'fecha = models.DateField(db_column="fecha")' y usa filter(fecha=d).
    if not obj:
        return JsonResponse({"detail": f"No existe en dim_fecha: {fecha_str}"}, status=404)
    return JsonResponse({"id_fecha": obj["id_fecha"], "fecha": fecha_str})

@csrf_exempt
def dim_fecha_detail(request, id_fecha):
    """
    GET /dim-fecha/<id_fecha>/ -> { id_fecha, fecha }
    """
    if request.method != "GET":
        return HttpResponseNotAllowed(["GET"])
    # Igual que arriba: si mapeas campo fecha en el modelo puedes acceder directo; aquí usamos raw SQL liviano.
    from django.db import connection
    with connection.cursor() as cur:
        cur.execute("SELECT fecha FROM dim_fecha WHERE id_fecha = %s", [id_fecha])
        row = cur.fetchone()
    if not row:
        raise Http404("id_fecha no encontrado")
    fecha = row[0].isoformat()
    return JsonResponse({"id_fecha": id_fecha, "fecha": fecha})
