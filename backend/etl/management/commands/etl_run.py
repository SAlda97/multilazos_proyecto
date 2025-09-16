from django.core.management.base import BaseCommand, CommandError
from django.db import connection
from django.utils import timezone
from etl.models import EtlRun

class Command(BaseCommand):
    help = "Ejecuta un SP de ETL y registra auditoría. Uso: python manage.py etl_run --proc sp_nombre"

    def add_arguments(self, parser):
        parser.add_argument("--proc", required=True, help="Nombre del procedimiento almacenado a ejecutar")

    def handle(self, *args, **opts):
        proc = opts["proc"]
        run = EtlRun.objects.create(process=proc, status="running")
        rows = 0
        try:
            with connection.cursor() as cur:
                cur.execute(f"EXEC {proc}")  # SP en bd existente
                try:
                    rows = cur.rowcount if cur.rowcount is not None else 0
                except Exception:
                    rows = 0
            run.status = "ok"
            run.rows_affected = rows
            run.message = "OK"
        except Exception as e:
            run.status = "error"
            run.message = str(e)
            raise CommandError(str(e))
        finally:
            run.finished_at = timezone.now()
            run.save()
        self.stdout.write(self.style.SUCCESS(f"ETL {proc}: {run.status} (rows={rows})"))
