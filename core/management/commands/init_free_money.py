from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction

from core.models import FreeMoneyBalance, BalanceOperation, SchoolExpense


class Command(BaseCommand):
    help = 'Инициализирует баланс свободных денег на основе исторических данных'

    def handle(self, *args, **options):
        with transaction.atomic():
            # Создаем или получаем баланс
            free_money_balance, created = FreeMoneyBalance.objects.get_or_create(
                id=1,
                defaults={'current_balance': Decimal('0.00')}
            )

            if created:
                self.stdout.write('✅ Создан новый баланс свободных денег')
            else:
                self.stdout.write('ℹ️  Баланс свободных денег уже существует')

            # Пересчитываем на основе всех исторических пополнений
            total_income_operations = BalanceOperation.objects.filter(
                operation_type='add'
            )

            total_income = sum(op.amount * 1000 for op in total_income_operations)
            theoretical_free_money = total_income / 2

            # Вычитаем все школьные расходы
            total_school_expenses = sum(float(exp.amount) for exp in SchoolExpense.objects.all())

            final_free_money = max(theoretical_free_money - total_school_expenses, 0)

            free_money_balance.current_balance = Decimal(str(final_free_money))
            free_money_balance.save()

            self.stdout.write(
                self.style.SUCCESS(
                    f'✅ Баланс свободных денег инициализирован: {final_free_money} ₽\n'
                    f'   На основе {total_income_operations.count()} операций пополнения\n'
                    f'   и {SchoolExpense.objects.count()} школьных расходов'
                )
            )
