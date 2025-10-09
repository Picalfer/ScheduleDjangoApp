import logging

from django.core.exceptions import ValidationError
from django.db.models.signals import pre_save
from django.dispatch import receiver

from .models import Lesson

logger = logging.getLogger(__name__)


@receiver(pre_save, sender=Lesson)
def check_lesson_balance(sender, instance, **kwargs):
    if instance.status == 'completed' and instance.lesson_type != 'demo':
        client = instance.student.client
        if client.balance <= 0 and not client.allow_negative_once:
            raise ValidationError('Нельзя провести урок с нулевым балансом')
