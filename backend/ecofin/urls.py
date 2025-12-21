"""
Eco-Fin URLs
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    EcoFinSettingsViewSet, 
    EcoFinProcessedRecordViewSet,
    EcoFinImportViewSet,
    EcoFinMonthlyReportViewSet,  # Compatibilitate
    report_by_client,
    report_workers_by_client,
    report_all_clients,
    report_interval,
    export_pdf,
    export_word,
)

router = DefaultRouter()
router.register(r'settings', EcoFinSettingsViewSet, basename='ecofin-settings')
router.register(r'records', EcoFinProcessedRecordViewSet, basename='ecofin-records')
router.register(r'import', EcoFinImportViewSet, basename='ecofin-import')
router.register(r'reports', EcoFinMonthlyReportViewSet, basename='ecofin-reports')  # Compatibilitate

urlpatterns = [
    path('', include(router.urls)),
    
    # Rapoarte
    path('report/client/', report_by_client, name='ecofin-report-client'),
    path('report/workers/', report_workers_by_client, name='ecofin-report-workers'),
    path('report/all/', report_all_clients, name='ecofin-report-all'),
    path('report/interval/', report_interval, name='ecofin-report-interval'),
    
    # Export
    path('export/pdf/', export_pdf, name='ecofin-export-pdf'),
    path('export/word/', export_word, name='ecofin-export-word'),
]
