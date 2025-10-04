import logging
from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models.signals import post_save
from django.db.models.signals import pre_save
from django.dispatch import receiver

from .models import Lesson, BalanceOperation, FreeMoneyBalance, SchoolExpense

logger = logging.getLogger(__name__)


@receiver(pre_save, sender=Lesson)
def check_lesson_balance(sender, instance, **kwargs):
    if instance.status == 'completed' and instance.lesson_type != 'demo':
        client = instance.student.client
        if client.balance <= 0 and not client.allow_negative_once:
            raise ValidationError('Нельзя провести урок с нулевым балансом')


@receiver(post_save, sender=BalanceOperation)
def update_free_money_on_income(sender, instance, created, **kwargs):
    try:
        if created and instance.operation_type == 'add':
            with transaction.atomic():
                free_money_balance = FreeMoneyBalance.objects.first()
                if not free_money_balance:
                    free_money_balance = FreeMoneyBalance.objects.create(current_balance=0)

                income_in_rub = instance.amount * 1000
                free_money_to_add = Decimal(income_in_rub) / Decimal(2)
                free_money_balance.current_balance += free_money_to_add
                free_money_balance.save()
    except Exception as e:
        logger.error(f"Error updating free money for BalanceOperation {instance.id}: {e}")


@receiver(post_save, sender=SchoolExpense)
def update_free_money_on_expense(sender, instance, created, **kwargs):
    try:
        if created:
            with transaction.atomic():
                free_money_balance = FreeMoneyBalance.objects.first()
                if not free_money_balance:
                    free_money_balance = FreeMoneyBalance.objects.create(current_balance=0)

                # Вычитаем расход из свободных денег (но не ниже 0)
                if free_money_balance.current_balance >= instance.amount:
                    free_money_balance.current_balance -= instance.amount
                else:
                    free_money_balance.current_balance = Decimal(0)
                free_money_balance.save()
    except Exception as e:
        logger.error(f"Error updating free money for SchoolExpense {instance.id}: {e}")
