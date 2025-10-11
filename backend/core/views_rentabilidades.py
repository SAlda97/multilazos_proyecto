# core/views_rentabilidades.py
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse, HttpResponseNotAllowed
from django.db import connection
from datetime import date

def _month_start(dt: date) -> date:
    return date(dt.year, dt.month, 1)

def _add_months(dt: date, n: int) -> date:
    y = dt.year + (dt.month - 1 + n) // 12
    m = (dt.month - 1 + n) % 12 + 1
    return date(y, m, 1)

@csrf_exempt
def rentabilidades_resumen(request):
    """
    GET /rentabilidades/resumen/?months=N&id_tipo_transaccion=0|1|2
    - months: últimos N meses hasta hoy (default 6, min 1)
    - id_tipo_transaccion: 0=Todas, 1=Contado, 2=Crédito
    Si id_tipo_transaccion != 0, divide gastos_asignados entre 2 y recalcula margen_neto.
    margen_neto = margen_bruto + otros_ingresos - gastos_asignados
    """
    if request.method != "GET":
        return HttpResponseNotAllowed(["GET"])

    months = max(1, int(request.GET.get("months") or 6))
    tipo = int(request.GET.get("id_tipo_transaccion") or 0)  # 0=Todas

    today = date.today()
    fin = _month_start(today)              # mes actual, día 1
    start = _add_months(fin, -(months-1))  # ventana inclusiva

    with connection.cursor() as cur:
        cur.execute("""
            ;WITH base AS (
                SELECT
                    anio, mes, id_tipo_transaccion,
                    SUM(CAST(total_venta       AS DECIMAL(18,2))) AS total_venta,
                    SUM(CAST(total_costo       AS DECIMAL(18,2))) AS total_costo,
                    SUM(CAST(otros_ingresos    AS DECIMAL(18,2))) AS otros_ingresos,
                    SUM(CAST(margen_bruto      AS DECIMAL(18,2))) AS margen_bruto,
                    SUM(CAST(gastos_asignados  AS DECIMAL(18,2))) AS gastos_asignados,
                    SUM(CAST(margen_neto       AS DECIMAL(18,2))) AS margen_neto
                FROM dbo.vw_resumen_rentabilidades
                WHERE
                  (anio >  %s OR (anio = %s AND mes >= %s))  -- desde (incl.)
                  AND
                  (anio <  %s OR (anio = %s AND mes <= %s))  -- hasta (incl.)
                GROUP BY anio, mes, id_tipo_transaccion
            )
            SELECT anio, mes, id_tipo_transaccion,
                   total_venta, total_costo, otros_ingresos, margen_bruto, gastos_asignados, margen_neto
            FROM base
            ORDER BY anio, mes, id_tipo_transaccion
        """, [
            start.year, start.year, start.month,
            fin.year,   fin.year,   fin.month
        ])
        rows = cur.fetchall()

    data = []
    for r in rows:
        anio, mes, id_tt, vta, cos, oing, mgb, gas, mne = r
        vta = float(vta or 0.0)
        cos = float(cos or 0.0)
        oing = float(oing or 0.0)
        mgb = float(mgb or 0.0)
        gas = float(gas or 0.0)

        # si el front filtra por un solo tipo (1/2), dividir gastos entre 2
        if tipo in (1, 2):
            gas = gas / 2.0

        # Recalcular margen neto con otros ingresos
        mne = mgb + oing - gas

        data.append({
            "anio": anio,
            "mes": mes,
            "mes_label": f"{str(mes).zfill(2)}/{anio}",
            "id_tipo_transaccion": id_tt,
            "total_venta": vta,
            "total_costo": cos,
            "otros_ingresos": oing,
            "margen_bruto": mgb,
            "gastos_asignados": gas,
            "margen_neto": mne,
        })

    from collections import defaultdict
    by_month = defaultdict(lambda: {"venta":0.0,"costo":0.0,"margenB":0.0,"gastos":0.0,"margenN":0.0})
    for d in data:
        if tipo in (1, 2) and d["id_tipo_transaccion"] != tipo:
            continue
        key = (d["anio"], d["mes"], d["mes_label"])
        by_month[key]["venta"]   += d["total_venta"]
        by_month[key]["costo"]   += d["total_costo"]
        by_month[key]["margenB"] += d["margen_bruto"]
        by_month[key]["gastos"]  += d["gastos_asignados"]
        by_month[key]["margenN"] += d["margen_neto"]

    months_labels = []
    series = []
    total_venta = total_costo = total_margenB = total_gastos = total_margenN = 0.0
    cur_dt = start
    while cur_dt <= fin:
        label = f"{str(cur_dt.month).zfill(2)}/{cur_dt.year}"
        months_labels.append(label)
        bucket = by_month.get((cur_dt.year, cur_dt.month, label))
        if bucket:
            v = bucket["venta"]; c = bucket["costo"]; mb = bucket["margenB"]; g = bucket["gastos"]; mn = bucket["margenN"]
        else:
            v = c = mb = g = mn = 0.0

        series.append({
            "mes_label": label,
            "venta": v, "costo": c, "margen_bruto": mb, "gastos": g, "margen_neto": mn,
            "margen_bruto_pct": (mb / v * 100.0) if v else 0.0,
            "margen_neto_pct" : (mn / v * 100.0) if v else 0.0,
            "gastos_sobre_venta_pct": (g / v * 100.0) if v else 0.0,
        })

        total_venta   += v
        total_costo   += c
        total_margenB += mb
        total_gastos  += g
        total_margenN += mn

        cur_dt = _add_months(cur_dt, 1)

    ventas_contado = sum(d["total_venta"] for d in data if d["id_tipo_transaccion"] == 1)
    ventas_credito = sum(d["total_venta"] for d in data if d["id_tipo_transaccion"] == 2)

    return JsonResponse({
        "months": months,
        "id_tipo_transaccion": tipo,
        "labels": months_labels,
        "series": series,
        "totales": {
            "venta": total_venta,
            "costo": total_costo,
            "margen_bruto": total_margenB,
            "gastos": total_gastos,
            "margen_neto": total_margenN,
        },
        "ventas_por_tipo": {
            "contado": ventas_contado,
            "credito": ventas_credito,
        }
    })
