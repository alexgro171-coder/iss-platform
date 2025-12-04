"""
Management command pentru trimiterea alertelor prin email.

Verifică lucrătorii care au programări în următoarele 2 zile și trimite
email-uri de notificare către Expert/Manager-ul asignat.

Utilizare:
    python manage.py send_alerts           # Trimite alerte reale
    python manage.py send_alerts --dry-run # Doar afișează ce ar trimite
    python manage.py send_alerts --days 3  # Verifică pentru următoarele 3 zile

Se recomandă rularea zilnică printr-un cron job:
    0 8 * * * cd /var/www/iss-platform && docker compose exec -T backend python manage.py send_alerts
"""

from datetime import date, timedelta
from django.core.management.base import BaseCommand
from django.core.mail import send_mail
from django.conf import settings
from iss.models import Worker


class Command(BaseCommand):
    help = 'Trimite alerte prin email pentru programările din următoarele zile'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Nu trimite email-uri, doar afișează ce ar trimite',
        )
        parser.add_argument(
            '--days',
            type=int,
            default=2,
            help='Numărul de zile înainte pentru alertă (default: 2)',
        )
        parser.add_argument(
            '--test-email',
            type=str,
            help='Email de test - trimite toate alertele la această adresă',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        days_before = options['days']
        test_email = options.get('test_email')
        
        target_date = date.today() + timedelta(days=days_before)
        
        self.stdout.write(f"\n{'='*60}")
        self.stdout.write(f"🔔 ISS Platform - Sistem Alerte prin Email")
        self.stdout.write(f"{'='*60}")
        self.stdout.write(f"📅 Data curentă: {date.today()}")
        self.stdout.write(f"📅 Verificare pentru data: {target_date} (+{days_before} zile)")
        if dry_run:
            self.stdout.write(self.style.WARNING("⚠️  MOD DRY-RUN - Nu se trimit email-uri"))
        if test_email:
            self.stdout.write(self.style.WARNING(f"⚠️  MOD TEST - Toate alertele la: {test_email}"))
        self.stdout.write(f"{'='*60}\n")
        
        alerts_sent = 0
        errors = 0
        
        # 1. Alerte pentru Data Programare WP
        self.stdout.write("\n📋 Verificare programări WP...")
        workers_wp = Worker.objects.filter(data_programare_wp=target_date)
        
        for worker in workers_wp:
            email_to = self._get_recipient_email(worker, test_email)
            if not email_to:
                self.stdout.write(self.style.WARNING(
                    f"   ⚠️  {worker.nume} {worker.prenume} - Fără email destinatar"
                ))
                continue
            
            subject = f"{settings.ALERT_EMAIL_SUBJECT_PREFIX}ATENȚIE Data Programare WP"
            message = (
                f"ATENȚIE!\n\n"
                f"Pe data de {worker.data_programare_wp.strftime('%d.%m.%Y')} "
                f"aveți programare la IGI pentru WP.\n\n"
                f"Lucrător: {worker.nume} {worker.prenume}\n"
                f"Pașaport: {worker.pasaport_nr}\n"
                f"Cetățenie: {worker.cetatenie or 'N/A'}\n"
                f"Județ WP: {worker.judet_wp or 'N/A'}\n"
                f"Nr. Dosar WP: {worker.dosar_wp_nr or 'N/A'}\n\n"
                f"---\n"
                f"Acest email a fost trimis automat de ISS Platform."
            )
            
            if self._send_alert(email_to, subject, message, dry_run):
                alerts_sent += 1
                self.stdout.write(self.style.SUCCESS(
                    f"   ✅ {worker.nume} {worker.prenume} → {email_to}"
                ))
            else:
                errors += 1
        
        # 2. Alerte pentru Data Interviu Viză
        self.stdout.write("\n📋 Verificare interviuri viză...")
        workers_viza = Worker.objects.filter(data_programare_interviu=target_date)
        
        for worker in workers_viza:
            email_to = self._get_recipient_email(worker, test_email)
            if not email_to:
                self.stdout.write(self.style.WARNING(
                    f"   ⚠️  {worker.nume} {worker.prenume} - Fără email destinatar"
                ))
                continue
            
            subject = f"{settings.ALERT_EMAIL_SUBJECT_PREFIX}ATENȚIE Data Interviu Viză"
            message = (
                f"ATENȚIE!\n\n"
                f"Pe data de {worker.data_programare_interviu.strftime('%d.%m.%Y')} "
                f"aveți programare pentru Interviu Viză.\n\n"
                f"Lucrător: {worker.nume} {worker.prenume}\n"
                f"Pașaport: {worker.pasaport_nr}\n"
                f"Cetățenie: {worker.cetatenie or 'N/A'}\n"
                f"Status: {worker.status}\n\n"
                f"---\n"
                f"Acest email a fost trimis automat de ISS Platform."
            )
            
            if self._send_alert(email_to, subject, message, dry_run):
                alerts_sent += 1
                self.stdout.write(self.style.SUCCESS(
                    f"   ✅ {worker.nume} {worker.prenume} → {email_to}"
                ))
            else:
                errors += 1
        
        # 3. Alerte pentru Data Programare PS
        self.stdout.write("\n📋 Verificare programări Permis de Ședere...")
        workers_ps = Worker.objects.filter(data_programare_ps=target_date)
        
        for worker in workers_ps:
            email_to = self._get_recipient_email(worker, test_email)
            if not email_to:
                self.stdout.write(self.style.WARNING(
                    f"   ⚠️  {worker.nume} {worker.prenume} - Fără email destinatar"
                ))
                continue
            
            subject = f"{settings.ALERT_EMAIL_SUBJECT_PREFIX}ATENȚIE Data Programare PS"
            message = (
                f"ATENȚIE!\n\n"
                f"Pe data de {worker.data_programare_ps.strftime('%d.%m.%Y')} "
                f"aveți programare pentru Permis de Ședere.\n\n"
                f"Lucrător: {worker.nume} {worker.prenume}\n"
                f"Pașaport: {worker.pasaport_nr}\n"
                f"Cetățenie: {worker.cetatenie or 'N/A'}\n"
                f"CNP: {worker.cnp or 'N/A'}\n\n"
                f"---\n"
                f"Acest email a fost trimis automat de ISS Platform."
            )
            
            if self._send_alert(email_to, subject, message, dry_run):
                alerts_sent += 1
                self.stdout.write(self.style.SUCCESS(
                    f"   ✅ {worker.nume} {worker.prenume} → {email_to}"
                ))
            else:
                errors += 1
        
        # Sumar
        self.stdout.write(f"\n{'='*60}")
        self.stdout.write(f"📊 SUMAR:")
        self.stdout.write(f"   • Alerte trimise: {alerts_sent}")
        self.stdout.write(f"   • Erori: {errors}")
        self.stdout.write(f"{'='*60}\n")
        
        if alerts_sent == 0 and errors == 0:
            self.stdout.write(self.style.WARNING(
                "ℹ️  Nu sunt programări pentru data verificată."
            ))

    def _get_recipient_email(self, worker, test_email=None):
        """Determină adresa de email pentru notificare."""
        if test_email:
            return test_email
        
        # Prioritate: expert asignat → email implicit din settings
        if worker.expert and worker.expert.email:
            return worker.expert.email
        
        # Fallback la email-ul implicit pentru teste
        return getattr(settings, 'DEFAULT_ALERT_EMAIL', None)

    def _send_alert(self, email_to, subject, message, dry_run=False):
        """Trimite email de alertă."""
        if dry_run:
            self.stdout.write(f"\n   📧 [DRY-RUN] Ar trimite către: {email_to}")
            self.stdout.write(f"      Subject: {subject}")
            return True
        
        try:
            send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[email_to],
                fail_silently=False,
            )
            return True
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"   ❌ Eroare: {str(e)}"))
            return False

