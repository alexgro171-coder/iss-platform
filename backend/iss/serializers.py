from rest_framework import serializers
from django.contrib.auth.models import User
from .models import (
    Client, Worker, UserProfile, WorkerDocument, CodCOR,
    TemplateDocument, GeneratedDocument, TemplateType, Ambasada
)


class UserProfileSerializer(serializers.ModelSerializer):
    """Serializer pentru profilul utilizatorului."""
    class Meta:
        model = UserProfile
        fields = ["role", "telefon"]


class CurrentUserSerializer(serializers.ModelSerializer):
    """
    Serializer pentru informațiile utilizatorului curent.
    Folosit la endpoint-ul /api/me/
    """
    role = serializers.CharField(source="profile.role", read_only=True)
    telefon = serializers.CharField(source="profile.telefon", read_only=True)
    
    class Meta:
        model = User
        fields = ["id", "username", "email", "first_name", "last_name", "role", "telefon"]


class ClientSerializer(serializers.ModelSerializer):
    class Meta:
        model = Client
        fields = "__all__"


class CodCORSerializer(serializers.ModelSerializer):
    """Serializer pentru nomenclatorul Coduri COR."""
    class Meta:
        model = CodCOR
        fields = ['id', 'cod', 'denumire_ro', 'denumire_en', 'activ', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']


class AmbasadaSerializer(serializers.ModelSerializer):
    """Serializer pentru nomenclatorul Ambasade."""
    class Meta:
        model = Ambasada
        fields = ['id', 'denumire', 'tara', 'oras', 'activ', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']


class WorkerDocumentSerializer(serializers.ModelSerializer):
    """Serializer pentru documentele lucrătorilor."""
    document_type_display = serializers.CharField(source='get_document_type_display', read_only=True)
    uploaded_by_username = serializers.SerializerMethodField()
    
    class Meta:
        model = WorkerDocument
        fields = [
            'id', 'worker', 'document_type', 'document_type_display',
            'file', 'original_filename', 'description', 'uploaded_at',
            'uploaded_by', 'uploaded_by_username', 'file_size'
        ]
        read_only_fields = ('uploaded_at', 'uploaded_by', 'file_size', 'original_filename')

    def get_uploaded_by_username(self, obj):
        """Returnează username-ul sau None dacă uploaded_by este null."""
        return obj.uploaded_by.username if obj.uploaded_by else None


class WorkerSerializer(serializers.ModelSerializer):
    client_denumire = serializers.SerializerMethodField()
    documents = WorkerDocumentSerializer(many=True, read_only=True)
    
    # Informații CodCOR pentru afișare
    cod_cor_denumire_ro = serializers.SerializerMethodField()
    cod_cor_denumire_en = serializers.SerializerMethodField()
    
    # Informații Ambasadă pentru afișare
    ambasada_denumire = serializers.SerializerMethodField()

    class Meta:
        model = Worker
        fields = "__all__"
        read_only_fields = ("data_introducere",)

    def get_client_denumire(self, obj):
        """Returnează denumirea clientului sau None dacă client este null."""
        return obj.client.denumire if obj.client else None

    def get_cod_cor_denumire_ro(self, obj):
        """Returnează denumirea COR în română sau None."""
        return obj.cod_cor_ref.denumire_ro if obj.cod_cor_ref else None

    def get_cod_cor_denumire_en(self, obj):
        """Returnează denumirea COR în engleză sau None."""
        return obj.cod_cor_ref.denumire_en if obj.cod_cor_ref else None

    def get_ambasada_denumire(self, obj):
        """Returnează denumirea ambasadei sau None."""
        return obj.ambasada.denumire if obj.ambasada else None

    def validate(self, attrs):
        """Validări custom pentru câmpul autoritate_emitenta_pasaport."""
        instance = self.instance  # None la creare, obiect la update
        
        # Validare autoritate_emitenta_pasaport - obligatoriu la creare
        if not instance:  # Creare
            autoritate = attrs.get('autoritate_emitenta_pasaport', '')
            if not autoritate or not autoritate.strip():
                raise serializers.ValidationError({
                    'autoritate_emitenta_pasaport': 'Autoritatea emitentă a pașaportului este obligatorie.'
                })
        
        return attrs


class TemplateDocumentSerializer(serializers.ModelSerializer):
    """Serializer pentru template-uri documente."""
    template_type_display = serializers.CharField(
        source='get_template_type_display', read_only=True
    )
    uploaded_by_username = serializers.SerializerMethodField()
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = TemplateDocument
        fields = [
            'id', 'template_type', 'template_type_display', 'file', 'file_url',
            'original_filename', 'is_active', 'uploaded_at', 'updated_at',
            'uploaded_by', 'uploaded_by_username', 'description'
        ]
        read_only_fields = ('uploaded_at', 'updated_at', 'uploaded_by')

    def get_uploaded_by_username(self, obj):
        return obj.uploaded_by.username if obj.uploaded_by else None

    def get_file_url(self, obj):
        if obj.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
            return obj.file.url
        return None


class GeneratedDocumentSerializer(serializers.ModelSerializer):
    """Serializer pentru istoricul documentelor generate."""
    template_type_display = serializers.CharField(
        source='get_template_type_display', read_only=True
    )

    class Meta:
        model = GeneratedDocument
        fields = [
            'id', 'template_type', 'template_type_display', 'worker',
            'worker_name', 'generated_by', 'generated_by_username',
            'generated_at', 'output_format'
        ]
        read_only_fields = '__all__'


class TemplateTypeSerializer(serializers.Serializer):
    """Serializer pentru listarea tipurilor de template-uri disponibile."""
    value = serializers.CharField()
    label = serializers.CharField()
    has_active_template = serializers.BooleanField()
    active_template_id = serializers.IntegerField(allow_null=True)


class GenerateDocumentRequestSerializer(serializers.Serializer):
    """Serializer pentru request-ul de generare document."""
    template_type = serializers.ChoiceField(choices=TemplateType.choices)
    worker_id = serializers.IntegerField()
    output_format = serializers.ChoiceField(
        choices=[('docx', 'Word'), ('pdf', 'PDF')],
        default='docx'
    )

    def validate_worker_id(self, value):
        try:
            Worker.objects.get(pk=value)
        except Worker.DoesNotExist:
            raise serializers.ValidationError("Lucrătorul nu există.")
        return value

    def validate_template_type(self, value):
        if not TemplateDocument.objects.filter(
            template_type=value, is_active=True
        ).exists():
            raise serializers.ValidationError(
                f"Nu există un template activ pentru tipul '{value}'."
            )
        return value

