# core/views_ventas.py
import json
from decimal import Decimal
from django.db.models import Sum
from django.db import IntegrityError, connection
from django.http import JsonResponse, HttpResponseNotAllowed, Http404
from django.views.decorators.csrf import csrf_exempt
from django.utils import timezone
from .models import Venta, DetalleVenta, Cliente, TipoTransaccion, DimFecha, Producto

PLAZOS_VALIDOS = [3, 6, 9, 12, 24, 36, 48]

def _sum_subtotal_venta(id_venta: int) -> Decimal:
    # la columna 'subtotal' es computada y persistida en SQL; la usamos directo
    with connection.cursor() as cur:
        cur.execute("SELECT ISNULL(SUM(subtotal),0) FROM detalle_ventas WHERE id_venta = %s", [id_venta])
        row = cur.fetchone()
    return Decimal(row[0]) if row and row[0] is not None else Decimal('0')

def _fecha_iso(id_fecha: int) -> str | None:
    with connection.cursor() as cur:
        cur.execute("SELECT fecha FROM dim_fecha WHERE id_fecha = %s", [id_fecha])
        row = cur.fetchone()
    return row[0].isoformat() if row and row[0] else None

def _recalcular_total_venta(id_venta: int):
    """ total_venta_final = subtotal * (1 + interes/100) """
    v = Venta.objects.get(pk=id_venta)
    subtotal = _sum_subtotal_venta(id_venta)
    interes = Decimal(v.interes or 0)
    total = subtotal * (Decimal('1') + (interes / Decimal('100')))
    v.total_venta_final = total.quantize(Decimal('0.01'))
    v.fecha_modificacion = timezone.now()
    v.save(update_fields=['total_venta_final', 'fecha_modificacion'])

@csrf_exempt
def ventas_list(request):
    """
    GET  /ventas/?page=&page_size=&search=&id_cliente=&id_tipo_transaccion=
    POST /ventas/ { id_cliente, id_tipo_transaccion, id_fecha, plazo_mes?, interes? }  (interes/plazo se ajustan automáticamente por reglas)
    """
    if request.method == "GET":
        page = int(request.GET.get("page") or 1)
        page_size = int(request.GET.get("page_size") or 10)
        search = (request.GET.get("search") or "").strip()
        id_cliente = request.GET.get("id_cliente")
        id_tipo = request.GET.get("id_tipo_transaccion")

        qs = Venta.objects.select_related('id_cliente', 'id_tipo_transaccion').all().order_by('-id_venta')
        if id_cliente:
            try: qs = qs.filter(id_cliente_id=int(id_cliente))
            except: pass
        if id_tipo:
            try: qs = qs.filter(id_tipo_transaccion_id=int(id_tipo))
            except: pass
        if search:
            qs = qs.filter(id_cliente__nombre_cliente__icontains=search) | qs.filter(id_cliente__apellido_cliente__icontains=search)

        total = qs.count()
        offset = (page - 1) * page_size
        items = list(qs[offset:offset + page_size])

        data = {
            "count": total,
            "next": None,
            "previous": None,
            "results": [
                {
                    "id_venta": v.id_venta,
                    "cliente": f"{v.id_cliente.nombre_cliente} {v.id_cliente.apellido_cliente}",
                    "id_cliente": v.id_cliente_id,
                    "id_tipo_transaccion": v.id_tipo_transaccion_id,
                    "tipo_transaccion": v.id_tipo_transaccion.nombre_tipo_transaccion if v.id_tipo_transaccion_id else None,
                    "id_fecha": v.id_fecha,
                    "fecha": _fecha_iso(v.id_fecha),
                    "plazo_mes": v.plazo_mes,
                    "interes": str(v.interes),
                    "total_venta_final": str(v.total_venta_final),
                }
                for v in items
            ]
        }
        return JsonResponse(data)

    if request.method == "POST":
        try:
            payload = json.loads(request.body or "{}")
        except json.JSONDecodeError:
            return JsonResponse({"detail": "JSON inválido"}, status=400)

        try:
            id_cliente = int(payload.get("id_cliente"))
            id_tipo = int(payload.get("id_tipo_transaccion"))
            id_fecha = int(payload.get("id_fecha"))
        except Exception:
            return JsonResponse({"detail": "id_cliente, id_tipo_transaccion, id_fecha deben ser enteros."}, status=400)

        # validar existencia
        if not Cliente.objects.filter(pk=id_cliente).exists():
            return JsonResponse({"detail": "Cliente inválido."}, status=400)
        try:
            tipo = TipoTransaccion.objects.get(pk=id_tipo)
        except TipoTransaccion.DoesNotExist:
            return JsonResponse({"detail": "Tipo de transacción inválido."}, status=400)
        if not DimFecha.objects.filter(pk=id_fecha).exists():
            return JsonResponse({"detail": "id_fecha no existe en dim_fecha."}, status=400)

        # reglas de negocio
        if id_tipo == 1:  # Contado
            plazo_mes = 0
            interes = Decimal('0')
        else:             # Crédito
            raw_plazo = payload.get("plazo_mes")
            try:
                plazo_mes = int(raw_plazo)
            except Exception:
                return JsonResponse({"detail": "plazo_mes es obligatorio para crédito."}, status=400)
            if plazo_mes not in PLAZOS_VALIDOS:
                return JsonResponse({"detail": f"plazo_mes inválido. Valores: {PLAZOS_VALIDOS}"}, status=400)
            # interés desde tipo cliente
            cli = Cliente.objects.select_related('id_tipo_cliente').get(pk=id_cliente)
            interes = cli.id_tipo_cliente.tasa_interes_default or 0
            interes = Decimal(interes)
            interes = (interes * 100) if interes <= 1 else interes

        try:
            v = Venta.objects.create(
                id_cliente_id=id_cliente,
                id_tipo_transaccion_id=id_tipo,
                id_fecha=id_fecha,
                plazo_mes=plazo_mes,
                interes=interes,
                total_venta_final=Decimal('0'),  # se recalcula al tener detalle
                fecha_creacion=timezone.now(),
                usuario_creacion=getattr(getattr(request, "user", None), "username", None) or "web",
            )
            # recalcular por si ya hay detalle (normalmente 0 al crear)
            _recalcular_total_venta(v.id_venta)
        except IntegrityError as e:
            return JsonResponse({"detail": f"Violación de integridad: {e}"}, status=400)

        return JsonResponse({
            "id_venta": v.id_venta,
        }, status=201)

    return HttpResponseNotAllowed(["GET", "POST"])

@csrf_exempt
def ventas_detail(request, id_venta):
    try:
        v = Venta.objects.get(pk=id_venta)
    except Venta.DoesNotExist:
        raise Http404("Venta no encontrada")

    if request.method == "GET":
        return JsonResponse({
            "id_venta": v.id_venta,
            "id_cliente": v.id_cliente_id,
            "cliente": f"{v.id_cliente.nombre_cliente} {v.id_cliente.apellido_cliente}",
            "id_tipo_transaccion": v.id_tipo_transaccion_id,
            "tipo_transaccion": v.id_tipo_transaccion.nombre_tipo_transaccion if v.id_tipo_transaccion_id else None,
            "id_fecha": v.id_fecha,
            "fecha": _fecha_iso(v.id_fecha),
            "plazo_mes": v.plazo_mes,
            "interes": str(v.interes),
            "total_venta_final": str(v.total_venta_final),
        })

    if request.method == "PUT":
        try:
            payload = json.loads(request.body or "{}")
        except json.JSONDecodeError:
            return JsonResponse({"detail": "JSON inválido"}, status=400)

        try:
            id_cliente = int(payload.get("id_cliente"))
            id_tipo = int(payload.get("id_tipo_transaccion"))
            id_fecha = int(payload.get("id_fecha"))
        except Exception:
            return JsonResponse({"detail": "id_cliente, id_tipo_transaccion, id_fecha deben ser enteros."}, status=400)

        if not Cliente.objects.filter(pk=id_cliente).exists():
            return JsonResponse({"detail": "Cliente inválido."}, status=400)
        try:
            tipo = TipoTransaccion.objects.get(pk=id_tipo)
        except TipoTransaccion.DoesNotExist:
            return JsonResponse({"detail": "Tipo de transacción inválido."}, status=400)
        if not DimFecha.objects.filter(pk=id_fecha).exists():
            return JsonResponse({"detail": "id_fecha no existe en dim_fecha."}, status=400)

        if id_tipo == 1:
            plazo_mes = 0
            interes = Decimal('0')
        else:
            try:
                plazo_mes = int(payload.get("plazo_mes"))
            except Exception:
                return JsonResponse({"detail": "plazo_mes es obligatorio para crédito."}, status=400)
            if plazo_mes not in PLAZOS_VALIDOS:
                return JsonResponse({"detail": f"plazo_mes inválido. Valores: {PLAZOS_VALIDOS}"}, status=400)
            cli = Cliente.objects.select_related('id_tipo_cliente').get(pk=id_cliente)
            interes = cli.id_tipo_cliente.tasa_interes_default or 0
            interes = Decimal(interes)
            interes = (interes * 100) if interes <= 1 else interes

        v.id_cliente_id = id_cliente
        v.id_tipo_transaccion_id = id_tipo
        v.id_fecha = id_fecha
        v.plazo_mes = plazo_mes
        v.interes = interes
        v.fecha_modificacion = timezone.now()
        v.usuario_modificacion = getattr(getattr(request, "user", None), "username", None) or "web"

        try:
            v.save(update_fields=["id_cliente","id_tipo_transaccion","id_fecha","plazo_mes","interes","fecha_modificacion","usuario_modificacion"])
            _recalcular_total_venta(v.id_venta)
        except IntegrityError as e:
            return JsonResponse({"detail": f"Violación de integridad: {e}"}, status=400)

        return JsonResponse({"detail": "Actualizado"})

    if request.method == "DELETE":
        v.delete()
        return JsonResponse({"detail": "Eliminado"})

    return HttpResponseNotAllowed(["GET","PUT","DELETE"])

@csrf_exempt
def ventas_totales_mes(request):
    """
    GET /ventas/totales-mes/  -> [{ "mes": "YYYY-MM", "total": "1234.56" }, ...]
    """
    if request.method != "GET":
        return HttpResponseNotAllowed(["GET"])
    # agrupa por año-mes usando dim_fecha
    with connection.cursor() as cur:
        cur.execute("""
            SELECT 
                CAST(YEAR(df.fecha) AS int) AS anio,
                CAST(MONTH(df.fecha) AS int) AS mes,
                CONVERT(DECIMAL(12,2), SUM(v.total_venta_final)) AS total
            FROM ventas v
            JOIN dim_fecha df ON df.id_fecha = v.id_fecha
            GROUP BY YEAR(df.fecha), MONTH(df.fecha)
            ORDER BY YEAR(df.fecha), MONTH(df.fecha)
        """)
        rows = cur.fetchall()
    data = [{"mes": f"{r[0]}-{str(r[1]).zfill(2)}", "total": str(r[2] or 0)} for r in rows]
    return JsonResponse(data, safe=False)

# ===== Detalle de ventas =====

@csrf_exempt
def detalle_ventas_list(request, id_venta: int):
    """
    GET  /ventas/<id_venta>/detalle/
    POST /ventas/<id_venta>/detalle/ { id_producto, cantidad }
      * precio_unitario y costo_unitario_venta se llenan desde productos
    """
    try:
        venta = Venta.objects.get(pk=id_venta)
    except Venta.DoesNotExist:
        raise Http404("Venta no encontrada")

    if request.method == "GET":
        qs = DetalleVenta.objects.filter(id_venta=venta).select_related("id_producto").order_by("id_detalle_venta")
        results = []
        for d in qs:
            # d.subtotal no existe en el modelo; lo calculamos aquí
            sub_item = (Decimal(d.cantidad) * Decimal(d.precio_unitario)).quantize(Decimal('0.01'))
            results.append({
                "id_detalle_venta": d.id_detalle_venta,
                "id_producto": d.id_producto_id,
                "producto": getattr(d.id_producto, "nombre_producto", ""),
                "cantidad": str(d.cantidad),
                "precio_unitario": str(d.precio_unitario),
                "costo_unitario_venta": str(d.costo_unitario_venta),
                "subtotal": str(sub_item),
            })
        # incluir subtotal total de la venta (SQL)
        total_sub = _sum_subtotal_venta(id_venta)
        return JsonResponse({"count": qs.count(), "subtotal": str(total_sub), "results": results})

    if request.method == "POST":
        try:
            payload = json.loads(request.body or "{}")
        except json.JSONDecodeError:
            return JsonResponse({"detail": "JSON inválido"}, status=400)

        id_producto = payload.get("id_producto")
        cantidad = payload.get("cantidad", 0)

        # Validaciones mínimas
        try:
            prod = Producto.objects.get(pk=int(id_producto))
        except Exception:
            return JsonResponse({"detail": "Producto inválido."}, status=400)

        try:
            cant = Decimal(str(cantidad))
            if cant <= 0:
                raise ValueError()
        except Exception:
            return JsonResponse({"detail": "La cantidad debe ser > 0."}, status=400)

        # Tomar precios/costos desde el producto (no confiar en el front)
        precio = Decimal(str(prod.precio_unitario))
        costo  = Decimal(str(prod.costo_unitario))

        try:
            det = DetalleVenta.objects.create(
                id_venta=venta,
                id_producto=prod,
                cantidad=cant,
                precio_unitario=precio,
                costo_unitario_venta=costo,
                fecha_creacion=timezone.now(),
                usuario_creacion=getattr(getattr(request, "user", None), "username", None) or "web",
            )
            # Recalcular total de la venta tras crear ítem
            _recalcular_total_venta(venta.id_venta)
        except IntegrityError as e:
            msg = (str(e) or "").lower()
            if "unique" in msg or "uq_" in msg or "duplic" in msg:
                return JsonResponse({"detail": "Este producto ya existe en la venta."}, status=400)
            return JsonResponse({"detail": f"Violación de integridad: {str(e)}"}, status=400)
        except Exception as e:
            return JsonResponse({"detail": f"Error al crear ítem: {str(e)}"}, status=400)

        return JsonResponse({
            "id_detalle_venta": det.id_detalle_venta,
            "id_producto": det.id_producto_id,
            "producto": prod.nombre_producto,
            "cantidad": str(det.cantidad),
            "precio_unitario": str(det.precio_unitario),
            "costo_unitario_venta": str(det.costo_unitario_venta),
            "subtotal": str((Decimal(det.cantidad) * Decimal(det.precio_unitario)).quantize(Decimal("0.01"))),
        }, status=201)

    return HttpResponseNotAllowed(["GET", "POST"])

@csrf_exempt
def detalle_venta_detail(request, id_venta, id_detalle):
    try:
        d = DetalleVenta.objects.get(pk=id_detalle, id_venta_id=id_venta)
    except DetalleVenta.DoesNotExist:
        raise Http404("Detalle no encontrado")

    if request.method == "PUT":
        try:
            payload = json.loads(request.body or "{}")
            cantidad = Decimal(str(payload.get("cantidad")))
            if cantidad <= 0:
                raise ValueError()
        except Exception:
            return JsonResponse({"detail": "cantidad debe ser > 0."}, status=400)
        d.cantidad = cantidad
        d.fecha_modificacion = timezone.now()
        d.save(update_fields=["cantidad","fecha_modificacion"])
        _recalcular_total_venta(id_venta)
        return JsonResponse({"detail": "Actualizado"})

    if request.method == "DELETE":
        d.delete()
        _recalcular_total_venta(id_venta)
        return JsonResponse({"detail": "Eliminado"})

    return HttpResponseNotAllowed(["PUT","DELETE"])
