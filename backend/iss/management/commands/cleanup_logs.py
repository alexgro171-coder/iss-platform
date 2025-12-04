"""
Management command pentru curățarea logurilor mai vechi de 30 de zile.

Utilizare:
    python manage.py cleanup_logs           # Șterge loguri mai vechi de 30 zile
    python manage.py cleanup_logs --days 60 # Șterge loguri mai vechi de 60 zile
    python manage.py cleanup_logs --dry-run # Doar afișează ce ar șterge

Se recomandă rularea zilnică printr-un cron job:
    0 2 * * * cd /var/www/iss-platform && docker compose exec -T backend python manage.py cleanup_logs
"""

from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from iss.models import ActivityLog


class Command(BaseCommand):
    help = 'Șterge logurile de activitate mai vechi de un număr specificat de zile (default: 30)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--days',
            type=int,
            default=30,
            help='Numărul de zile de retenție (default: 30)',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Nu șterge efectiv, doar afișează ce ar șterge',
        )

    def handle(self, *args, **options):
        days = options['days']
        dry_run = options['dry_run']
        
        cutoff_date = timezone.now() - timedelta(days=days)
        
        self.stdout.write(f"\n{'='*60}")
        self.stdout.write(f"🧹 ISS Platform - Curățare Loguri")
        self.stdout.write(f"{'='*60}")
        self.stdout.write(f"📅 Data curentă: {timezone.now().strftime('%d.%m.%Y %H:%M')}")
        self.stdout.write(f"📅 Retenție: {days} zile")
        self.stdout.write(f"📅 Șterg loguri înainte de: {cutoff_date.strftime('%d.%m.%Y %H:%M')}")
        
        if dry_run:
            self.stdout.write(self.style.WARNING("⚠️  MOD DRY-RUN - Nu se șterge nimic"))
        
        self.stdout.write(f"{'='*60}\n")
        
        # Găsim logurile de șters
        old_logs = ActivityLog.objects.filter(timestamp__lt=cutoff_date)
        count = old_logs.count()
        
        if count == 0:
            self.stdout.write(self.style.SUCCESS(
                "✅ Nu există loguri mai vechi de {} zile.".format(days)
            ))
            return
        
        # Statistici pe tip de log
        stats = {}
        for log_type in ['SYSTEM', 'AUTH', 'ACTIVITY']:
            type_count = old_logs.filter(log_type=log_type).count()
            if type_count > 0:
                stats[log_type] = type_count
        
        self.stdout.write(f"📊 Loguri de șters: {count}")
        for log_type, type_count in stats.items():
            self.stdout.write(f"   • {log_type}: {type_count}")
        
        if dry_run:
            self.stdout.write(self.style.WARNING(
                f"\n⚠️  [DRY-RUN] Ar fi șterse {count} loguri."
            ))
        else:
            # Ștergem efectiv
            deleted_count, _ = old_logs.delete()
            self.stdout.write(self.style.SUCCESS(
                f"\n✅ Au fost șterse {deleted_count} loguri vechi."
            ))
            
            # Logăm acțiunea de curățare
            ActivityLog.objects.create(
                log_type='SYSTEM',
                action='INFO',
                username='SYSTEM',
                details={
                    'message': f'Curățare automată loguri',
                    'deleted_count': deleted_count,
                    'retention_days': days,
                    'cutoff_date': cutoff_date.isoformat(),
                }
            )
        
        # Statistici rămase
        remaining = ActivityLog.objects.count()
        self.stdout.write(f"\n📊 Total loguri rămase în sistem: {remaining}")
        self.stdout.write(f"{'='*60}\n")

