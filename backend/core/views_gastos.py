# core/views_gastos.py
import json
from django.http import JsonResponse, HttpResponseNotAllowed, Http404
from django.core.paginator import Paginator
from django.db.models import Q
from django.db import IntegrityError
from django.views.decorators.csrf import csrf_exempt
from django.utils import timezone
from .models import Gasto, CategoriaGasto, DimFecha
import traceback
from decimal import Decimal, InvalidOperation


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
def gastos_list(request):
    """
    GET  /gastos/?search=&page=&page_size=&id_categoria_gastos=
    POST /gastos/ {
      "nombre_gasto": "...",
      "monto_gasto": 0,
      "id_fecha": 20250101,
      "id_categoria_gastos": 1
    }
    """
    # === GET (listar/paginar) ===
    if request.method == "GET":
        search = (request.GET.get("search") or "").strip()
        page = int(request.GET.get("page") or 1)
        page_size = int(request.GET.get("page_size") or 10)
        cat = request.GET.get("id_categoria_gastos")

        qs = Gasto.objects.select_related('id_categoria_gastos').all()
        if search:
            qs = qs.filter(Q(nombre_gasto__icontains=search))
        if cat:
            try:
                qs = qs.filter(id_categoria_gastos_id=int(cat))
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
                    "id_gasto": o.id_gasto,
                    "nombre_gasto": o.nombre_gasto,
                    "monto_gasto": str(o.monto_gasto),
                    "id_fecha": o.id_fecha,
                    "fecha": (lambda: __import__("django.db").db.connection.cursor().execute(
                    "SELECT fecha FROM dim_fecha WHERE id_fecha = %s", [o.id_fecha]
                    ) or None) and None,  # placeholder para inline, lo reemplazamos abajo por helper
                    "id_categoria_gastos": o.id_categoria_gastos_id,
                    "nombre_categoria_gasto": o.id_categoria_gastos.nombre_categoria if o.id_categoria_gastos else None,
                    "fecha_creacion": o.fecha_creacion.isoformat() if o.fecha_creacion else None,
                    "fecha_modificacion": o.fecha_modificacion.isoformat() if o.fecha_modificacion else None,
                }
                for o in page_obj.object_list
            ],
        }
        return JsonResponse(data)

    # === POST (crear) ===
    if request.method == "POST":
        try:
            payload = json.loads(request.body or "{}")
        except json.JSONDecodeError:
            return JsonResponse({"detail": "JSON inválido"}, status=400)

        nombre = (payload.get("nombre_gasto") or "").strip()
        monto  = payload.get("monto_gasto", 0)
        id_fecha = payload.get("id_fecha")
        cat_id = payload.get("id_categoria_gastos")

        if not nombre:
            return JsonResponse({"detail": "El nombre es obligatorio."}, status=400)
        if len(nombre) > 100:
            return JsonResponse({"detail": "El nombre no puede exceder 100 caracteres."}, status=400)

        # monto -> Decimal seguro
        try:
            monto_dec = Decimal(str(monto))
            if monto_dec < 0:
                raise InvalidOperation()
        except Exception:
            return JsonResponse({"detail": "El monto debe ser un número ≥ 0."}, status=400)

        # ids -> int seguros
        try:
            id_fecha = int(id_fecha)
        except Exception:
            return JsonResponse({"detail": "id_fecha es obligatorio (int existente en dim_fecha)."}, status=400)
        try:
            cat_id = int(cat_id)
        except Exception:
            return JsonResponse({"detail": "id_categoria_gastos es obligatorio (int)."}, status=400)

        # existencia en tablas relacionadas
        if not DimFecha.objects.filter(pk=id_fecha).exists():
            return JsonResponse({"detail": f"id_fecha={id_fecha} no existe en dim_fecha."}, status=400)
        try:
            cat = CategoriaGasto.objects.get(pk=cat_id)
        except CategoriaGasto.DoesNotExist:
            return JsonResponse({"detail": "Categoría de gasto inválida."}, status=400)

        try:
            obj = Gasto.objects.create(
                nombre_gasto=nombre,
                monto_gasto=monto_dec,
                id_fecha=id_fecha,
                id_categoria_gastos=cat,
                fecha_creacion=timezone.now(),
                usuario_creacion=getattr(getattr(request, "user", None), "username", None) or "web",
            )
            return JsonResponse({
                "id_gasto": obj.id_gasto,
                "nombre_gasto": obj.nombre_gasto,
                "monto_gasto": str(obj.monto_gasto),
                "id_fecha": obj.id_fecha,
                "id_categoria_gastos": obj.id_categoria_gastos_id,
            }, status=201)

        except IntegrityError as e:
            # Violaciones FK/CHK/UNIQUE -> 400
            return JsonResponse({"detail": f"Violación de integridad: {str(e)}"}, status=400)
        except Exception as e:
            # Cualquier otro error -> 500 (devolvemos pista)
            traceback.print_exc()
            return JsonResponse({"detail": f"Error interno: {str(e)}"}, status=500)

    return HttpResponseNotAllowed(["GET", "POST"])


@csrf_exempt
def gastos_detail(request, id_gasto):
    """
    GET    /gastos/<id>/
    PUT    /gastos/<id>/   { ... }
    DELETE /gastos/<id>/
    """
    try:
        obj = Gasto.objects.get(pk=id_gasto)
    except Gasto.DoesNotExist:
        raise Http404("Gasto no encontrado")

    # === GET (detalle) ===
    if request.method == "GET":
        return JsonResponse({
            "id_gasto": obj.id_gasto,
            "nombre_gasto": obj.nombre_gasto,
            "monto_gasto": str(obj.monto_gasto),
            "id_fecha": obj.id_fecha,
            "fecha": str(DimFecha.objects.get(pk=obj.id_fecha).fecha),
            "id_categoria_gastos": obj.id_categoria_gastos_id,
        })

    # === PUT (editar) ===
    if request.method == "PUT":
        try:
            payload = json.loads(request.body or "{}")
        except json.JSONDecodeError:
            return JsonResponse({"detail": "JSON inválido"}, status=400)

        nombre = (payload.get("nombre_gasto") or "").strip()
        monto  = payload.get("monto_gasto", 0)
        id_fecha = payload.get("id_fecha")
        cat_id = payload.get("id_categoria_gastos")

        if not nombre:
            return JsonResponse({"detail": "El nombre es obligatorio."}, status=400)
        if len(nombre) > 100:
            return JsonResponse({"detail": "El nombre no puede exceder 100 caracteres."}, status=400)

        try:
            monto_dec = Decimal(str(monto))
            if monto_dec < 0:
                raise InvalidOperation()
        except Exception:
            return JsonResponse({"detail": "El monto debe ser un número ≥ 0."}, status=400)

        try:
            id_fecha = int(id_fecha)
        except Exception:
            return JsonResponse({"detail": "id_fecha es obligatorio (int existente en dim_fecha)."}, status=400)
        try:
            cat_id = int(cat_id)
        except Exception:
            return JsonResponse({"detail": "id_categoria_gastos es obligatorio (int)."}, status=400)

        if not DimFecha.objects.filter(pk=id_fecha).exists():
            return JsonResponse({"detail": f"id_fecha={id_fecha} no existe en dim_fecha."}, status=400)
        try:
            cat = CategoriaGasto.objects.get(pk=cat_id)
        except CategoriaGasto.DoesNotExist:
            return JsonResponse({"detail": "Categoría de gasto inválida."}, status=400)

        obj.nombre_gasto = nombre
        obj.monto_gasto = monto_dec
        obj.id_fecha = id_fecha
        obj.id_categoria_gastos = cat
        obj.fecha_modificacion = timezone.now()
        obj.usuario_modificacion = getattr(getattr(request, "user", None), "username", None) or "web"

        try:
            obj.save(update_fields=[
                "nombre_gasto", "monto_gasto", "id_fecha",
                "id_categoria_gastos", "fecha_modificacion", "usuario_modificacion"
            ])
            return JsonResponse({
                "id_gasto": obj.id_gasto,
                "nombre_gasto": obj.nombre_gasto,
                "monto_gasto": str(obj.monto_gasto),
                "id_fecha": obj.id_fecha,
                "id_categoria_gastos": obj.id_categoria_gastos_id,
            })
        except IntegrityError as e:
            return JsonResponse({"detail": f"Violación de integridad: {str(e)}"}, status=400)
        except Exception as e:
            traceback.print_exc()
            return JsonResponse({"detail": f"Error interno: {str(e)}"}, status=500)

    # === DELETE (eliminar) ===
    if request.method == "DELETE":
        obj.delete()
        return JsonResponse({"detail": "Eliminado"}, status=200)

    return HttpResponseNotAllowed(["GET", "PUT", "DELETE"])
