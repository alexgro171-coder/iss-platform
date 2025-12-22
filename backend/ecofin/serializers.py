"""
Eco-Fin Serializers
Serializatori pentru modulul de profitabilitate și facturare.
"""
from rest_framework import serializers
from .models import (
    EcoFinSettings, 
    EcoFinImportedRow, 
    EcoFinProcessedRecord, 
    EcoFinImportBatch,
    EcoFinMonthlyReport,  # Pentru compatibilitate
    # Billing models
    BillingInvoice,
    BillingInvoiceLine,
    BillingSyncLog,
    BillingEmailLog
)


class EcoFinSettingsSerializer(serializers.ModelSerializer):
    """Serializer pentru setările globale Eco-Fin."""
    created_by_username = serializers.SerializerMethodField()
    
    class Meta:
        model = EcoFinSettings
        fields = [
            'id', 'year', 'month', 
            'cheltuieli_indirecte', 'cost_concediu',
            'is_locked',
            'created_by', 'created_by_username',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_by', 'created_at', 'updated_at']

    def get_created_by_username(self, obj):
        return obj.created_by.username if obj.created_by else None


class EcoFinImportedRowSerializer(serializers.ModelSerializer):
    """Serializer pentru rândurile importate din Excel."""
    worker_nume = serializers.CharField(source='worker.nume', read_only=True)
    worker_prenume = serializers.CharField(source='worker.prenume', read_only=True)
    client_denumire = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = EcoFinImportedRow
        fields = [
            'id', 'batch', 'row_number',
            'nr_cim', 'nume', 'prenume',
            'salariu_brut', 'ore_lucrate', 'brut1', 'net', 
            'retineri', 'rest_plata', 'cam',
            'status', 'status_display',
            'worker', 'worker_nume', 'worker_prenume',
            'client', 'client_denumire',
            'error_message',
            'year', 'month',
            'created_at'
        ]
        read_only_fields = ['created_at']

    def get_client_denumire(self, obj):
        return obj.client.denumire if obj.client else None


class EcoFinProcessedRecordSerializer(serializers.ModelSerializer):
    """Serializer pentru înregistrările procesate."""
    worker_nume = serializers.CharField(source='worker.nume', read_only=True)
    worker_prenume = serializers.CharField(source='worker.prenume', read_only=True)
    worker_pasaport = serializers.CharField(source='worker.pasaport_nr', read_only=True)
    worker_cetatenie = serializers.CharField(source='worker.cetatenie', read_only=True)
    worker_cnp = serializers.SerializerMethodField()
    client_denumire = serializers.SerializerMethodField()
    validated_by_username = serializers.SerializerMethodField()
    created_by_username = serializers.SerializerMethodField()
    
    class Meta:
        model = EcoFinProcessedRecord
        fields = [
            'id', 
            'worker', 'worker_nume', 'worker_prenume', 
            'worker_pasaport', 'worker_cetatenie', 'worker_cnp',
            'client', 'client_denumire',
            'year', 'month',
            'nr_cim', 'ore_lucrate', 
            'salariu_brut', 'cam', 'net', 'retineri', 'rest_plata',
            'cost_salarial_complet',
            'tarif_orar', 'cost_cazare', 'cost_masa', 'cost_transport',
            'cota_indirecte', 'cost_concediu',
            'cost_salariat_total', 'venit_generat', 'profitabilitate',
            'is_validated', 'validated_at', 'validated_by', 'validated_by_username',
            'created_by', 'created_by_username',
            'created_at', 'updated_at',
            'notes'
        ]
        read_only_fields = [
            'cost_salarial_complet', 'cost_salariat_total', 
            'venit_generat', 'profitabilitate',
            'validated_at', 'validated_by',
            'created_by', 'created_at', 'updated_at'
        ]

    def get_worker_cnp(self, obj):
        return obj.worker.cnp if obj.worker else None

    def get_client_denumire(self, obj):
        return obj.client.denumire if obj.client else None

    def get_validated_by_username(self, obj):
        return obj.validated_by.username if obj.validated_by else None

    def get_created_by_username(self, obj):
        return obj.created_by.username if obj.created_by else None


class EcoFinImportBatchSerializer(serializers.ModelSerializer):
    """Serializer pentru batch-uri de import."""
    imported_by_username = serializers.SerializerMethodField()
    validated_by_username = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = EcoFinImportBatch
        fields = [
            'id', 'year', 'month', 'filename',
            'total_rows', 'matched_rows', 'error_rows', 'processed_rows',
            'status', 'status_display', 'error_details',
            'imported_by', 'imported_by_username',
            'validated_by', 'validated_by_username', 'validated_at',
            'created_at'
        ]
        read_only_fields = ['created_at', 'validated_at']

    def get_imported_by_username(self, obj):
        return obj.imported_by.username if obj.imported_by else None

    def get_validated_by_username(self, obj):
        return obj.validated_by.username if obj.validated_by else None


class EcoFinPreviewRowSerializer(serializers.Serializer):
    """Serializer pentru rândurile din preview (înainte de procesare)."""
    row_number = serializers.IntegerField()
    nr_cim = serializers.CharField()
    nume = serializers.CharField(allow_blank=True)
    prenume = serializers.CharField(allow_blank=True)
    salariu_brut = serializers.DecimalField(max_digits=12, decimal_places=2)
    ore_lucrate = serializers.DecimalField(max_digits=8, decimal_places=2)
    brut1 = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, default=0)
    net = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, default=0)
    retineri = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, default=0)
    rest_plata = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, default=0)
    cam = serializers.DecimalField(max_digits=12, decimal_places=2)
    
    # Rezultat identificare
    is_matched = serializers.BooleanField()
    worker_id = serializers.IntegerField(allow_null=True)
    worker_nume = serializers.CharField(allow_null=True)
    worker_prenume = serializers.CharField(allow_null=True)
    worker_nume_match = serializers.BooleanField(default=False)  # True dacă numele coincide
    
    client_id = serializers.IntegerField(allow_null=True)
    client_denumire = serializers.CharField(allow_null=True)
    
    # Date din client pentru calcul
    tarif_orar = serializers.DecimalField(max_digits=10, decimal_places=2, allow_null=True)
    cost_cazare = serializers.DecimalField(max_digits=10, decimal_places=2, allow_null=True)
    cost_masa = serializers.DecimalField(max_digits=10, decimal_places=2, allow_null=True)
    cost_transport = serializers.DecimalField(max_digits=10, decimal_places=2, allow_null=True)
    
    # Calcule estimate
    cost_salarial_complet = serializers.DecimalField(max_digits=12, decimal_places=2)
    cota_indirecte = serializers.DecimalField(max_digits=10, decimal_places=2)
    cost_concediu = serializers.DecimalField(max_digits=10, decimal_places=2)
    cost_salariat_total = serializers.DecimalField(max_digits=12, decimal_places=2)
    venit_estimat = serializers.DecimalField(max_digits=12, decimal_places=2)
    profitabilitate_estimata = serializers.DecimalField(max_digits=12, decimal_places=2)
    
    # Status și erori
    is_valid = serializers.BooleanField()
    errors = serializers.ListField(child=serializers.CharField())
    warnings = serializers.ListField(child=serializers.CharField(), required=False, default=list)


class EcoFinReportSummarySerializer(serializers.Serializer):
    """Serializer pentru sumar raport."""
    total_workers = serializers.IntegerField()
    total_hours = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_venit = serializers.DecimalField(max_digits=14, decimal_places=2)
    total_costs = serializers.DecimalField(max_digits=14, decimal_places=2)
    total_profit = serializers.DecimalField(max_digits=14, decimal_places=2)
    average_profit_per_worker = serializers.DecimalField(max_digits=12, decimal_places=2)
    profit_margin_percent = serializers.DecimalField(max_digits=5, decimal_places=2)
    
    # Per client (pentru grafic PIE)
    by_client = serializers.ListField(child=serializers.DictField())


class EcoFinClientReportSerializer(serializers.Serializer):
    """Serializer pentru raport pe client."""
    client_id = serializers.IntegerField()
    client_denumire = serializers.CharField()
    workers_count = serializers.IntegerField()
    total_hours = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_venit = serializers.DecimalField(max_digits=14, decimal_places=2)
    total_costs = serializers.DecimalField(max_digits=14, decimal_places=2)
    total_profit = serializers.DecimalField(max_digits=14, decimal_places=2)
    profit_margin_percent = serializers.DecimalField(max_digits=5, decimal_places=2)
    profit_share_percent = serializers.DecimalField(max_digits=5, decimal_places=2)  # % din profitul total


# ==========================================
# COMPATIBILITATE CU VECHIUL MODEL
# ==========================================

class EcoFinMonthlyReportSerializer(serializers.ModelSerializer):
    """[DEPRECIAT] Serializer pentru rapoartele lunare vechi."""
    worker_nume = serializers.CharField(source='worker.nume', read_only=True)
    worker_prenume = serializers.CharField(source='worker.prenume', read_only=True)
    worker_pasaport = serializers.CharField(source='worker.pasaport_nr', read_only=True)
    worker_cetatenie = serializers.CharField(source='worker.cetatenie', read_only=True)
    worker_cnp = serializers.CharField(source='worker.cnp', read_only=True)
    client_denumire = serializers.CharField(source='client.denumire', read_only=True)
    validated_by_username = serializers.SerializerMethodField()
    created_by_username = serializers.SerializerMethodField()
    
    class Meta:
        model = EcoFinMonthlyReport
        fields = [
            'id', 'worker', 'worker_nume', 'worker_prenume', 
            'worker_pasaport', 'worker_cetatenie', 'worker_cnp',
            'client', 'client_denumire',
            'year', 'month',
            'hours_worked', 'salary_cost',
            'tarif_orar', 'cost_cazare', 'cost_masa', 'cost_transport',
            'cost_concediu', 'cheltuieli_indirecte',
            'profit_brut',
            'is_validated', 'validated_at', 'validated_by', 'validated_by_username',
            'created_by', 'created_by_username',
            'created_at', 'updated_at',
            'notes'
        ]
        read_only_fields = [
            'profit_brut', 'validated_at', 'validated_by',
            'created_by', 'created_at', 'updated_at'
        ]

    def get_validated_by_username(self, obj):
        return obj.validated_by.username if obj.validated_by else None

    def get_created_by_username(self, obj):
        return obj.created_by.username if obj.created_by else None


# ==========================================
# BILLING SERIALIZERS
# ==========================================

class BillingInvoiceLineSerializer(serializers.ModelSerializer):
    """Serializer pentru linii de factură."""
    line_type_display = serializers.CharField(source='get_line_type_display', read_only=True)
    
    class Meta:
        model = BillingInvoiceLine
        fields = [
            'id', 'invoice', 'description', 
            'quantity', 'unit_price', 'vat_rate',
            'line_total', 'line_vat',
            'line_type', 'line_type_display'
        ]
        read_only_fields = ['line_total', 'line_vat']


class BillingInvoiceSerializer(serializers.ModelSerializer):
    """Serializer pentru facturi."""
    client_denumire = serializers.SerializerMethodField()
    client_cif = serializers.SerializerMethodField()
    invoice_number_display = serializers.ReadOnlyField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    payment_status_display = serializers.CharField(source='get_payment_status_display', read_only=True)
    lines = BillingInvoiceLineSerializer(many=True, read_only=True)
    created_by_username = serializers.SerializerMethodField()
    
    class Meta:
        model = BillingInvoice
        fields = [
            'id', 'client', 'client_denumire', 'client_cif',
            'year', 'month',
            'smartbill_document_id', 'smartbill_series', 'smartbill_number',
            'invoice_number_display',
            'issue_date',
            'subtotal', 'vat_total', 'total', 'currency',
            'hours_billed', 'hourly_rate',
            'status', 'status_display',
            'payment_status', 'payment_status_display',
            'paid_amount', 'due_amount',
            'last_payment_sync_at',
            'pdf_path',
            'created_by', 'created_by_username',
            'created_at', 'updated_at',
            'last_email_sent_at', 'email_sent_to', 'email_sent_count',
            'lines'
        ]
        read_only_fields = [
            'smartbill_document_id', 'smartbill_series', 'smartbill_number',
            'due_amount', 'payment_status',
            'pdf_path', 'created_by', 'created_at', 'updated_at',
            'last_email_sent_at', 'email_sent_to', 'email_sent_count'
        ]

    def get_client_denumire(self, obj):
        return obj.client.denumire if obj.client else None

    def get_client_cif(self, obj):
        return obj.client.cif if obj.client else None

    def get_created_by_username(self, obj):
        return obj.created_by.username if obj.created_by else None


class BillingInvoiceListSerializer(serializers.ModelSerializer):
    """Serializer simplificat pentru lista de facturi."""
    client_denumire = serializers.SerializerMethodField()
    invoice_number_display = serializers.ReadOnlyField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    payment_status_display = serializers.CharField(source='get_payment_status_display', read_only=True)
    
    class Meta:
        model = BillingInvoice
        fields = [
            'id', 'client', 'client_denumire',
            'year', 'month',
            'smartbill_series', 'smartbill_number', 'invoice_number_display',
            'issue_date',
            'subtotal', 'vat_total', 'total',
            'status', 'status_display',
            'payment_status', 'payment_status_display',
            'paid_amount', 'due_amount',
            'pdf_path',
            'created_at'
        ]

    def get_client_denumire(self, obj):
        return obj.client.denumire if obj.client else None


class BillingSyncLogSerializer(serializers.ModelSerializer):
    """Serializer pentru log-uri de sincronizare."""
    user_username = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = BillingSyncLog
        fields = [
            'id',
            'sync_started_at', 'sync_finished_at',
            'requested_from_ts', 'requested_to_ts',
            'user', 'user_username',
            'status', 'status_display',
            'result_counts', 'error_message'
        ]

    def get_user_username(self, obj):
        return obj.user.username if obj.user else None


class BillingEmailLogSerializer(serializers.ModelSerializer):
    """Serializer pentru log-uri de email."""
    sent_by_username = serializers.SerializerMethodField()
    invoice_number = serializers.SerializerMethodField()
    
    class Meta:
        model = BillingEmailLog
        fields = [
            'id', 'invoice', 'invoice_number',
            'sent_at', 'sent_by', 'sent_by_username',
            'sent_to', 'subject',
            'status', 'error_message'
        ]

    def get_sent_by_username(self, obj):
        return obj.sent_by.username if obj.sent_by else None

    def get_invoice_number(self, obj):
        return obj.invoice.invoice_number_display if obj.invoice else None


# ==========================================
# REQUEST/RESPONSE SERIALIZERS
# ==========================================

class IssueInvoiceRequestSerializer(serializers.Serializer):
    """Serializer pentru cererea de emitere factură."""
    client_id = serializers.IntegerField()
    year = serializers.IntegerField(min_value=2020, max_value=2100)
    month = serializers.IntegerField(min_value=1, max_value=12)
    confirm_hours_agreed = serializers.BooleanField()
    mode = serializers.ChoiceField(
        choices=['standard', 'difference', 'extra_services'],
        default='standard'
    )
    extra_lines = serializers.ListField(
        child=serializers.DictField(),
        required=False,
        default=list
    )
    issue_difference = serializers.BooleanField(required=False, default=False)


class InvoicePreviewSerializer(serializers.Serializer):
    """Serializer pentru preview factură înainte de emitere."""
    client_id = serializers.IntegerField()
    client_name = serializers.CharField()
    year = serializers.IntegerField()
    month = serializers.IntegerField()
    month_name = serializers.CharField()
    
    # Date calculate
    total_hours = serializers.DecimalField(max_digits=10, decimal_places=2)
    hourly_rate = serializers.DecimalField(max_digits=10, decimal_places=2)
    
    # Linii factură
    lines = serializers.ListField(child=serializers.DictField())
    
    # Totaluri
    subtotal = serializers.DecimalField(max_digits=12, decimal_places=2)
    vat_rate = serializers.DecimalField(max_digits=5, decimal_places=2)
    vat_total = serializers.DecimalField(max_digits=12, decimal_places=2)
    total = serializers.DecimalField(max_digits=12, decimal_places=2)
    
    # Facturi existente pentru aceeași lună
    existing_invoices = serializers.ListField(child=serializers.DictField())
    already_billed_amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    
    # Avertismente/info
    warnings = serializers.ListField(child=serializers.CharField())


class SyncPaymentsResponseSerializer(serializers.Serializer):
    """Serializer pentru răspunsul sincronizării plăților."""
    success = serializers.BooleanField()
    sync_log_id = serializers.IntegerField()
    invoices_updated = serializers.IntegerField()
    payments_found = serializers.IntegerField()
    errors = serializers.ListField(child=serializers.CharField())
    message = serializers.CharField()


class SendEmailRequestSerializer(serializers.Serializer):
    """Serializer pentru cererea de trimitere email."""
    email_to = serializers.EmailField(required=False)  # Opțional, default din client


class BillingReportFilterSerializer(serializers.Serializer):
    """Serializer pentru filtrele de raport facturare."""
    year = serializers.IntegerField(required=False)
    month = serializers.IntegerField(required=False, min_value=1, max_value=12)
    client_id = serializers.IntegerField(required=False)
    payment_status = serializers.ChoiceField(
        choices=['all', 'unpaid', 'partial', 'paid'],
        required=False,
        default='all'
    )
    last_months = serializers.IntegerField(required=False, min_value=1, max_value=12)
