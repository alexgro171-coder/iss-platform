from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Client, Worker, UserProfile, WorkerDocument


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


class WorkerDocumentSerializer(serializers.ModelSerializer):
    """Serializer pentru documentele lucrătorilor."""
    document_type_display = serializers.CharField(source='get_document_type_display', read_only=True)
    uploaded_by_username = serializers.CharField(source='uploaded_by.username', read_only=True)
    
    class Meta:
        model = WorkerDocument
        fields = [
            'id', 'worker', 'document_type', 'document_type_display',
            'file', 'original_filename', 'description', 'uploaded_at',
            'uploaded_by', 'uploaded_by_username', 'file_size'
        ]
        read_only_fields = ('uploaded_at', 'uploaded_by', 'file_size', 'original_filename')


class WorkerSerializer(serializers.ModelSerializer):
    client_denumire = serializers.CharField(
        source="client.denumire", read_only=True
    )
    documents = WorkerDocumentSerializer(many=True, read_only=True)

    class Meta:
        model = Worker
        fields = "__all__"
        read_only_fields = ("data_introducere",)

