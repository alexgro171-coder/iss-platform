from django.contrib import admin
from .models import EcoFinSettings, EcoFinMonthlyReport, EcoFinImportBatch


@admin.register(EcoFinSettings)
class EcoFinSettingsAdmin(admin.ModelAdmin):
    list_display = ('year', 'month', 'cheltuieli_indirecte', 'cost_concediu', 'created_by', 'updated_at')
    list_filter = ('year', 'month')
    search_fields = ('year',)
    ordering = ('-year', '-month')


@admin.register(EcoFinMonthlyReport)
class EcoFinMonthlyReportAdmin(admin.ModelAdmin):
    list_display = (
        'worker', 'client', 'year', 'month', 
        'hours_worked', 'salary_cost', 'profit_brut', 
        'is_validated', 'validated_at'
    )
    list_filter = ('year', 'month', 'is_validated', 'client')
    search_fields = ('worker__nume', 'worker__prenume', 'worker__pasaport_nr', 'client__denumire')
    ordering = ('-year', '-month', 'worker__nume')
    readonly_fields = ('profit_brut', 'created_at', 'updated_at')
    
    def has_change_permission(self, request, obj=None):
        # Doar Admin poate modifica rapoarte validate
        if obj and obj.is_validated:
            return request.user.is_superuser
        return True

    def has_delete_permission(self, request, obj=None):
        # Doar Admin poate șterge rapoarte validate
        if obj and obj.is_validated:
            return request.user.is_superuser
        return True


@admin.register(EcoFinImportBatch)
class EcoFinImportBatchAdmin(admin.ModelAdmin):
    list_display = ('filename', 'year', 'month', 'status', 'total_rows', 'successful_rows', 'failed_rows', 'imported_by', 'created_at')
    list_filter = ('status', 'year', 'month')
    search_fields = ('filename',)
    ordering = ('-created_at',)
    readonly_fields = ('created_at',)

