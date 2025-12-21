"""
Eco-Fin Serializers
Serializatori pentru modulul de profitabilitate.
"""
from rest_framework import serializers
from .models import (
    EcoFinSettings, 
    EcoFinImportedRow, 
    EcoFinProcessedRecord, 
    EcoFinImportBatch,
    EcoFinMonthlyReport  # Pentru compatibilitate
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
