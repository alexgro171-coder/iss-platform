"""
Eco-Fin Serializers
"""
from rest_framework import serializers
from .models import EcoFinSettings, EcoFinMonthlyReport, EcoFinImportBatch


class EcoFinSettingsSerializer(serializers.ModelSerializer):
    """Serializer pentru setările globale Eco-Fin."""
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)
    
    class Meta:
        model = EcoFinSettings
        fields = [
            'id', 'year', 'month', 
            'cheltuieli_indirecte', 'cost_concediu',
            'created_by', 'created_by_username',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_by', 'created_at', 'updated_at']


class EcoFinMonthlyReportSerializer(serializers.ModelSerializer):
    """Serializer pentru rapoartele lunare."""
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


class EcoFinImportBatchSerializer(serializers.ModelSerializer):
    """Serializer pentru batch-uri de import."""
    imported_by_username = serializers.SerializerMethodField()
    
    class Meta:
        model = EcoFinImportBatch
        fields = [
            'id', 'year', 'month', 'filename',
            'total_rows', 'successful_rows', 'failed_rows',
            'status', 'error_details',
            'imported_by', 'imported_by_username',
            'created_at'
        ]
        read_only_fields = ['created_at']

    def get_imported_by_username(self, obj):
        return obj.imported_by.username if obj.imported_by else None


class EcoFinPreviewRowSerializer(serializers.Serializer):
    """Serializer pentru rândurile din preview (pre-validare)."""
    row_number = serializers.IntegerField()
    pasaport_nr = serializers.CharField()
    hours_worked = serializers.DecimalField(max_digits=8, decimal_places=2)
    salary_cost = serializers.DecimalField(max_digits=12, decimal_places=2)
    
    # Date găsite în sistem
    worker_found = serializers.BooleanField()
    worker_id = serializers.IntegerField(allow_null=True)
    worker_nume = serializers.CharField(allow_null=True)
    worker_prenume = serializers.CharField(allow_null=True)
    worker_cetatenie = serializers.CharField(allow_null=True)
    worker_cnp = serializers.CharField(allow_null=True)
    
    client_found = serializers.BooleanField()
    client_id = serializers.IntegerField(allow_null=True)
    client_denumire = serializers.CharField(allow_null=True)
    
    # Date din client
    tarif_orar = serializers.DecimalField(max_digits=10, decimal_places=2, allow_null=True)
    cost_cazare = serializers.DecimalField(max_digits=10, decimal_places=2, allow_null=True)
    cost_masa = serializers.DecimalField(max_digits=10, decimal_places=2, allow_null=True)
    cost_transport = serializers.DecimalField(max_digits=10, decimal_places=2, allow_null=True)
    
    # Date din setări
    cost_concediu = serializers.DecimalField(max_digits=10, decimal_places=2)
    cheltuieli_indirecte = serializers.DecimalField(max_digits=10, decimal_places=2)
    
    # Calculat
    profit_brut_estimat = serializers.DecimalField(max_digits=12, decimal_places=2)
    
    # Status și erori
    is_valid = serializers.BooleanField()
    errors = serializers.ListField(child=serializers.CharField())


class EcoFinReportSummarySerializer(serializers.Serializer):
    """Serializer pentru sumar raport."""
    total_workers = serializers.IntegerField()
    total_hours = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_salary_cost = serializers.DecimalField(max_digits=14, decimal_places=2)
    total_revenue = serializers.DecimalField(max_digits=14, decimal_places=2)
    total_costs = serializers.DecimalField(max_digits=14, decimal_places=2)
    total_profit = serializers.DecimalField(max_digits=14, decimal_places=2)
    average_profit_per_worker = serializers.DecimalField(max_digits=12, decimal_places=2)
    
    # Per client
    by_client = serializers.ListField(child=serializers.DictField())

