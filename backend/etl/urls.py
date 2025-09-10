# backend/etl/urls.py
from django.urls import path
from .views import etl_run_view

urlpatterns = [
    path("run", etl_run_view, name="etl_run"),
]
