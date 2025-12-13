from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Client, Worker, UserProfile, WorkerDocument, CodCOR


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

