"""
Eco-Fin Microservice Models
Modul pentru evaluarea profitabilității lucrătorilor.
"""
from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator, MaxValueValidator
from decimal import Decimal


class EcoFinSettings(models.Model):
    """
    Setări globale lunare pentru Eco-Fin.
    Cheltuieli indirecte și cost concediu se aplică tuturor lucrătorilor.
    """
    year = models.PositiveIntegerField(
        validators=[MinValueValidator(2020), MaxValueValidator(2100)],
        help_text="Anul pentru care se aplică setările"
    )
    month = models.PositiveIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(12)],
        help_text="Luna pentru care se aplică setările (1-12)"
    )
    cheltuieli_indirecte = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Cheltuieli indirecte lunare (se împart la nr. lucrători)"
    )
    cost_concediu = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Cost concediu per lucrător"
    )
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='ecofin_settings_created'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Setare Eco-Fin"
        verbose_name_plural = "Setări Eco-Fin"
        unique_together = ['year', 'month']
        ordering = ['-year', '-month']

    def __str__(self):
        return f"Setări {self.month:02d}/{self.year}"


class EcoFinMonthlyReport(models.Model):
    """
    Raport lunar de profitabilitate per lucrător/client.
    După validare, devine READ-ONLY (doar Admin poate modifica).
    """
    # Legături
    worker = models.ForeignKey(
        'iss.Worker',
        on_delete=models.CASCADE,
        related_name='ecofin_reports'
    )
    client = models.ForeignKey(
        'iss.Client',
        on_delete=models.CASCADE,
        related_name='ecofin_reports'
    )
    
    # Perioadă
    year = models.PositiveIntegerField(
        validators=[MinValueValidator(2020), MaxValueValidator(2100)]
    )
    month = models.PositiveIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(12)]
    )
    
    # Date din import Excel
    hours_worked = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Ore lucrate în luna respectivă"
    )
    salary_cost = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Cost salarial total din Excel"
    )
    
    # Date din Client (copiate la momentul importului pentru istoric)
    tarif_orar = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Tarif orar (copiat din Client)"
    )
    cost_cazare = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Cost cazare (copiat din Client)"
    )
    cost_masa = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Cost masă (copiat din Client)"
    )
    cost_transport = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Cost transport (copiat din Client)"
    )
    
    # Date din setări globale (copiate la momentul importului)
    cost_concediu = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Cost concediu (din setări globale)"
    )
    cheltuieli_indirecte = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Cheltuieli indirecte alocate (din setări globale)"
    )
    
    # Rezultat calculat
    profit_brut = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Profit brut calculat"
    )
    
    # Status validare
    is_validated = models.BooleanField(
        default=False,
        help_text="True = dataset validat și înghețat"
    )
    validated_at = models.DateTimeField(null=True, blank=True)
    validated_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='ecofin_validated'
    )
    
    # Audit
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='ecofin_reports_created'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Note/observații
    notes = models.TextField(blank=True, help_text="Observații (ex: ore împărțite între 2 clienți)")

    class Meta:
        verbose_name = "Raport Eco-Fin"
        verbose_name_plural = "Rapoarte Eco-Fin"
        # Un lucrător poate avea mai multe înregistrări pe lună (pentru clienți diferiți)
        ordering = ['-year', '-month', 'worker__nume']

    def __str__(self):
        return f"{self.worker.nume} {self.worker.prenume} - {self.client.denumire} ({self.month:02d}/{self.year})"

    def calculate_profit(self):
        """
        Calculează profitul brut conform formulei:
        Profit = (Ore × Tarif) - (Salariu + Cazare + Masă + Transport + Concediu + Cheltuieli)
        """
        venit = self.hours_worked * self.tarif_orar
        costuri = (
            self.salary_cost +
            self.cost_cazare +
            self.cost_masa +
            self.cost_transport +
            self.cost_concediu +
            self.cheltuieli_indirecte
        )
        self.profit_brut = venit - costuri
        return self.profit_brut

    def save(self, *args, **kwargs):
        # Recalculează profitul la fiecare salvare
        self.calculate_profit()
        super().save(*args, **kwargs)


class EcoFinImportBatch(models.Model):
    """
    Batch de import Excel - pentru tracking și audit.
    """
    year = models.PositiveIntegerField()
    month = models.PositiveIntegerField()
    filename = models.CharField(max_length=255)
    total_rows = models.PositiveIntegerField(default=0)
    successful_rows = models.PositiveIntegerField(default=0)
    failed_rows = models.PositiveIntegerField(default=0)
    status = models.CharField(
        max_length=20,
        choices=[
            ('pending', 'În așteptare'),
            ('processing', 'În procesare'),
            ('preview', 'Preview'),
            ('validated', 'Validat'),
            ('failed', 'Eșuat'),
        ],
        default='pending'
    )
    error_details = models.JSONField(default=dict, blank=True)
    imported_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='ecofin_imports'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Import Eco-Fin"
        verbose_name_plural = "Importuri Eco-Fin"
        ordering = ['-created_at']

    def __str__(self):
        return f"Import {self.filename} ({self.month:02d}/{self.year}) - {self.status}"

