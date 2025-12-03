from django.contrib import admin
from .models import Client, Worker, UserProfile


@admin.register(Client)
class ClientAdmin(admin.ModelAdmin):
    list_display = ("denumire", "tara", "oras", "tarif_orar")
    search_fields = ("denumire", "cod_fiscal", "oras", "tara")


@admin.register(Worker)
class WorkerAdmin(admin.ModelAdmin):
    list_display = ("nume", "prenume", "cetatenie", "status", "pasaport_nr", "client")
    search_fields = ("nume", "prenume", "pasaport_nr", "cetatenie")
    list_filter = ("status", "cetatenie", "client")
    ordering = ("nume", "prenume")


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "role")
    list_filter = ("role",)

