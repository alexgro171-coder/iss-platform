from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    ClientViewSet, WorkerViewSet, WorkerDocumentViewSet, CodCORViewSet,
    TemplateDocumentViewSet, AmbasadaViewSet, current_user
)

router = DefaultRouter()
router.register(r"clients", ClientViewSet, basename="client")
router.register(r"workers", WorkerViewSet, basename="worker")
router.register(r"worker-documents", WorkerDocumentViewSet, basename="worker-document")
router.register(r"coduri-cor", CodCORViewSet, basename="cod-cor")
router.register(r"ambasade", AmbasadaViewSet, basename="ambasada")
router.register(r"templates", TemplateDocumentViewSet, basename="template")

urlpatterns = [
    path("", include(router.urls)),
    path("me/", current_user, name="current_user"),  # Informații utilizator curent
]

