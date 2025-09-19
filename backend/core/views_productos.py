# core/views_productos.py
import json
from django.http import JsonResponse, HttpResponseNotAllowed, Http404
from django.core.paginator import Paginator
from django.db.models import Q
from django.views.decorators.csrf import csrf_exempt
from django.utils import timezone
from .models import Producto, CategoriaProducto

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
def productos_list(request):
    """
    GET  /productos/?search=&page=&page_size=&id_categoria=(opcional)
    POST /productos/ {
        "nombre_producto": "...",
        "precio_unitario": 0,
        "costo_unitario": 0,
        "id_categoria": 1
    }
    """
    if request.method == "GET":
        search = (request.GET.get("search") or "").strip()
        page = int(request.GET.get("page") or 1)
        page_size = int(request.GET.get("page_size") or 10)
        id_cat = request.GET.get("id_categoria")

        qs = Producto.objects.select_related('id_categoria').all()
        if search:
            qs = qs.filter(Q(nombre_producto__icontains=search))
        if id_cat:
            try:
                qs = qs.filter(id_categoria_id=int(id_cat))
            except ValueError:
                pass

        paginator = Paginator(qs, page_size)
        page_obj = paginator.get_page(page)
        next_url, prev_url = _page_links(request, page_obj)

        data = {
            "count": paginator.count,
            "next": next_url,
            "previous": prev_url,
            "results": [
                {
                    "id_producto": o.id_producto,
                    "nombre_producto": o.nombre_producto,
                    "precio_unitario": str(o.precio_unitario),
                    "costo_unitario": str(o.costo_unitario),
                    "id_categoria": o.id_categoria_id,
                    "nombre_categoria": o.id_categoria.nombre_categoria if o.id_categoria else None,
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

        nombre = (payload.get("nombre_producto") or "").strip()
        precio = payload.get("precio_unitario", 0)
        costo  = payload.get("costo_unitario", 0)
        cat_id = payload.get("id_categoria")

        if not nombre:
            return JsonResponse({"detail": "El nombre es obligatorio."}, status=400)
        if len(nombre) > 200:
            return JsonResponse({"detail": "El nombre no puede exceder 200 caracteres."}, status=400)
        try:
            precio_f = float(precio)
            costo_f  = float(costo)
            if precio_f < 0 or costo_f < 0:
                raise ValueError()
        except Exception:
            return JsonResponse({"detail": "Precio y costo deben ser números ≥ 0."}, status=400)

        if not isinstance(cat_id, int):
            return JsonResponse({"detail": "id_categoria es obligatorio."}, status=400)
        try:
            cat = CategoriaProducto.objects.get(pk=cat_id)
        except CategoriaProducto.DoesNotExist:
            return JsonResponse({"detail": "Categoría inválida."}, status=400)

        obj = Producto.objects.create(
            nombre_producto=nombre,
            precio_unitario=precio_f,
            costo_unitario=costo_f,
            id_categoria=cat,
            fecha_creacion=timezone.now(),
            usuario_creacion=getattr(getattr(request, "user", None), "username", None) or "web",
        )
        return JsonResponse({
            "id_producto": obj.id_producto,
            "nombre_producto": obj.nombre_producto,
            "precio_unitario": str(obj.precio_unitario),
            "costo_unitario": str(obj.costo_unitario),
            "id_categoria": obj.id_categoria_id,
        }, status=201)

    return HttpResponseNotAllowed(["GET", "POST"])

@csrf_exempt
def productos_detail(request, id_producto):
    """
    GET    /productos/<id>/
    PUT    /productos/<id>/ { ... }
    DELETE /productos/<id>/
    """
    try:
        obj = Producto.objects.get(pk=id_producto)
    except Producto.DoesNotExist:
        raise Http404("Producto no encontrado")

    if request.method == "GET":
        return JsonResponse({
            "id_producto": obj.id_producto,
            "nombre_producto": obj.nombre_producto,
            "precio_unitario": str(obj.precio_unitario),
            "costo_unitario": str(obj.costo_unitario),
            "id_categoria": obj.id_categoria_id,
        })

    if request.method == "PUT":
        try:
            payload = json.loads(request.body or "{}")
        except json.JSONDecodeError:
            return JsonResponse({"detail": "JSON inválido"}, status=400)

        nombre = (payload.get("nombre_producto") or "").strip()
        precio = payload.get("precio_unitario", 0)
        costo  = payload.get("costo_unitario", 0)
        cat_id = payload.get("id_categoria")

        if not nombre:
            return JsonResponse({"detail": "El nombre es obligatorio."}, status=400)
        if len(nombre) > 200:
            return JsonResponse({"detail": "El nombre no puede exceder 200 caracteres."}, status=400)
        try:
            precio_f = float(precio)
            costo_f  = float(costo)
            if precio_f < 0 or costo_f < 0:
                raise ValueError()
        except Exception:
            return JsonResponse({"detail": "Precio y costo deben ser números ≥ 0."}, status=400)

        if not isinstance(cat_id, int):
            return JsonResponse({"detail": "id_categoria es obligatorio."}, status=400)
        try:
            cat = CategoriaProducto.objects.get(pk=cat_id)
        except CategoriaProducto.DoesNotExist:
            return JsonResponse({"detail": "Categoría inválida."}, status=400)

        obj.nombre_producto = nombre
        obj.precio_unitario = precio_f
        obj.costo_unitario = costo_f
        obj.id_categoria = cat
        obj.fecha_modificacion = timezone.now()
        obj.usuario_modificacion = getattr(getattr(request, "user", None), "username", None) or "web"
        obj.save(update_fields=[
            "nombre_producto", "precio_unitario", "costo_unitario",
            "id_categoria", "fecha_modificacion", "usuario_modificacion"
        ])

        return JsonResponse({
            "id_producto": obj.id_producto,
            "nombre_producto": obj.nombre_producto,
            "precio_unitario": str(obj.precio_unitario),
            "costo_unitario": str(obj.costo_unitario),
            "id_categoria": obj.id_categoria_id,
        })

    if request.method == "DELETE":
        obj.delete()
        return JsonResponse({"detail": "Eliminado"}, status=200)

    return HttpResponseNotAllowed(["GET", "PUT", "DELETE"])
