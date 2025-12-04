"""
Signals pentru sistemul de logging.
Interceptează evenimente de autentificare și modificări pe modele.
"""

from django.contrib.auth.signals import user_logged_in, user_logged_out, user_login_failed
from django.db.models.signals import post_save, post_delete, pre_save
from django.dispatch import receiver
from django.contrib.auth.models import User

from .models import Worker, WorkerDocument, ActivityLog, LogType, LogAction


# ============================================
# SIGNALS PENTRU AUTENTIFICARE
# ============================================

@receiver(user_logged_in)
def log_user_login(sender, request, user, **kwargs):
    """Înregistrează login-ul utilizatorului."""
    ActivityLog.log(
        log_type=LogType.AUTH,
        action=LogAction.LOGIN,
        user=user,
        details={"message": f"Utilizatorul {user.username} s-a autentificat"},
        request=request
    )


@receiver(user_logged_out)
def log_user_logout(sender, request, user, **kwargs):
    """Înregistrează logout-ul utilizatorului."""
    if user:
        ActivityLog.log(
            log_type=LogType.AUTH,
            action=LogAction.LOGOUT,
            user=user,
            details={"message": f"Utilizatorul {user.username} s-a deconectat"},
            request=request
        )


@receiver(user_login_failed)
def log_user_login_failed(sender, credentials, request, **kwargs):
    """Înregistrează încercările de login eșuate."""
    username = credentials.get('username', 'unknown')
    ActivityLog.log(
        log_type=LogType.AUTH,
        action=LogAction.LOGIN_FAILED,
        details={
            "message": f"Încercare de autentificare eșuată pentru: {username}",
            "username_attempted": username
        },
        request=request
    )


# ============================================
# SIGNALS PENTRU WORKER
# ============================================

# Stocăm starea anterioară pentru a detecta schimbările
_worker_previous_state = {}


@receiver(pre_save, sender=Worker)
def worker_pre_save(sender, instance, **kwargs):
    """Salvează starea anterioară a worker-ului pentru comparație."""
    if instance.pk:
        try:
            old_instance = Worker.objects.get(pk=instance.pk)
            _worker_previous_state[instance.pk] = {
                'status': old_instance.status,
                'client_id': old_instance.client_id,
                'expert_id': old_instance.expert_id,
            }
        except Worker.DoesNotExist:
            pass


@receiver(post_save, sender=Worker)
def log_worker_save(sender, instance, created, **kwargs):
    """Înregistrează crearea sau modificarea unui lucrător."""
    # Obținem request-ul din thread local (dacă există)
    from .middleware import get_current_request, get_current_user
    request = get_current_request()
    user = get_current_user()
    
    if created:
        # Worker nou creat
        ActivityLog.log(
            log_type=LogType.ACTIVITY,
            action=LogAction.CREATE,
            user=user,
            target=instance,
            details={
                "message": f"Lucrător nou: {instance.nume} {instance.prenume}",
                "pasaport": instance.pasaport_nr,
                "cetatenie": instance.cetatenie,
                "status": instance.status,
            },
            request=request
        )
    else:
        # Worker modificat - verificăm ce s-a schimbat
        old_state = _worker_previous_state.pop(instance.pk, {})
        
        # Verificăm schimbarea de status
        if old_state.get('status') and old_state['status'] != instance.status:
            ActivityLog.log(
                log_type=LogType.ACTIVITY,
                action=LogAction.STATUS_CHANGE,
                user=user,
                target=instance,
                details={
                    "message": f"Schimbare status pentru {instance.nume} {instance.prenume}",
                    "old_status": old_state['status'],
                    "new_status": instance.status,
                },
                request=request
            )
        else:
            # Modificare generală
            ActivityLog.log(
                log_type=LogType.ACTIVITY,
                action=LogAction.UPDATE,
                user=user,
                target=instance,
                details={
                    "message": f"Modificare lucrător: {instance.nume} {instance.prenume}",
                },
                request=request
            )


@receiver(post_delete, sender=Worker)
def log_worker_delete(sender, instance, **kwargs):
    """Înregistrează ștergerea unui lucrător."""
    from .middleware import get_current_request, get_current_user
    request = get_current_request()
    user = get_current_user()
    
    ActivityLog.log(
        log_type=LogType.ACTIVITY,
        action=LogAction.DELETE,
        user=user,
        target=instance,
        details={
            "message": f"Lucrător șters: {instance.nume} {instance.prenume}",
            "pasaport": instance.pasaport_nr,
            "cetatenie": instance.cetatenie,
        },
        request=request
    )


# ============================================
# SIGNALS PENTRU DOCUMENTE
# ============================================

@receiver(post_save, sender=WorkerDocument)
def log_document_upload(sender, instance, created, **kwargs):
    """Înregistrează upload-ul de documente."""
    if created:
        from .middleware import get_current_request, get_current_user
        request = get_current_request()
        user = get_current_user()
        
        ActivityLog.log(
            log_type=LogType.ACTIVITY,
            action=LogAction.UPLOAD,
            user=user,
            target=instance,
            details={
                "message": f"Document încărcat pentru {instance.worker.nume} {instance.worker.prenume}",
                "document_type": instance.get_document_type_display(),
                "filename": instance.original_filename,
                "file_size": instance.file_size,
                "worker_id": instance.worker_id,
                "worker_name": f"{instance.worker.nume} {instance.worker.prenume}",
            },
            request=request
        )


@receiver(post_delete, sender=WorkerDocument)
def log_document_delete(sender, instance, **kwargs):
    """Înregistrează ștergerea de documente."""
    from .middleware import get_current_request, get_current_user
    request = get_current_request()
    user = get_current_user()
    
    ActivityLog.log(
        log_type=LogType.ACTIVITY,
        action=LogAction.DELETE,
        user=user,
        target=instance,
        details={
            "message": f"Document șters: {instance.original_filename}",
            "document_type": instance.get_document_type_display(),
            "worker_id": instance.worker_id,
        },
        request=request
    )

