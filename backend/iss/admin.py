from django.contrib import admin
from .models import Client, Worker, UserProfile, ActivityLog, WorkerDocument, CodCOR


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

