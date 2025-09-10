# multilazos/urls.py
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("core.urls")),  # ← esto apunta a core/urls.py
    path("api/etl/", include("etl.urls")),      # <-- apunta a etl/urls.py
]
