"""
Eco-Fin URLs
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import EcoFinSettingsViewSet, EcoFinMonthlyReportViewSet, EcoFinImportViewSet

router = DefaultRouter()
router.register(r'settings', EcoFinSettingsViewSet, basename='ecofin-settings')
router.register(r'reports', EcoFinMonthlyReportViewSet, basename='ecofin-reports')
router.register(r'import', EcoFinImportViewSet, basename='ecofin-import')

urlpatterns = [
    path('', include(router.urls)),
]

