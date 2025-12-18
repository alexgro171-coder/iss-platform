from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.http import HttpResponseRedirect
from .models import (
    Client, Worker, UserProfile, ActivityLog, WorkerDocument, CodCOR,
    TemplateDocument, GeneratedDocument, TemplateType
)


@admin.register(Client)
class ClientAdmin(admin.ModelAdmin):
    list_display = ("denumire", "tara", "oras", "tarif_orar")
    search_fields = ("denumire", "cod_fiscal", "oras", "tara")


@admin.register(Worker)
class WorkerAdmin(admin.ModelAdmin):
    list_display = ("nume", "prenume", "cetatenie", "status", "pasaport_nr", "client", "agent", "expert")
    search_fields = ("nume", "prenume", "pasaport_nr", "cetatenie")
    list_filter = ("status", "cetatenie", "client", "agent", "expert")
    ordering = ("nume", "prenume")
    autocomplete_fields = ["client", "agent", "expert"]


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "role", "telefon")
    list_filter = ("role",)
    search_fields = ("user__username", "telefon")


@admin.register(WorkerDocument)
class WorkerDocumentAdmin(admin.ModelAdmin):
    list_display = ("worker", "document_type", "original_filename", "uploaded_at", "uploaded_by")
    list_filter = ("document_type", "uploaded_at")
    search_fields = ("worker__nume", "worker__prenume", "original_filename")
    date_hierarchy = "uploaded_at"


@admin.register(CodCOR)
class CodCORAdmin(admin.ModelAdmin):
    list_display = ("cod", "denumire_ro", "denumire_en", "activ", "updated_at")
    list_filter = ("activ",)
    search_fields = ("cod", "denumire_ro", "denumire_en")
    list_editable = ("activ",)
    ordering = ("cod",)


@admin.register(ActivityLog)
class ActivityLogAdmin(admin.ModelAdmin):
    list_display = ("timestamp", "colored_log_type", "colored_action", "username", "target_model", "target_repr", "ip_address")
    list_filter = ("log_type", "action", "timestamp")
    search_fields = ("username", "target_repr", "ip_address", "details")
    date_hierarchy = "timestamp"
    readonly_fields = ("timestamp", "log_type", "action", "user", "username", "target_model", 
                       "target_id", "target_repr", "details", "ip_address", "user_agent")
    
    # Culori pentru tipuri de log
    LOG_TYPE_COLORS = {
        'SYSTEM': '#6c757d',    # Gri
        'AUTH': '#0d6efd',      # Albastru
        'ACTIVITY': '#198754',  # Verde
    }
    
    # Culori pentru acțiuni
    ACTION_COLORS = {
        'LOGIN': '#198754',         # Verde
        'LOGOUT': '#6c757d',        # Gri
        'LOGIN_FAILED': '#dc3545',  # Roșu
        'CREATE': '#0d6efd',        # Albastru
        'UPDATE': '#ffc107',        # Galben/Portocaliu
        'DELETE': '#dc3545',        # Roșu
        'STATUS_CHANGE': '#6f42c1', # Mov
        'UPLOAD': '#20c997',        # Turcoaz
        'DOWNLOAD': '#17a2b8',      # Cyan
        'BULK_IMPORT': '#fd7e14',   # Portocaliu
        'EXPORT': '#17a2b8',        # Cyan
        'ERROR': '#dc3545',         # Roșu
        'WARNING': '#ffc107',       # Galben
        'INFO': '#6c757d',          # Gri
    }
    
    @admin.display(description='Tip Log')
    def colored_log_type(self, obj):
        from django.utils.html import format_html
        color = self.LOG_TYPE_COLORS.get(obj.log_type, '#6c757d')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; '
            'border-radius: 4px; font-size: 11px; font-weight: bold;">{}</span>',
            color,
            obj.get_log_type_display()
        )
    
    @admin.display(description='Acțiune')
    def colored_action(self, obj):
        from django.utils.html import format_html
        color = self.ACTION_COLORS.get(obj.action, '#6c757d')
        # Emoji-uri pentru acțiuni
        emojis = {
            'LOGIN': '🔓',
            'LOGOUT': '🚪',
            'LOGIN_FAILED': '⛔',
            'CREATE': '➕',
            'UPDATE': '✏️',
            'DELETE': '🗑️',
            'STATUS_CHANGE': '🔄',
            'UPLOAD': '📤',
            'DOWNLOAD': '📥',
            'BULK_IMPORT': '📊',
            'EXPORT': '📋',
            'ERROR': '❌',
            'WARNING': '⚠️',
            'INFO': 'ℹ️',
        }
        emoji = emojis.get(obj.action, '•')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; '
            'border-radius: 4px; font-size: 11px; font-weight: bold;">{} {}</span>',
            color,
            emoji,
            obj.get_action_display()
        )
    
    def has_add_permission(self, request):
        return False  # Nu permitem adăugare manuală de loguri
    
    def has_change_permission(self, request, obj=None):
        return False  # Nu permitem modificarea logurilor
    
    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser  # Doar superuser poate șterge


@admin.register(TemplateDocument)
class TemplateDocumentAdmin(admin.ModelAdmin):
    """
    Admin pentru gestionarea template-urilor de documente.
    Permite upload, vizualizare și înlocuire template-uri.
    """
    list_display = (
        'template_type_display', 'original_filename', 'is_active_icon',
        'uploaded_at', 'uploaded_by', 'action_buttons'
    )
    list_filter = ('template_type', 'is_active', 'uploaded_at')
    search_fields = ('original_filename', 'description')
    readonly_fields = ('uploaded_at', 'updated_at', 'uploaded_by')
    ordering = ('template_type', '-is_active', '-uploaded_at')
    
    fieldsets = (
        ('Tip Template', {
            'fields': ('template_type',)
        }),
        ('Fișier', {
            'fields': ('file', 'original_filename', 'description')
        }),
        ('Status', {
            'fields': ('is_active',)
        }),
        ('Informații', {
            'fields': ('uploaded_at', 'updated_at', 'uploaded_by'),
            'classes': ('collapse',)
        }),
    )

    @admin.display(description='Tip Template')
    def template_type_display(self, obj):
        # Culori pentru fiecare tip de template
        colors = {
            'cerere_work_permit': '#0d6efd',  # Albastru
            'oferta_angajare': '#198754',      # Verde
            'scrisoare_garantie': '#6f42c1',   # Mov
            'declaratie': '#fd7e14',           # Portocaliu
            'cim': '#dc3545',                  # Roșu
        }
        color = colors.get(obj.template_type, '#6c757d')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 4px 10px; '
            'border-radius: 4px; font-size: 11px; font-weight: bold;">{}</span>',
            color,
            obj.get_template_type_display()
        )

    @admin.display(description='Activ')
    def is_active_icon(self, obj):
        if obj.is_active:
            return format_html(
                '<span style="color: #198754; font-size: 18px;">✔️</span>'
            )
        return format_html(
            '<span style="color: #dc3545; font-size: 18px;">❌</span>'
        )

    @admin.display(description='Acțiuni')
    def action_buttons(self, obj):
        if obj.file:
            return format_html(
                '<a href="{}" class="button" style="padding: 3px 8px; '
                'background: #0d6efd; color: white; text-decoration: none; '
                'border-radius: 3px; font-size: 11px;" target="_blank">📥 Descarcă</a>',
                obj.file.url
            )
        return '-'

    def save_model(self, request, obj, form, change):
        # Setăm utilizatorul care a încărcat
        if not obj.uploaded_by:
            obj.uploaded_by = request.user
        
        # Setăm numele original al fișierului
        if obj.file and not obj.original_filename:
            obj.original_filename = obj.file.name.split('/')[-1]
        
        super().save_model(request, obj, form, change)

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('uploaded_by')

    class Media:
        css = {
            'all': ('admin/css/template_admin.css',)
        }


@admin.register(GeneratedDocument)
class GeneratedDocumentAdmin(admin.ModelAdmin):
    """
    Admin pentru vizualizarea istoricului documentelor generate.
    Read-only - doar pentru audit.
    """
    list_display = (
        'template_type_display', 'worker_name', 'generated_by_username',
        'output_format_display', 'generated_at'
    )
    list_filter = ('template_type', 'output_format', 'generated_at')
    search_fields = ('worker_name', 'generated_by_username')
    readonly_fields = (
        'template', 'template_type', 'worker', 'worker_name',
        'generated_by', 'generated_by_username', 'generated_at', 'output_format'
    )
    ordering = ('-generated_at',)
    date_hierarchy = 'generated_at'

    @admin.display(description='Tip Template')
    def template_type_display(self, obj):
        colors = {
            'cerere_work_permit': '#0d6efd',
            'oferta_angajare': '#198754',
            'scrisoare_garantie': '#6f42c1',
            'declaratie': '#fd7e14',
            'cim': '#dc3545',
        }
        color = colors.get(obj.template_type, '#6c757d')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 4px 10px; '
            'border-radius: 4px; font-size: 11px;">{}</span>',
            color,
            obj.get_template_type_display()
        )

    @admin.display(description='Format')
    def output_format_display(self, obj):
        if obj.output_format == 'pdf':
            return format_html(
                '<span style="color: #dc3545;">📕 PDF</span>'
            )
        return format_html(
            '<span style="color: #0d6efd;">📘 Word</span>'
        )

    def has_add_permission(self, request):
        return False  # Nu permitem adăugare manuală

    def has_change_permission(self, request, obj=None):
        return False  # Nu permitem modificare

    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser

