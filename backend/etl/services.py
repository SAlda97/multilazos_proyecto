# backend/etl/services.py
from django.db import connection, transaction
from django.utils import timezone
from etl.models import EtlRun

def run_stored_procedure(proc_name: str, user=None) -> dict:
    """
    Ejecuta un procedimiento almacenado y registra en etl_runs.
    Devuelve un dict con status, rows_affected y mensaje.
    """
    started = timezone.now()
    status = "ok"
    rows = -1
    message = "OK"

    try:
        with connection.cursor() as cur:
            cur.execute(f"EXEC {proc_name}")
            # rowcount suele ser -1 con NOCOUNT ON; lo dejamos informativo
            rows = cur.rowcount if cur.rowcount is not None else -1

    except Exception as e:
        status = "error"
        message = str(e)

    # Auditamos SIEMPRE (aun si falla)
    EtlRun.objects.create(
        process=proc_name,
        status=status,
        rows_affected=rows,
        message=message[:500],  # por si hay errores muy largos
        started_at=started,
        finished_at=timezone.now(),
        executed_by=user if user and user.is_authenticated else None,
    )

    return {"status": status, "rows": rows, "message": message}
