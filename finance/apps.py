from django.apps import AppConfig


class FinanceConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'finance'

    verbose_name = 'Финансы'

    def ready(self):
        import finance.signals
