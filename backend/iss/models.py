from django.db import models
from django.contrib.auth.models import User


def worker_document_path(instance, filename):
    """Generează calea pentru documentele unui worker: documents/worker_{id}/{filename}"""
    return f'documents/worker_{instance.worker.id}/{filename}'


class UserRole(models.TextChoices):
    AGENT = "Agent", "Agent"
    EXPERT = "Expert", "Expert"
    MANAGEMENT = "Management", "Management"
    ADMIN = "Admin", "Admin"


class UserProfile(models.Model):
    """
    Profil pentru utilizatorii existenți (User),
    în care stocăm rolul: Agent / Expert / Management / Admin.
    """

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    role = models.CharField(max_length=20, choices=UserRole.choices, default=UserRole.AGENT)
    telefon = models.CharField(max_length=20, blank=True)  # Câmp nou pentru număr de telefon

    def __str__(self):
        return f"{self.user.username} ({self.role})"


class Client(models.Model):
    denumire = models.CharField(max_length=255)
    tara = models.CharField(max_length=50, blank=True)
    oras = models.CharField(max_length=50, blank=True)
    judet = models.CharField(max_length=50, blank=True)
    adresa = models.CharField(max_length=255, blank=True)
    cod_fiscal = models.CharField(max_length=50, blank=True)

    tarif_orar = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    nr_ore_minim = models.IntegerField(default=0)

    cazare_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    masa_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    transport_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    def __str__(self):
        return self.denumire


class WorkerStatus(models.TextChoices):
    AVIZ_SOLICITAT = "Aviz solicitat", "Aviz solicitat"
    AVIZ_EMIS = "Aviz emis", "Aviz emis"
    VIZA_SOLICITATA = "Viza solicitata", "Viza solicitată"
    VIZA_OBTINUTA = "Viza obtinuta", "Viza obținută"
    VIZA_RESPINSA = "Viza respinsa", "Viza respinsă"
    VIZA_REDEPUSA = "Viza redepusa", "Viza redepusă"
    CANDIDAT_RETRAS = "Candidat retras", "Candidat retras"
    SOSIT_CU_CIM = "Sosit cu CIM semnat", "Sosit cu CIM semnat"
    PS_SOLICITAT = "Permis de sedere solicitat", "Permis de ședere solicitat"
    PS_EMIS = "Permis de sedere emis", "Permis de ședere emis"
    ACTIV = "Activ", "Activ"
    SUSPENDAT = "Suspendat", "Suspendat"
    INACTIV = "Inactiv", "Inactiv"


class Worker(models.Model):
    # Date personale
    nume = models.CharField(max_length=50)
    prenume = models.CharField(max_length=50)
    cetatenie = models.CharField(max_length=50, blank=True)
    stare_civila = models.CharField(
        max_length=2,
        choices=[("M", "M"), ("NM", "NM")],
        blank=True,
    )
    copii_intretinere = models.SmallIntegerField(default=0)
    sex = models.CharField(
        max_length=1,
        choices=[("M", "M"), ("F", "F")],
        blank=True,
    )
    data_nasterii = models.DateField(null=True, blank=True)

    # Pașaport
    pasaport_nr = models.CharField(max_length=20, unique=True)
    data_emitere_pass = models.DateField(null=True, blank=True)
    data_exp_pass = models.DateField(null=True, blank=True)

    oras_domiciliu = models.CharField(max_length=100, blank=True)

    # Meta
    data_introducere = models.DateTimeField(auto_now_add=True)
    cod_cor = models.CharField(max_length=10, blank=True)

    # Agentul care a introdus candidatul
    agent = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="workers_introdusi",
    )

    # Expert/Manager responsabil pentru acest lucrător
    expert = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="workers_asignati",
        help_text="Expert/Manager care primește notificările pentru acest lucrător",
    )

    # WP / IGI
    dosar_wp_nr = models.CharField(max_length=50, blank=True)
    data_solicitare_wp = models.DateField(null=True, blank=True)
    data_programare_wp = models.DateField(null=True, blank=True)
    judet_wp = models.CharField(max_length=50, blank=True)

    # Viză
    data_solicitare_viza = models.DateField(null=True, blank=True)
    data_programare_interviu = models.DateField(null=True, blank=True)

    status = models.CharField(
        max_length=40,
        choices=WorkerStatus.choices,
        default=WorkerStatus.AVIZ_SOLICITAT,
    )

    # Permis de ședere
    data_depunere_ps = models.DateField(null=True, blank=True)
    data_programare_ps = models.DateField(null=True, blank=True)

    # După sosire în RO
    cnp = models.CharField(max_length=13, blank=True)
    data_intrare_ro = models.DateField(null=True, blank=True)
    cim_nr = models.CharField(max_length=50, blank=True)
    data_emitere_cim = models.DateField(null=True, blank=True)
    data_emitere_ps = models.DateField(null=True, blank=True)
    data_expirare_ps = models.DateField(null=True, blank=True)
    adresa_ro = models.CharField(max_length=255, blank=True)

    client = models.ForeignKey(
        Client,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="workers",
    )

    observatii = models.TextField(blank=True)

    # Path către folderul de documente (vom lega ulterior la storage S3/MinIO)
    folder_doc = models.CharField(max_length=255, blank=True)

    def __str__(self):
        return f"{self.nume} {self.prenume} ({self.pasaport_nr})"


class DocumentType(models.TextChoices):
    PASAPORT = "pasaport", "Pașaport"
    VIZA = "viza", "Viză"
    AVIZ_IGI = "aviz_igi", "Aviz IGI"
    CIM = "cim", "Contract Individual de Muncă"
    PERMIS_SEDERE = "permis_sedere", "Permis de Ședere"
    CERTIFICAT_MEDICAL = "certificat_medical", "Certificat Medical"
    CAZIER = "cazier", "Cazier Judiciar"
    DIPLOMA = "diploma", "Diplomă/Certificat Studii"
    CV = "cv", "CV"
    FOTO = "foto", "Fotografie"
    CONTRACT_CAZARE = "contract_cazare", "Contract Cazare"
    ALTELE = "altele", "Alte Documente"


class WorkerDocument(models.Model):
    """Documente atașate unui lucrător"""
    worker = models.ForeignKey(
        Worker,
        on_delete=models.CASCADE,
        related_name="documents",
    )
    document_type = models.CharField(
        max_length=30,
        choices=DocumentType.choices,
        default=DocumentType.ALTELE,
    )
    file = models.FileField(upload_to=worker_document_path)
    original_filename = models.CharField(max_length=255)
    description = models.CharField(max_length=255, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    uploaded_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name="uploaded_documents",
    )
    file_size = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["-uploaded_at"]

    def __str__(self):
        return f"{self.get_document_type_display()} - {self.original_filename}"


class LogType(models.TextChoices):
    SYSTEM = "SYSTEM", "Sistem"
    AUTH = "AUTH", "Autentificare"
    ACTIVITY = "ACTIVITY", "Activitate"


class LogAction(models.TextChoices):
    LOGIN = "LOGIN", "Login"
    LOGOUT = "LOGOUT", "Logout"
    LOGIN_FAILED = "LOGIN_FAILED", "Login eșuat"
    CREATE = "CREATE", "Creare"
    UPDATE = "UPDATE", "Modificare"
    DELETE = "DELETE", "Ștergere"
    STATUS_CHANGE = "STATUS_CHANGE", "Schimbare status"
    UPLOAD = "UPLOAD", "Upload document"
    DOWNLOAD = "DOWNLOAD", "Download document"
    BULK_IMPORT = "BULK_IMPORT", "Import bulk"
    EXPORT = "EXPORT", "Export date"
    ERROR = "ERROR", "Eroare"
    WARNING = "WARNING", "Avertizare"
    INFO = "INFO", "Informație"


class ActivityLog(models.Model):
    """Jurnal de activități pentru audit"""
    log_type = models.CharField(
        max_length=20,
        choices=LogType.choices,
        default=LogType.ACTIVITY,
        db_index=True,
    )
    action = models.CharField(
        max_length=20,
        choices=LogAction.choices,
        db_index=True,
    )
    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="activity_logs",
    )
    username = models.CharField(max_length=150, blank=True)
    target_model = models.CharField(max_length=50, blank=True, db_index=True)
    target_id = models.PositiveIntegerField(null=True, blank=True)
    target_repr = models.CharField(max_length=255, blank=True)
    details = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=500, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        verbose_name = "Log Activitate"
        verbose_name_plural = "Loguri Activitate"
        ordering = ["-timestamp"]
        indexes = [
            models.Index(fields=["-timestamp", "log_type"]),
            models.Index(fields=["user", "-timestamp"]),
            models.Index(fields=["target_model", "target_id"]),
        ]

    def __str__(self):
        return f"{self.timestamp} - {self.action} - {self.username}"

    @classmethod
    def log(cls, log_type, action, user=None, target=None, details=None, request=None):
        """
        Metodă helper pentru crearea rapidă a log-urilor.
        
        Args:
            log_type: LogType (SYSTEM, AUTH, ACTIVITY)
            action: LogAction (LOGIN, CREATE, UPDATE, etc.)
            user: User object (opțional)
            target: Obiectul țintă pentru acțiune (opțional)
            details: Dict cu detalii suplimentare (opțional)
            request: HTTP request pentru extragerea IP și user agent (opțional)
        """
        log_entry = cls(
            log_type=log_type,
            action=action,
            details=details or {},
        )
        
        # Setăm user-ul
        if user:
            log_entry.user = user
            log_entry.username = user.username
        
        # Setăm target-ul (obiectul afectat)
        if target:
            log_entry.target_model = target.__class__.__name__
            log_entry.target_id = target.pk
            log_entry.target_repr = str(target)[:255]
        
        # Extragem info din request
        if request:
            # IP Address
            x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
            if x_forwarded_for:
                log_entry.ip_address = x_forwarded_for.split(',')[0].strip()
            else:
                log_entry.ip_address = request.META.get('REMOTE_ADDR')
            
            # User Agent
            log_entry.user_agent = request.META.get('HTTP_USER_AGENT', '')[:500]
        
        log_entry.save()
        return log_entry

