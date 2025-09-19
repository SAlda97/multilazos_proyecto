# core/views_clientes_crud.py
import json
from django.http import JsonResponse, HttpResponseNotAllowed, Http404
from django.core.paginator import Paginator
from django.db.models import Q
from django.views.decorators.csrf import csrf_exempt
from django.utils import timezone
from .models import Cliente, TipoCliente

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
def clientes_list(request):
    """
    GET  /clientes/?search=&page=&page_size=
    POST /clientes/ { "nombre_cliente": "...", "apellido_cliente": "...", "id_tipo_cliente": 1 }
    """
    if request.method == "GET":
        search = (request.GET.get("search") or "").strip()
        page = int(request.GET.get("page") or 1)
        page_size = int(request.GET.get("page_size") or 10)

        qs = Cliente.objects.select_related('id_tipo_cliente').all()
        if search:
            qs = qs.filter(
                Q(nombre_cliente__icontains=search) |
                Q(apellido_cliente__icontains=search)
            )

        paginator = Paginator(qs, page_size)
        page_obj = paginator.get_page(page)
        next_url, prev_url = _page_links(request, page_obj)

        data = {
            "count": paginator.count,
            "next": next_url,
            "previous": prev_url,
            "results": [
                {
                    "id_cliente": o.id_cliente,
                    "nombre_cliente": o.nombre_cliente,
                    "apellido_cliente": o.apellido_cliente,
                    "id_tipo_cliente": o.id_tipo_cliente_id,
                    "nombre_tipo_cliente": o.id_tipo_cliente.nombre_tipo_cliente if o.id_tipo_cliente else None,
                    "fecha_creacion": o.fecha_creacion.isoformat() if o.fecha_creacion else None,
                    "fecha_modificacion": o.fecha_modificacion.isoformat() if o.fecha_modificacion else None,
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

        nombre = (payload.get("nombre_cliente") or "").strip()
        apellido = (payload.get("apellido_cliente") or "").strip()
        tipo_id = payload.get("id_tipo_cliente")

        if not nombre or not apellido:
            return JsonResponse({"detail": "Nombre y apellido son obligatorios."}, status=400)
        if not isinstance(tipo_id, int):
            return JsonResponse({"detail": "id_tipo_cliente es obligatorio."}, status=400)
        try:
            tipo = TipoCliente.objects.get(pk=tipo_id)
        except TipoCliente.DoesNotExist:
            return JsonResponse({"detail": "Tipo de cliente inválido."}, status=400)

        obj = Cliente.objects.create(
            nombre_cliente=nombre,
            apellido_cliente=apellido,
            id_tipo_cliente=tipo,
            # fecha/usuario de creación los maneja SQL por default, pero ponemos guard rails
            fecha_creacion=timezone.now(),
            usuario_creacion=getattr(getattr(request, "user", None), "username", None) or "web",
        )
        return JsonResponse({
            "id_cliente": obj.id_cliente,
            "nombre_cliente": obj.nombre_cliente,
            "apellido_cliente": obj.apellido_cliente,
            "id_tipo_cliente": obj.id_tipo_cliente_id,
        }, status=201)

    return HttpResponseNotAllowed(["GET", "POST"])

@csrf_exempt
def clientes_detail(request, id_cliente):
    """
    GET    /clientes/<id>/
    PUT    /clientes/<id>/   { "nombre_cliente": "...", "apellido_cliente": "...", "id_tipo_cliente": 1 }
    DELETE /clientes/<id>/
    """
    try:
        obj = Cliente.objects.get(pk=id_cliente)
    except Cliente.DoesNotExist:
        raise Http404("Cliente no encontrado")

    if request.method == "GET":
        return JsonResponse({
            "id_cliente": obj.id_cliente,
            "nombre_cliente": obj.nombre_cliente,
            "apellido_cliente": obj.apellido_cliente,
            "id_tipo_cliente": obj.id_tipo_cliente_id,
        })

    if request.method == "PUT":
        try:
            payload = json.loads(request.body or "{}")
        except json.JSONDecodeError:
            return JsonResponse({"detail": "JSON inválido"}, status=400)

        nombre = (payload.get("nombre_cliente") or "").strip()
        apellido = (payload.get("apellido_cliente") or "").strip()
        tipo_id = payload.get("id_tipo_cliente")

        if not nombre or not apellido:
            return JsonResponse({"detail": "Nombre y apellido son obligatorios."}, status=400)
        if not isinstance(tipo_id, int):
            return JsonResponse({"detail": "id_tipo_cliente es obligatorio."}, status=400)
        try:
            tipo = TipoCliente.objects.get(pk=tipo_id)
        except TipoCliente.DoesNotExist:
            return JsonResponse({"detail": "Tipo de cliente inválido."}, status=400)

        obj.nombre_cliente = nombre
        obj.apellido_cliente = apellido
        obj.id_tipo_cliente = tipo
        obj.fecha_modificacion = timezone.now()
        obj.usuario_modificacion = getattr(getattr(request, "user", None), "username", None) or "web"
        obj.save(update_fields=["nombre_cliente", "apellido_cliente", "id_tipo_cliente", "fecha_modificacion", "usuario_modificacion"])

        return JsonResponse({
            "id_cliente": obj.id_cliente,
            "nombre_cliente": obj.nombre_cliente,
            "apellido_cliente": obj.apellido_cliente,
            "id_tipo_cliente": obj.id_tipo_cliente_id,
        })

    if request.method == "DELETE":
        obj.delete()
        return JsonResponse({"detail": "Eliminado"}, status=200)

    return HttpResponseNotAllowed(["GET", "PUT", "DELETE"])
