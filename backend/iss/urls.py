from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import ClientViewSet, WorkerViewSet

router = DefaultRouter()
router.register(r"clients", ClientViewSet, basename="client")
router.register(r"workers", WorkerViewSet, basename="worker")

urlpatterns = [
    path("", include(router.urls)),
]

