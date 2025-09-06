from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()

class EtlRun(models.Model):
    process = models.CharField(max_length=120)  # ej: sp_etl_cargar_dimensiones
    started_at = models.DateTimeField(auto_now_add=True)
    finished_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, default="running")  # running|ok|error
    rows_affected = models.IntegerField(default=0)
    message = models.TextField(blank=True, default="")
    user = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL)

    class Meta:
        db_table = "etl_runs"

    def __str__(self):
        return f"{self.process} [{self.status}] {self.started_at:%Y-%m-%d %H:%M}"
