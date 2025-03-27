from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver

from .models import OpenSlots, Teacher, Lesson


@receiver(pre_save, sender=Lesson)
def check_lesson_balance(sender, instance, **kwargs):
    if instance.status == 'completed' and instance.student.lesson_balance <= 0:
        raise ValidationError('Нельзя провести урок с нулевым балансом')

@receiver(post_save, sender=User)
def init_teacher_and_open_slots(sender, instance, created, **kwargs):
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
