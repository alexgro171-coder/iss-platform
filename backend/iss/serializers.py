from rest_framework import serializers
from .models import Client, Worker


class ClientSerializer(serializers.ModelSerializer):
    class Meta:
        model = Client
        fields = "__all__"


class WorkerSerializer(serializers.ModelSerializer):
    client_denumire = serializers.CharField(
        source="client.denumire", read_only=True
    )

    class Meta:
        model = Worker
        fields = "__all__"
        read_only_fields = ("data_introducere",)

