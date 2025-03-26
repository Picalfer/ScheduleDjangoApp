from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver

from .models import OpenSlots, Teacher, TimeSlot, LessonLog


@receiver(post_save, sender=TimeSlot)
def log_lesson_changes(sender, instance, created, **kwargs):
    if instance.status == 'completed' and not created:
        # Проверяем, не было ли уже лога для этого урока
        if not LessonLog.objects.filter(lesson=instance, action='completed').exists():
            LessonLog.objects.create(
                lesson=instance,
                teacher=instance.teacher.user,
                student=instance.student,
                action='completed',
                old_balance=instance.student.lesson_balance + 1,
                new_balance=instance.student.lesson_balance,
                notes='Автоматическое логирование при изменении статуса'
            )

@receiver(pre_save, sender=TimeSlot)
def check_lesson_balance(sender, instance, **kwargs):
    if instance.status == 'completed' and instance.student.lesson_balance <= 0:
        raise ValidationError('Нельзя провести урок с нулевым балансом')

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
