# backend/etl/views.py
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status as drf_status

from .services import run_stored_procedure

DEFAULT_PROCS = [
    "sp_etl_cargar_dimensiones",
    "sp_etl_cargar_ventas",
    "sp_etl_cargar_gastos",
]

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def etl_run_view(request):
    """
    POST /api/etl/run
    Body JSON (opcional):
      { "procs": ["sp_etl_cargar_dimensiones"] }
    Si no se envía, ejecuta DEFAULT_PROCS en orden.
    """
    procs = request.data.get("procs") or DEFAULT_PROCS
    if not isinstance(procs, list) or not procs:
        return Response({"detail": "procs debe ser una lista no vacía."},
                        status=drf_status.HTTP_400_BAD_REQUEST)

    results = []
    for p in procs:
        r = run_stored_procedure(p, user=request.user)
        results.append({"proc": p, **r})

        # Si alguno falla, devolvemos 207 (Multi-Status)
        if r["status"] != "ok":
            return Response({"detail": "Al menos un SP falló", "results": results},
                            status=drf_status.HTTP_207_MULTI_STATUS)

    return Response({"results": results}, status=drf_status.HTTP_200_OK)
