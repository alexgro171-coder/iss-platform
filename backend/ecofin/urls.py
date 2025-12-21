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
    report_rest_plata_total,
    report_rest_plata_by_client,
    report_retineri,
    report_financial_summary,
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
    
    # Rapoarte profitabilitate
    path('report/client/', report_by_client, name='ecofin-report-client'),
    path('report/workers/', report_workers_by_client, name='ecofin-report-workers'),
    path('report/all/', report_all_clients, name='ecofin-report-all'),
    path('report/interval/', report_interval, name='ecofin-report-interval'),
    
    # Rapoarte financiare (rest plată, rețineri)
    path('report/rest-plata/', report_rest_plata_total, name='ecofin-report-rest-plata'),
    path('report/rest-plata-client/', report_rest_plata_by_client, name='ecofin-report-rest-plata-client'),
    path('report/retineri/', report_retineri, name='ecofin-report-retineri'),
    path('report/financial-summary/', report_financial_summary, name='ecofin-report-financial-summary'),
    
    # Export
    path('export/pdf/', export_pdf, name='ecofin-export-pdf'),
    path('export/word/', export_word, name='ecofin-export-word'),
]
