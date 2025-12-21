"""
Eco-Fin Microservice Models
Modul pentru evaluarea profitabilității lucrătorilor.

Conform specificațiilor:
- EcoFinSettings: setări globale lunare
- EcoFinImportedRow: date brute din Excel (status RAW)
- EcoFinProcessedRecord: date procesate și calculate
- EcoFinImportBatch: tracking importuri
"""
from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator, MaxValueValidator
from decimal import Decimal


class EcoFinSettings(models.Model):
    """
    Setări globale lunare pentru Eco-Fin.
    - Cheltuieli indirecte: se împart la toți lucrătorii activi
    - Cost concediu: cost fix per lucrător
    Pot fi modificate doar înainte de validare.
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
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Cheltuieli indirecte lunare totale (se împart la nr. lucrători activi)"
    )
    cost_concediu = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Cost concediu per lucrător"
    )
    is_locked = models.BooleanField(
        default=False,
        help_text="True = luna validată, setările nu mai pot fi modificate"
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
        status = "🔒" if self.is_locked else "📝"
        return f"{status} Setări {self.month:02d}/{self.year}"


class EcoFinImportedRow(models.Model):
    """
    Date brute încărcate din Excel.
    Stochează exact ce vine din fișierul Excel înainte de procesare.
    """
    class Status(models.TextChoices):
        RAW = 'raw', 'Brut (neprocesat)'
        MATCHED = 'matched', 'Identificat'
        ERROR = 'error', 'Eroare identificare'
        PROCESSED = 'processed', 'Procesat'

    # Legătură la batch
    batch = models.ForeignKey(
        'EcoFinImportBatch',
        on_delete=models.CASCADE,
        related_name='rows'
    )
    row_number = models.PositiveIntegerField(help_text="Numărul rândului din Excel")
    
    # Date din Excel (exact cum vin)
    nr_cim = models.CharField(max_length=50, help_text="Număr CIM din Excel")
    nume = models.CharField(max_length=100, blank=True, help_text="Nume din Excel")
    prenume = models.CharField(max_length=100, blank=True, help_text="Prenume din Excel")
    salariu_brut = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal('0.00'),
        help_text="Salariu brut din Excel"
    )
    ore_lucrate = models.DecimalField(
        max_digits=8, decimal_places=2, default=Decimal('0.00'),
        help_text="Ore lucrate din Excel"
    )
    brut1 = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal('0.00'),
        help_text="Brut1 din Excel"
    )
    net = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal('0.00'),
        help_text="Salariu net din Excel"
    )
    retineri = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal('0.00'),
        help_text="Rețineri din Excel"
    )
    rest_plata = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal('0.00'),
        help_text="Rest de plată din Excel"
    )
    cam = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal('0.00'),
        help_text="Contribuție asigurări muncă (CAM) din Excel"
    )
    
    # Rezultat identificare
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.RAW
    )
    worker = models.ForeignKey(
        'iss.Worker',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='ecofin_imported_rows'
    )
    client = models.ForeignKey(
        'iss.Client',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='ecofin_imported_rows'
    )
    error_message = models.TextField(blank=True, help_text="Mesaj eroare la identificare")
    
    # Perioadă (din batch)
    year = models.PositiveIntegerField()
    month = models.PositiveIntegerField()
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Rând Importat Eco-Fin"
        verbose_name_plural = "Rânduri Importate Eco-Fin"
        ordering = ['batch', 'row_number']

    def __str__(self):
        return f"Row {self.row_number}: {self.nr_cim} - {self.nume} {self.prenume}"


class EcoFinProcessedRecord(models.Model):
    """
    Date procesate și calculate.
    După validare, devine READ-ONLY (doar Admin poate modifica).
    
    Formula profitabilitate:
    1. cost_salarial_complet = salariu_brut + cam
    2. cota_indirecte = cheltuieli_indirecte / nr_salariati_activi
    3. cost_salariat_total = cost_salarial_complet + cazare + masa + transport + cota_indirecte + cost_concediu
    4. profitabilitate = (ore_lucrate * tarif_orar) - cost_salariat_total
    """
    # Legături
    imported_row = models.OneToOneField(
        EcoFinImportedRow,
        on_delete=models.CASCADE,
        related_name='processed_record',
        null=True,
        blank=True,
        help_text="Legătură la rândul importat original"
    )
    worker = models.ForeignKey(
        'iss.Worker',
        on_delete=models.CASCADE,
        related_name='ecofin_processed_records'
    )
    client = models.ForeignKey(
        'iss.Client',
        on_delete=models.CASCADE,
        related_name='ecofin_processed_records'
    )
    
    # Perioadă
    year = models.PositiveIntegerField(
        validators=[MinValueValidator(2020), MaxValueValidator(2100)]
    )
    month = models.PositiveIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(12)]
    )
    
    # Date din import Excel (copiate pentru istoric)
    nr_cim = models.CharField(max_length=50, help_text="Nr CIM la momentul procesării")
    ore_lucrate = models.DecimalField(
        max_digits=8, decimal_places=2, default=Decimal('0.00'),
        help_text="Ore lucrate în luna respectivă"
    )
    salariu_brut = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal('0.00'),
        help_text="Salariu brut din Excel"
    )
    cam = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal('0.00'),
        help_text="Contribuție asigurări muncă (CAM)"
    )
    net = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal('0.00'),
        help_text="Salariu net"
    )
    retineri = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal('0.00'),
        help_text="Rețineri"
    )
    rest_plata = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal('0.00'),
        help_text="Rest de plată"
    )
    
    # Calcul intermediar: Cost salarial complet = brut + CAM
    cost_salarial_complet = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal('0.00'),
        help_text="Cost salarial complet = salariu_brut + cam"
    )
    
    # Date din Client (copiate la momentul procesării pentru istoric)
    tarif_orar = models.DecimalField(
        max_digits=10, decimal_places=2, default=Decimal('0.00'),
        help_text="Tarif orar (copiat din Client)"
    )
    cost_cazare = models.DecimalField(
        max_digits=10, decimal_places=2, default=Decimal('0.00'),
        help_text="Cost cazare lunar (copiat din Client)"
    )
    cost_masa = models.DecimalField(
        max_digits=10, decimal_places=2, default=Decimal('0.00'),
        help_text="Cost masă lunar (copiat din Client)"
    )
    cost_transport = models.DecimalField(
        max_digits=10, decimal_places=2, default=Decimal('0.00'),
        help_text="Cost transport lunar (copiat din Client)"
    )
    
    # Date din setări globale (copiate la momentul procesării)
    cota_indirecte = models.DecimalField(
        max_digits=10, decimal_places=2, default=Decimal('0.00'),
        help_text="Cota cheltuieli indirecte = total_indirecte / nr_salariati"
    )
    cost_concediu = models.DecimalField(
        max_digits=10, decimal_places=2, default=Decimal('0.00'),
        help_text="Cost concediu per lucrător (din setări globale)"
    )
    
    # Rezultate calculate
    cost_salariat_total = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal('0.00'),
        help_text="Cost total = salarial_complet + cazare + masa + transport + indirecte + concediu"
    )
    venit_generat = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal('0.00'),
        help_text="Venit = ore_lucrate × tarif_orar"
    )
    profitabilitate = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal('0.00'),
        help_text="Profitabilitate = venit_generat - cost_salariat_total"
    )
    
    # Status validare
    is_validated = models.BooleanField(
        default=False,
        help_text="True = înregistrare validată și înghețată"
    )
    validated_at = models.DateTimeField(null=True, blank=True)
    validated_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='ecofin_validated_records'
    )
    
    # Audit
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='ecofin_records_created'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Note/observații
    notes = models.TextField(blank=True, help_text="Observații")

    class Meta:
        verbose_name = "Înregistrare Procesată Eco-Fin"
        verbose_name_plural = "Înregistrări Procesate Eco-Fin"
        ordering = ['-year', '-month', 'worker__nume']
        # Un lucrător poate avea o singură înregistrare per lună/client
        unique_together = ['worker', 'client', 'year', 'month']

    def __str__(self):
        status = "✓" if self.is_validated else "○"
        return f"{status} {self.worker.nume} {self.worker.prenume} - {self.client.denumire} ({self.month:02d}/{self.year})"

    def calculate_costs_and_profit(self):
        """
        Calculează toate costurile și profitabilitatea conform formulei:
        
        1. cost_salarial_complet = salariu_brut + cam
        2. cost_salariat_total = cost_salarial_complet + cazare + masa + transport + cota_indirecte + cost_concediu
        3. venit_generat = ore_lucrate × tarif_orar
        4. profitabilitate = venit_generat - cost_salariat_total
        """
        # 1. Cost salarial complet
        self.cost_salarial_complet = self.salariu_brut + self.cam
        
        # 2. Cost salariat total
        self.cost_salariat_total = (
            self.cost_salarial_complet +
            self.cost_cazare +
            self.cost_masa +
            self.cost_transport +
            self.cota_indirecte +
            self.cost_concediu
        )
        
        # 3. Venit generat
        self.venit_generat = self.ore_lucrate * self.tarif_orar
        
        # 4. Profitabilitate
        self.profitabilitate = self.venit_generat - self.cost_salariat_total
        
        return self.profitabilitate

    def save(self, *args, **kwargs):
        # Recalculează la fiecare salvare (dacă nu e validat)
        if not self.is_validated:
            self.calculate_costs_and_profit()
        super().save(*args, **kwargs)


class EcoFinImportBatch(models.Model):
    """
    Batch de import Excel - pentru tracking și audit.
    Un batch conține multiple EcoFinImportedRow.
    """
    class Status(models.TextChoices):
        PENDING = 'pending', 'În așteptare'
        PROCESSING = 'processing', 'În procesare'
        PREVIEW = 'preview', 'Preview (așteptare validare)'
        VALIDATED = 'validated', 'Validat și procesat'
        FAILED = 'failed', 'Eșuat'
        CANCELLED = 'cancelled', 'Anulat'

    year = models.PositiveIntegerField()
    month = models.PositiveIntegerField()
    filename = models.CharField(max_length=255)
    file = models.FileField(
        upload_to='ecofin/imports/%Y/%m/',
        null=True,
        blank=True,
        help_text="Fișierul Excel original"
    )
    
    # Statistici
    total_rows = models.PositiveIntegerField(default=0)
    matched_rows = models.PositiveIntegerField(default=0, help_text="Rânduri cu lucrător identificat")
    error_rows = models.PositiveIntegerField(default=0, help_text="Rânduri cu erori")
    processed_rows = models.PositiveIntegerField(default=0, help_text="Rânduri procesate în înregistrări")
    
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING
    )
    error_details = models.JSONField(default=dict, blank=True)
    
    # Audit
    imported_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='ecofin_imports'
    )
    validated_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='ecofin_imports_validated'
    )
    validated_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Import Eco-Fin"
        verbose_name_plural = "Importuri Eco-Fin"
        ordering = ['-created_at']

    def __str__(self):
        return f"Import {self.filename} ({self.month:02d}/{self.year}) - {self.get_status_display()}"


# Păstrăm și modelul vechi pentru compatibilitate în perioada de tranziție
class EcoFinMonthlyReport(models.Model):
    """
    [DEPRECIAT] - Folosiți EcoFinProcessedRecord
    Păstrat pentru compatibilitate cu datele existente.
    """
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
    year = models.PositiveIntegerField(
        validators=[MinValueValidator(2020), MaxValueValidator(2100)]
    )
    month = models.PositiveIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(12)]
    )
    hours_worked = models.DecimalField(
        max_digits=8, decimal_places=2, default=Decimal('0.00')
    )
    salary_cost = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal('0.00')
    )
    tarif_orar = models.DecimalField(
        max_digits=10, decimal_places=2, default=Decimal('0.00')
    )
    cost_cazare = models.DecimalField(
        max_digits=10, decimal_places=2, default=Decimal('0.00')
    )
    cost_masa = models.DecimalField(
        max_digits=10, decimal_places=2, default=Decimal('0.00')
    )
    cost_transport = models.DecimalField(
        max_digits=10, decimal_places=2, default=Decimal('0.00')
    )
    cost_concediu = models.DecimalField(
        max_digits=10, decimal_places=2, default=Decimal('0.00')
    )
    cheltuieli_indirecte = models.DecimalField(
        max_digits=10, decimal_places=2, default=Decimal('0.00')
    )
    profit_brut = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal('0.00')
    )
    is_validated = models.BooleanField(default=False)
    validated_at = models.DateTimeField(null=True, blank=True)
    validated_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='ecofin_validated'
    )
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name='ecofin_reports_created'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    notes = models.TextField(blank=True)

    class Meta:
        verbose_name = "[Depreciat] Raport Eco-Fin"
        verbose_name_plural = "[Depreciat] Rapoarte Eco-Fin"
        ordering = ['-year', '-month', 'worker__nume']

    def __str__(self):
        return f"[OLD] {self.worker.nume} - {self.client.denumire} ({self.month:02d}/{self.year})"

    def calculate_profit(self):
        venit = self.hours_worked * self.tarif_orar
        costuri = (
            self.salary_cost + self.cost_cazare + self.cost_masa +
            self.cost_transport + self.cost_concediu + self.cheltuieli_indirecte
        )
        self.profit_brut = venit - costuri
        return self.profit_brut

    def save(self, *args, **kwargs):
        self.calculate_profit()
        super().save(*args, **kwargs)
