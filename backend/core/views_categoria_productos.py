# core/views_categoria_productos.py
import json
from django.http import JsonResponse, HttpResponseNotAllowed, Http404
from django.core.paginator import Paginator
from django.db.models import Q
from django.views.decorators.csrf import csrf_exempt
from .models import CategoriaProducto

def _build_page_links(request, page_obj):
    base_url = request.build_absolute_uri(request.path)
    querydict = request.GET.copy()

    def url_for_page(n):
        querydict['page'] = n
        return f"{base_url}?{querydict.urlencode()}"

    next_url = url_for_page(page_obj.next_page_number()) if page_obj.has_next() else None
    prev_url = url_for_page(page_obj.previous_page_number()) if page_obj.has_previous() else None
    return next_url, prev_url

@csrf_exempt
def categoria_productos_list(request):
    """
    GET  /categorias-productos/?search=&page=&page_size=
    POST /categorias-productos/  { "nombre_categoria": "..." }
    """
    if request.method == "GET":
        search = (request.GET.get("search") or "").strip()
        page = int(request.GET.get("page") or 1)
        page_size = int(request.GET.get("page_size") or 10)

        qs = CategoriaProducto.objects.all()
        if search:
            qs = qs.filter(Q(nombre_categoria__icontains=search))

        paginator = Paginator(qs, page_size)
        page_obj = paginator.get_page(page)
        next_url, prev_url = _build_page_links(request, page_obj)

        data = {
            "count": paginator.count,
            "next": next_url,
            "previous": prev_url,
            "results": [
                {"id_categoria": o.id_categoria, "nombre_categoria": o.nombre_categoria}
                for o in page_obj.object_list
            ],
        }
        return JsonResponse(data)

    if request.method == "POST":
        try:
            payload = json.loads(request.body or "{}")
        except json.JSONDecodeError:
            return JsonResponse({"detail": "JSON inválido"}, status=400)

        nombre = (payload.get("nombre_categoria") or "").strip()
        if not nombre:
            return JsonResponse({"detail": "El nombre es obligatorio."}, status=400)
        if len(nombre) > 100:
            return JsonResponse({"detail": "El nombre no puede exceder 100 caracteres."}, status=400)
        if CategoriaProducto.objects.filter(nombre_categoria__iexact=nombre).exists():
            return JsonResponse({"detail": "Ya existe una categoría con ese nombre."}, status=400)

        obj = CategoriaProducto.objects.create(nombre_categoria=nombre)
        return JsonResponse(
            {"id_categoria": obj.id_categoria, "nombre_categoria": obj.nombre_categoria},
            status=201
        )

    return HttpResponseNotAllowed(["GET", "POST"])

@csrf_exempt
def categoria_productos_detail(request, id_categoria):
    """
    GET    /categorias-productos/<id>/
    PUT    /categorias-productos/<id>/   { "nombre_categoria": "..." }
    DELETE /categorias-productos/<id>/
    """
    try:
        obj = CategoriaProducto.objects.get(pk=id_categoria)
    except CategoriaProducto.DoesNotExist:
        raise Http404("Categoría no encontrada")

    if request.method == "GET":
        return JsonResponse({"id_categoria": obj.id_categoria, "nombre_categoria": obj.nombre_categoria})

    if request.method == "PUT":
        try:
            payload = json.loads(request.body or "{}")
        except json.JSONDecodeError:
            return JsonResponse({"detail": "JSON inválido"}, status=400)

        nombre = (payload.get("nombre_categoria") or "").strip()
        if not nombre:
            return JsonResponse({"detail": "El nombre es obligatorio."}, status=400)
        if len(nombre) > 100:
            return JsonResponse({"detail": "El nombre no puede exceder 100 caracteres."}, status=400)
        if CategoriaProducto.objects.filter(
            nombre_categoria__iexact=nombre
        ).exclude(pk=obj.pk).exists():
            return JsonResponse({"detail": "Ya existe una categoría con ese nombre."}, status=400)

        obj.nombre_categoria = nombre
        obj.save(update_fields=["nombre_categoria"])
        return JsonResponse({"id_categoria": obj.id_categoria, "nombre_categoria": obj.nombre_categoria})

    if request.method == "DELETE":
        obj.delete()
        return JsonResponse({"detail": "Eliminado"}, status=200)

    return HttpResponseNotAllowed(["GET", "PUT", "DELETE"])
