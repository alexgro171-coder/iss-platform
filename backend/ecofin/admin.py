"""
Eco-Fin Admin
Configurare Django Admin pentru modulul Eco-Fin.
"""
from django.contrib import admin
from django.utils.html import format_html
from .models import (
    EcoFinSettings, 
    EcoFinImportedRow,
    EcoFinProcessedRecord, 
    EcoFinImportBatch,
    EcoFinMonthlyReport,  # Compatibilitate
    # Billing models
    BillingInvoice,
    BillingInvoiceLine,
    BillingSyncLog,
    BillingEmailLog
)


@admin.register(EcoFinSettings)
class EcoFinSettingsAdmin(admin.ModelAdmin):
    list_display = (
        'period_display', 'cheltuieli_indirecte_display', 
        'cost_concediu_display', 'is_locked', 'created_by', 'updated_at'
    )
    list_filter = ('year', 'is_locked')
    search_fields = ('year',)
    ordering = ('-year', '-month')
    readonly_fields = ('created_at', 'updated_at', 'created_by')
    
    fieldsets = (
        ('Perioadă', {
            'fields': ('year', 'month')
        }),
        ('Setări Financiare', {
            'fields': ('cheltuieli_indirecte', 'cost_concediu')
        }),
        ('Status', {
            'fields': ('is_locked',)
        }),
        ('Audit', {
            'fields': ('created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def period_display(self, obj):
        months = ['', 'Ian', 'Feb', 'Mar', 'Apr', 'Mai', 'Iun', 
                  'Iul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        icon = '🔒' if obj.is_locked else '📝'
        return f"{icon} {months[obj.month]} {obj.year}"
    period_display.short_description = 'Perioadă'

    def cheltuieli_indirecte_display(self, obj):
        return f"{obj.cheltuieli_indirecte:,.2f} RON"
    cheltuieli_indirecte_display.short_description = 'Cheltuieli Ind.'

    def cost_concediu_display(self, obj):
        return f"{obj.cost_concediu:,.2f} RON"
    cost_concediu_display.short_description = 'Cost Concediu'

    def save_model(self, request, obj, form, change):
        if not change:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)

    def has_change_permission(self, request, obj=None):
        if obj and obj.is_locked and not request.user.is_superuser:
            return False
        return True


@admin.register(EcoFinImportedRow)
class EcoFinImportedRowAdmin(admin.ModelAdmin):
    list_display = (
        'row_number', 'nr_cim', 'nume', 'prenume',
        'salariu_brut_display', 'ore_lucrate', 'cam_display',
        'status_display', 'worker_link', 'batch'
    )
    list_filter = ('status', 'year', 'month', 'batch')
    search_fields = ('nr_cim', 'nume', 'prenume', 'worker__nume', 'worker__prenume')
    ordering = ('-batch__created_at', 'row_number')
    readonly_fields = ('created_at',)
    raw_id_fields = ('worker', 'client', 'batch')

    def status_display(self, obj):
        colors = {
            'raw': '#6b7280',
            'matched': '#10b981',
            'error': '#ef4444',
            'processed': '#3b82f6'
        }
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            colors.get(obj.status, '#000'),
            obj.get_status_display()
        )
    status_display.short_description = 'Status'

    def salariu_brut_display(self, obj):
        return f"{obj.salariu_brut:,.2f}"
    salariu_brut_display.short_description = 'Salariu Brut'

    def cam_display(self, obj):
        return f"{obj.cam:,.2f}"
    cam_display.short_description = 'CAM'

    def worker_link(self, obj):
        if obj.worker:
            return format_html(
                '<a href="/admin/iss/worker/{}/change/">{} {}</a>',
                obj.worker.id, obj.worker.nume, obj.worker.prenume
            )
        return '-'
    worker_link.short_description = 'Lucrător'


@admin.register(EcoFinProcessedRecord)
class EcoFinProcessedRecordAdmin(admin.ModelAdmin):
    list_display = (
        'worker_display', 'client', 'period_display',
        'ore_lucrate', 'salariu_brut_display', 'cam_display',
        'cost_salariat_total_display', 'profitabilitate_display',
        'is_validated', 'validated_at'
    )
    list_filter = ('year', 'month', 'is_validated', 'client')
    search_fields = (
        'worker__nume', 'worker__prenume', 'worker__pasaport_nr',
        'nr_cim', 'client__denumire'
    )
    ordering = ('-year', '-month', 'worker__nume')
    readonly_fields = (
        'cost_salarial_complet', 'cost_salariat_total', 
        'venit_generat', 'profitabilitate',
        'created_at', 'updated_at', 'validated_at', 'validated_by'
    )
    raw_id_fields = ('worker', 'client', 'imported_row')
    
    fieldsets = (
        ('Identificare', {
            'fields': ('worker', 'client', 'nr_cim', 'imported_row')
        }),
        ('Perioadă', {
            'fields': ('year', 'month')
        }),
        ('Date Import', {
            'fields': ('ore_lucrate', 'salariu_brut', 'cam', 'net', 'retineri', 'rest_plata')
        }),
        ('Date Client (copiate)', {
            'fields': ('tarif_orar', 'cost_cazare', 'cost_masa', 'cost_transport')
        }),
        ('Setări Globale (copiate)', {
            'fields': ('cota_indirecte', 'cost_concediu')
        }),
        ('Calcule (auto)', {
            'fields': (
                'cost_salarial_complet', 'cost_salariat_total', 
                'venit_generat', 'profitabilitate'
            ),
            'classes': ('collapse',)
        }),
        ('Validare', {
            'fields': ('is_validated', 'validated_at', 'validated_by')
        }),
        ('Observații', {
            'fields': ('notes',),
            'classes': ('collapse',)
        }),
        ('Audit', {
            'fields': ('created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def worker_display(self, obj):
        return f"{obj.worker.nume} {obj.worker.prenume}"
    worker_display.short_description = 'Lucrător'

    def period_display(self, obj):
        return f"{obj.month:02d}/{obj.year}"
    period_display.short_description = 'Perioadă'

    def salariu_brut_display(self, obj):
        return f"{obj.salariu_brut:,.2f}"
    salariu_brut_display.short_description = 'Salariu Brut'

    def cam_display(self, obj):
        return f"{obj.cam:,.2f}"
    cam_display.short_description = 'CAM'

    def cost_salariat_total_display(self, obj):
        return f"{obj.cost_salariat_total:,.2f}"
    cost_salariat_total_display.short_description = 'Cost Total'

    def profitabilitate_display(self, obj):
        color = '#10b981' if obj.profitabilitate >= 0 else '#ef4444'
        return format_html(
            '<span style="color: {}; font-weight: bold;">{:,.2f} RON</span>',
            color, obj.profitabilitate
        )
    profitabilitate_display.short_description = 'Profit'

    def has_change_permission(self, request, obj=None):
        if obj and obj.is_validated:
            return request.user.is_superuser
        return True

    def has_delete_permission(self, request, obj=None):
        if obj and obj.is_validated:
            return request.user.is_superuser
        return True


@admin.register(EcoFinImportBatch)
class EcoFinImportBatchAdmin(admin.ModelAdmin):
    list_display = (
        'filename', 'period_display', 'status_display',
        'total_rows', 'matched_rows', 'error_rows', 'processed_rows',
        'imported_by', 'created_at'
    )
    list_filter = ('status', 'year', 'month')
    search_fields = ('filename',)
    ordering = ('-created_at',)
    readonly_fields = ('created_at', 'validated_at')

    def period_display(self, obj):
        return f"{obj.month:02d}/{obj.year}"
    period_display.short_description = 'Perioadă'

    def status_display(self, obj):
        colors = {
            'pending': '#6b7280',
            'processing': '#f59e0b',
            'preview': '#3b82f6',
            'validated': '#10b981',
            'failed': '#ef4444',
            'cancelled': '#9ca3af'
        }
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            colors.get(obj.status, '#000'),
            obj.get_status_display()
        )
    status_display.short_description = 'Status'


# Compatibilitate cu modelul vechi
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
        if obj and obj.is_validated:
            return request.user.is_superuser
        return True

    def has_delete_permission(self, request, obj=None):
        if obj and obj.is_validated:
            return request.user.is_superuser
        return True


# ==========================================
# BILLING ADMIN
# ==========================================

class BillingInvoiceLineInline(admin.TabularInline):
    model = BillingInvoiceLine
    extra = 0
    readonly_fields = ('line_total', 'line_vat')


@admin.register(BillingInvoice)
class BillingInvoiceAdmin(admin.ModelAdmin):
    list_display = (
        'invoice_number_display', 'client', 'period_display',
        'subtotal_display', 'vat_total_display', 'total_display',
        'status_display', 'payment_status_display',
        'paid_display', 'due_display',
        'issue_date', 'created_at'
    )
    list_filter = ('status', 'payment_status', 'year', 'month', 'client')
    search_fields = (
        'client__denumire', 'smartbill_series', 'smartbill_number'
    )
    ordering = ('-year', '-month', '-issue_date')
    readonly_fields = (
        'smartbill_document_id', 'smartbill_series', 'smartbill_number',
        'due_amount', 'pdf_path',
        'created_by', 'created_at', 'updated_at',
        'last_email_sent_at', 'email_sent_to', 'email_sent_count'
    )
    raw_id_fields = ('client',)
    inlines = [BillingInvoiceLineInline]
    
    fieldsets = (
        ('Client & Perioadă', {
            'fields': ('client', 'year', 'month')
        }),
        ('SmartBill', {
            'fields': ('smartbill_series', 'smartbill_number', 'smartbill_document_id', 'issue_date')
        }),
        ('Valori', {
            'fields': ('subtotal', 'vat_total', 'total', 'currency', 'hours_billed', 'hourly_rate')
        }),
        ('Status', {
            'fields': ('status', 'payment_status', 'paid_amount', 'due_amount')
        }),
        ('PDF', {
            'fields': ('pdf_path',),
            'classes': ('collapse',)
        }),
        ('Email', {
            'fields': ('last_email_sent_at', 'email_sent_to', 'email_sent_count'),
            'classes': ('collapse',)
        }),
        ('Audit', {
            'fields': ('created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def period_display(self, obj):
        return f"{obj.month:02d}/{obj.year}"
    period_display.short_description = 'Perioadă'

    def subtotal_display(self, obj):
        return f"{obj.subtotal:,.2f}"
    subtotal_display.short_description = 'Fără TVA'

    def vat_total_display(self, obj):
        return f"{obj.vat_total:,.2f}"
    vat_total_display.short_description = 'TVA'

    def total_display(self, obj):
        return f"{obj.total:,.2f}"
    total_display.short_description = 'Total'

    def paid_display(self, obj):
        return f"{obj.paid_amount:,.2f}"
    paid_display.short_description = 'Încasat'

    def due_display(self, obj):
        color = '#ef4444' if obj.due_amount > 0 else '#10b981'
        return format_html(
            '<span style="color: {};">{:,.2f}</span>',
            color, obj.due_amount
        )
    due_display.short_description = 'Sold'

    def status_display(self, obj):
        colors = {
            'draft': '#6b7280',
            'issued': '#10b981',
            'cancelled': '#ef4444'
        }
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            colors.get(obj.status, '#000'),
            obj.get_status_display()
        )
    status_display.short_description = 'Status'

    def payment_status_display(self, obj):
        colors = {
            'unpaid': '#ef4444',
            'partial': '#f59e0b',
            'paid': '#10b981'
        }
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            colors.get(obj.payment_status, '#000'),
            obj.get_payment_status_display()
        )
    payment_status_display.short_description = 'Încasare'

    def save_model(self, request, obj, form, change):
        if not change:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)

    def has_change_permission(self, request, obj=None):
        # Facturile emise pot fi modificate doar de superuser
        if obj and obj.status == 'issued' and not request.user.is_superuser:
            return False
        return True

    def has_delete_permission(self, request, obj=None):
        # Facturile emise pot fi șterse doar de superuser
        if obj and obj.status == 'issued' and not request.user.is_superuser:
            return False
        return True


@admin.register(BillingSyncLog)
class BillingSyncLogAdmin(admin.ModelAdmin):
    list_display = (
        'sync_started_at', 'sync_finished_at',
        'status_display', 'user',
        'requested_from_ts', 'requested_to_ts',
        'results_summary'
    )
    list_filter = ('status',)
    ordering = ('-sync_started_at',)
    readonly_fields = (
        'sync_started_at', 'sync_finished_at',
        'requested_from_ts', 'requested_to_ts',
        'user', 'status', 'result_counts', 'error_message'
    )

    def status_display(self, obj):
        colors = {
            'in_progress': '#f59e0b',
            'success': '#10b981',
            'failure': '#ef4444'
        }
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            colors.get(obj.status, '#000'),
            obj.get_status_display()
        )
    status_display.short_description = 'Status'

    def results_summary(self, obj):
        if obj.result_counts:
            return f"Actualizate: {obj.result_counts.get('invoices_updated', 0)}, Erori: {obj.result_counts.get('errors_count', 0)}"
        return '-'
    results_summary.short_description = 'Rezultate'


@admin.register(BillingEmailLog)
class BillingEmailLogAdmin(admin.ModelAdmin):
    list_display = (
        'sent_at', 'invoice', 'sent_to', 'sent_by', 'status_display'
    )
    list_filter = ('status',)
    search_fields = ('sent_to', 'invoice__smartbill_series', 'invoice__smartbill_number')
    ordering = ('-sent_at',)
    readonly_fields = (
        'sent_at', 'sent_by', 'invoice', 'sent_to', 'subject', 'status', 'error_message'
    )

    def status_display(self, obj):
        color = '#10b981' if obj.status == 'sent' else '#ef4444'
        return format_html(
            '<span style="color: {};">{}</span>',
            color, 'Trimis' if obj.status == 'sent' else 'Eșuat'
        )
    status_display.short_description = 'Status'
