# core/views_tipo_transacciones.py
import json
from django.http import JsonResponse, HttpResponseNotAllowed, Http404
from django.core.paginator import Paginator
from django.db.models import Q
from django.views.decorators.csrf import csrf_exempt
from .models import TipoTransaccion

def _page_links(request, page_obj):
    base = request.build_absolute_uri(request.path)
    qd = request.GET.copy()
    def url_for(n):
        qd['page'] = n
        return f"{base}?{qd.urlencode()}"
    next_url = url_for(page_obj.next_page_number()) if page_obj.has_next() else None
    prev_url = url_for(page_obj.previous_page_number()) if page_obj.has_previous() else None
    return next_url, prev_url

@csrf_exempt
def tipo_transacciones_list(request):
    """
    GET  /tipo-transacciones/?search=&page=&page_size=
    POST /tipo-transacciones/ { "nombre_tipo_transaccion": "Contado" }
    """
    if request.method == "GET":
        search = (request.GET.get("search") or "").strip()
        page = int(request.GET.get("page") or 1)
        page_size = int(request.GET.get("page_size") or 10)

        qs = TipoTransaccion.objects.all()
        if search:
            qs = qs.filter(Q(nombre_tipo_transaccion__icontains=search))

        paginator = Paginator(qs, page_size)
        page_obj = paginator.get_page(page)
        next_url, prev_url = _page_links(request, page_obj)

        data = {
            "count": paginator.count,
            "next": next_url,
            "previous": prev_url,
            "results": [
                {
                    "id_tipo_transaccion": o.id_tipo_transaccion,
                    "nombre_tipo_transaccion": o.nombre_tipo_transaccion,
                }
                for o in page_obj.object_list
            ],
        }
        return JsonResponse(data)

    if request.method == "POST":
        try:
            payload = json.loads(request.body or "{}")
        except json.JSONDecodeError:
            return JsonResponse({"detail": "JSON inválido"}, status=400)

        nombre = (payload.get("nombre_tipo_transaccion") or "").strip()
        if not nombre:
            return JsonResponse({"detail": "El nombre es obligatorio."}, status=400)
        if len(nombre) > 100:
            return JsonResponse({"detail": "El nombre no puede exceder 100 caracteres."}, status=400)
        if TipoTransaccion.objects.filter(nombre_tipo_transaccion__iexact=nombre).exists():
            return JsonResponse({"detail": "Ya existe un tipo de transacción con ese nombre."}, status=400)

        obj = TipoTransaccion.objects.create(nombre_tipo_transaccion=nombre)
        return JsonResponse(
            {"id_tipo_transaccion": obj.id_tipo_transaccion, "nombre_tipo_transaccion": obj.nombre_tipo_transaccion},
            status=201,
        )

    return HttpResponseNotAllowed(["GET", "POST"])

@csrf_exempt
def tipo_transacciones_detail(request, id_tipo_transaccion):
    """
    GET    /tipo-transacciones/<id>/
    PUT    /tipo-transacciones/<id>/   { "nombre_tipo_transaccion": "Crédito" }
    DELETE /tipo-transacciones/<id>/
    """
    try:
        obj = TipoTransaccion.objects.get(pk=id_tipo_transaccion)
    except TipoTransaccion.DoesNotExist:
        raise Http404("Tipo de transacción no encontrado")

    if request.method == "GET":
        return JsonResponse({
            "id_tipo_transaccion": obj.id_tipo_transaccion,
            "nombre_tipo_transaccion": obj.nombre_tipo_transaccion,
        })

    if request.method == "PUT":
        try:
            payload = json.loads(request.body or "{}")
        except json.JSONDecodeError:
            return JsonResponse({"detail": "JSON inválido"}, status=400)

        nombre = (payload.get("nombre_tipo_transaccion") or "").strip()
        if not nombre:
            return JsonResponse({"detail": "El nombre es obligatorio."}, status=400)
        if len(nombre) > 100:
            return JsonResponse({"detail": "El nombre no puede exceder 100 caracteres."}, status=400)
        if TipoTransaccion.objects.filter(
            nombre_tipo_transaccion__iexact=nombre
        ).exclude(pk=obj.pk).exists():
            return JsonResponse({"detail": "Ya existe un tipo de transacción con ese nombre."}, status=400)

        obj.nombre_tipo_transaccion = nombre
        obj.save(update_fields=["nombre_tipo_transaccion"])
        return JsonResponse({
            "id_tipo_transaccion": obj.id_tipo_transaccion,
            "nombre_tipo_transaccion": obj.nombre_tipo_transaccion,
        })

    if request.method == "DELETE":
        obj.delete()
        return JsonResponse({"detail": "Eliminado"}, status=200)

    return HttpResponseNotAllowed(["GET", "PUT", "DELETE"])
