from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import OpenSlots, Teacher


@receiver(post_save, sender=User)
def create_open_slots(sender, instance, created, **kwargs):
    if created:
        # Создаем профиль преподавателя
        Teacher.objects.get_or_create(user=instance)

        # Создаем открытые слоты
        OpenSlots.objects.create(
            teacher=instance,
            weekly_open_slots={
                "monday": [],
                "tuesday": [],
                "wednesday": [],
                "thursday": [],
                "friday": [],
                "saturday": [],
                "sunday": []
            }
        )
