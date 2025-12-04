from django.apps import AppConfig


class IssConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'iss'

    def ready(self):
        """Încarcă signals când app-ul e gata."""
        import iss.signals  # noqa: F401
