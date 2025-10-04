# core/management/commands/init_free_money.py
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction

from core.constants import EXCLUDED_TEACHERS_IDS
from core.models import FreeMoneyBalance, BalanceOperation, SchoolExpense, TeacherPayment, Client


class Command(BaseCommand):
    help = 'Инициализирует баланс свободных денег на основе исторических данных'

    def handle(self, *args, **options):
        with transaction.atomic():
            # Создаем или получаем баланс
            free_money_balance, created = FreeMoneyBalance.objects.get_or_create(
                id=1,
                defaults={'current_balance': Decimal('0.00')}
            )

            # Исключаем клиентов с исключенными преподавателями
            excluded_clients = Client.objects.filter(
                students__teacher__user__id__in=EXCLUDED_TEACHERS_IDS
            ).distinct()

            # Доходы (только включенные операции)
            included_operations = BalanceOperation.objects.filter(
                operation_type='add'
            ).exclude(client__in=excluded_clients)

            total_income = sum(op.amount * 1000 for op in included_operations)

            # Расходы (только включенные выплаты)
            included_payments = TeacherPayment.objects.exclude(
                teacher__user__id__in=EXCLUDED_TEACHERS_IDS
            )
            teacher_expenses = sum(float(payment.amount) for payment in included_payments)

            school_expenses = sum(float(exp.amount) for exp in SchoolExpense.objects.all())

            # ПРАВИЛЬНЫЙ РАСЧЕТ (как в view)
            school_money = total_income / 2
            already_spent_from_school_money = teacher_expenses + school_expenses
            final_free_money = max(school_money - already_spent_from_school_money, 0)

            free_money_balance.current_balance = Decimal(str(final_free_money))
            free_money_balance.save()

            self.stdout.write(
                self.style.SUCCESS(
                    f'✅ Баланс свободных денег инициализирован: {final_free_money} ₽\n'
                    f'   Доходы: {total_income} ₽\n'
                    f'   Деньги школы (50%): {school_money} ₽\n'
                    f'   Уже потрачено из денег школы: {already_spent_from_school_money} ₽\n'
                    f'   (выплаты преподавателям: {teacher_expenses} ₽)\n'
                    f'   (школьные расходы: {school_expenses} ₽)'
                )
            )
