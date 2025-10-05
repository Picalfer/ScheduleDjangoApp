import logging

from django.core.exceptions import ValidationError
from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver

from .models import Lesson, FinanceEvent
from .services.finance_service import FinanceService

logger = logging.getLogger(__name__)


@receiver(pre_save, sender=Lesson)
def check_lesson_balance(sender, instance, **kwargs):
    if instance.status == 'completed' and instance.lesson_type != 'demo':
        client = instance.student.client
        if client.balance <= 0 and not client.allow_negative_once:
            raise ValidationError('Нельзя провести урок с нулевым балансом')


@receiver(post_save, sender=FinanceEvent)
def on_finance_event_created(sender, instance, created, **kwargs):
    """
    После создания нового события — применяем его к последнему снапшоту.
    """
    if created:
        FinanceService.apply_event(instance)


from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import BalanceOperation

TEACHER_RATE_PER_LESSON = 500  # ставка преподавателя за урок
PRICE_PER_LESSON = 1000  # цена одного урока для клиента


@receiver(post_save, sender=BalanceOperation)
def balance_operation_created(sender, instance: BalanceOperation, created, **kwargs):
    if not created:
        return

    if instance.operation_type != 'add':
        return  # нас интересует только пополнение

    # 1️⃣ Доход школы
    income_amount = Decimal(instance.amount * PRICE_PER_LESSON)
    FinanceEvent.create_idempotent(
        external_id=f'balanceop_{instance.pk}_income',
        event_type=FinanceEvent.EVENT_INCOME,
        amount=income_amount,
        metadata={
            'client_id': instance.client_id,
            'student_id': instance.student_id,
            'balance_operation_id': instance.pk
        }
    )

    # 2️⃣ Резерв на преподавателя
    reserve_amount = Decimal(instance.amount * TEACHER_RATE_PER_LESSON)
    FinanceEvent.create_idempotent(
        external_id=f'balanceop_{instance.pk}_reserve',
        event_type=FinanceEvent.EVENT_RESERVE,
        amount=reserve_amount,
        metadata={
            'client_id': instance.client_id,
            'student_id': instance.student_id,
            'balance_operation_id': instance.pk,
            'teacher_rate': TEACHER_RATE_PER_LESSON
        }
    )


from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import TeacherPayment


@receiver(post_save, sender=TeacherPayment)
def teacher_payment_created(sender, instance: TeacherPayment, created, **kwargs):
    if not instance.is_paid:
        return

    external_id_expense = f'teacherpayment_{instance.pk}_expense'
    external_id_release = f'teacherpayment_{instance.pk}_release'

    # Проверка, не обрабатывали ли уже это событие
    if FinanceEvent.objects.filter(external_id=external_id_expense).exists():
        return

    amount_to_pay = Decimal(instance.amount)

    # Получаем последний снапшот для понимания, сколько денег в резерве
    snapshot = FinanceSnapshot.objects.order_by('-created_at').first()
    reserved = snapshot.reserved_amount if snapshot else Decimal('0.00')

    from_reserved = min(reserved, amount_to_pay)
    from_free = max(amount_to_pay - reserved, Decimal('0.00'))

    # 1️⃣ Сначала освобождаем резерв, если есть
    if from_reserved > 0:
        FinanceEvent.create_idempotent(
            external_id=external_id_release,
            event_type=FinanceEvent.EVENT_RELEASE,
            amount=from_reserved,
            metadata={
                'teacher_payment_id': instance.pk,
                'teacher_id': instance.teacher_id,
                'lessons_count': instance.lessons_count,
                'week_start_date': str(instance.week_start_date),
                'week_end_date': str(instance.week_end_date),
            }
        )

    # 2️⃣ Потом создаём расход на всю сумму выплаты
    FinanceEvent.create_idempotent(
        external_id=external_id_expense,
        event_type=FinanceEvent.EVENT_EXPENSE,
        amount=amount_to_pay,
        metadata={
            'teacher_payment_id': instance.pk,
            'teacher_id': instance.teacher_id,
            'lessons_count': instance.lessons_count,
            'week_start_date': str(instance.week_start_date),
            'week_end_date': str(instance.week_end_date),
            'spent_from_reserved': str(from_reserved),
            'spent_from_free': str(from_free),
        }
    )


from decimal import Decimal
import logging
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import SchoolExpense, FinanceEvent, FinanceSnapshot

logger = logging.getLogger(__name__)


@receiver(post_save, sender=SchoolExpense)
def school_expense_created(sender, instance: SchoolExpense, created, **kwargs):
    """
    Сигнал: при создании школьного расхода — создаём финансовое событие EXPENSE.
    Сначала тратим из свободных денег, если не хватает — из резервов.
    """
    if not created:
        return

    external_id = f'schoolexpense_{instance.pk}_expense'

    # Проверяем, не создавали ли мы уже это событие
    if FinanceEvent.objects.filter(external_id=external_id).exists():
        logger.info(f"[SchoolExpense] Расход {instance.pk} уже был обработан, пропускаем.")
        return

    amount_to_spend = Decimal(instance.amount)

    # Получаем последний снапшот для понимания, сколько свободных и резервов
    snapshot = FinanceSnapshot.objects.order_by('-created_at').first()
    free = snapshot.free_amount if snapshot else Decimal('0.00')
    reserved = snapshot.reserved_amount if snapshot else Decimal('0.00')

    # Сначала тратим из свободных
    from_free = min(free, amount_to_spend)
    from_reserved = max(amount_to_spend - from_free, Decimal('0.00'))

    logger.info(
        f"[SchoolExpense] Новый расход {instance.pk}: "
        f"amount={amount_to_spend}, free={free}, reserved={reserved}, "
        f"spent_from_free={from_free}, spent_from_reserved={from_reserved}"
    )

    # Создаём финансовое событие
    FinanceEvent.create_idempotent(
        external_id=external_id,
        event_type=FinanceEvent.EVENT_EXPENSE,
        amount=amount_to_spend,
        metadata={
            'school_expense_id': instance.pk,
            'category': instance.category,
            'description': instance.description,
            'expense_date': str(instance.expense_date),
            'spent_from_free': str(from_free),
            'spent_from_reserved': str(from_reserved),
        }
    )
