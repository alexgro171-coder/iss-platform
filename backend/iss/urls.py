from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import ClientViewSet, WorkerViewSet, current_user

router = DefaultRouter()
router.register(r"clients", ClientViewSet, basename="client")
router.register(r"workers", WorkerViewSet, basename="worker")

urlpatterns = [
    path("", include(router.urls)),
    path("me/", current_user, name="current_user"),  # Informații utilizator curent
]

