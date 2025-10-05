from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction

from core.constants import get_excluded_teacher_ids
from core.models import FinanceEvent, FinanceSnapshot, BalanceOperation, TeacherPayment, Client

TEACHER_RATE_PER_LESSON = 500
PRICE_PER_LESSON = 1000


class Command(BaseCommand):
    help = "Переинициализация финансовой системы: пересчёт событий и балансов с нуля."

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING("⚠️  ВНИМАНИЕ: Все FinanceEvent и FinanceSnapshot будут удалены!"))
        confirm = input("Продолжить? (yes/no): ")
        if confirm.lower() != 'yes':
            self.stdout.write(self.style.ERROR("Отменено"))
            return

        with transaction.atomic():
            self._clear_old_data()
            self._process_balance_operations()
            self._process_teacher_payments()

        self.stdout.write(self.style.SUCCESS("✅ Финансовая система успешно переинициализирована"))

    def _clear_old_data(self):
        FinanceEvent.objects.all().delete()
        FinanceSnapshot.objects.all().delete()
        self.stdout.write("🧹 Существующие события и снапшоты удалены")

    def _process_balance_operations(self):
        self.stdout.write("📊 Обработка пополнений баланса...")

        # Исключаем клиентов с исключёнными преподавателями
        excluded_clients = Client.objects.filter(
            students__teacher__user__id__in=get_excluded_teacher_ids()
        ).distinct()

        # Доходы (только включенные операции)
        included_operations = BalanceOperation.objects.filter(
            operation_type='add'
        ).exclude(client__in=excluded_clients)

        for bo in included_operations:
            lessons_count = Decimal(bo.amount)  # если amount = количество уроков

            income_amount = lessons_count * Decimal(PRICE_PER_LESSON)
            reserve_amount = lessons_count * Decimal(TEACHER_RATE_PER_LESSON)

            # INCOME
            FinanceEvent.create_idempotent(
                external_id=f'bootstrap_balanceop_{bo.pk}_income',
                event_type=FinanceEvent.EVENT_INCOME,
                amount=income_amount,
                metadata={
                    'client_id': bo.client_id,
                    'student_id': bo.student_id,
                    'balance_operation_id': bo.pk,
                    'bootstrap': True
                }
            )

            # RESERVE
            FinanceEvent.create_idempotent(
                external_id=f'bootstrap_balanceop_{bo.pk}_reserve',
                event_type=FinanceEvent.EVENT_RESERVE,
                amount=reserve_amount,
                metadata={
                    'client_id': bo.client_id,
                    'student_id': bo.student_id,
                    'balance_operation_id': bo.pk,
                    'bootstrap': True
                }
            )
        self.stdout.write("✅ Пополнения обработаны")

    def _process_teacher_payments(self):
        self.stdout.write("👨‍🏫 Обработка выплат преподавателям...")
        from core.models import FinanceSnapshot  # чтобы получить актуальные резервы

        for tp in TeacherPayment.objects.filter(is_paid=True):
            # Пропускаем выплаты для исключённых преподавателей
            if tp.teacher.user.id in get_excluded_teacher_ids():
                continue

            external_id_expense = f'bootstrap_teacherpayment_{tp.pk}_expense'
            external_id_release = f'bootstrap_teacherpayment_{tp.pk}_release'

            amount_to_pay = Decimal(tp.amount)
            snapshot = FinanceSnapshot.objects.order_by('-created_at').first()

            reserved = snapshot.reserved_amount if snapshot else Decimal('0.00')
            free = snapshot.free_amount if snapshot else Decimal('0.00')

            from_reserved = min(reserved, amount_to_pay)
            from_free = max(amount_to_pay - from_reserved, Decimal('0.00'))

            # RELEASE из резерва
            if from_reserved > 0:
                FinanceEvent.create_idempotent(
                    external_id=external_id_release,
                    event_type=FinanceEvent.EVENT_RELEASE,
                    amount=from_reserved,
                    metadata={
                        'teacher_payment_id': tp.pk,
                        'bootstrap': True,
                    }
                )

            # EXPENSE общая сумма
            FinanceEvent.create_idempotent(
                external_id=external_id_expense,
                event_type=FinanceEvent.EVENT_EXPENSE,
                amount=amount_to_pay,
                metadata={
                    'teacher_payment_id': tp.pk,
                    'spent_from_reserved': str(from_reserved),
                    'spent_from_free': str(from_free),
                    'bootstrap': True,
                }
            )
        self.stdout.write("✅ Выплаты преподавателям обработаны")
