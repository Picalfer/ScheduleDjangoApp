import logging
from decimal import Decimal

from core.models import FinanceEvent, FinanceSnapshot

logger = logging.getLogger(__name__)


class FinanceService:
    @staticmethod
    def apply_event(event: FinanceEvent):
        last_snapshot = FinanceSnapshot.objects.order_by('-created_at').first()

        total_balance = last_snapshot.total_balance if last_snapshot else Decimal('0.00')
        reserved_amount = last_snapshot.reserved_amount if last_snapshot else Decimal('0.00')
        free_amount = last_snapshot.free_amount if last_snapshot else Decimal('0.00')
        logger.info(f"[Finance] Применяем событие #{event.id}: {event.get_event_type_display()} {event.amount}")

        if event.event_type == FinanceEvent.EVENT_INCOME:
            total_balance += event.amount
            free_amount += event.amount
            logger.info(f"[Finance] Доход +{event.amount} → total={total_balance}, free={free_amount}")

        elif event.event_type == FinanceEvent.EVENT_EXPENSE:
            # По умолчанию — списываем из свободных
            if event.amount > free_amount:
                raise ValueError(
                    f"Недостаточно свободных средств для расхода: нужно {event.amount}, доступно {free_amount}")

            free_amount -= event.amount
            total_balance = free_amount + reserved_amount
            logger.info(f"[Finance] Расход -{event.amount} → total={total_balance}, free={free_amount}")

        elif event.event_type == FinanceEvent.EVENT_RESERVE:
            if event.amount > free_amount:
                raise ValueError(
                    f"Недостаточно свободных средств для резервирования: нужно {event.amount}, доступно {free_amount}")
            reserved_amount += event.amount
            free_amount -= event.amount
            logger.info(f"[Finance] Резервирование {event.amount} → reserved={reserved_amount}, free={free_amount}")

        elif event.event_type == FinanceEvent.EVENT_RELEASE:
            if event.amount > reserved_amount:
                raise ValueError(
                    f"Нельзя снять из резерва больше, чем есть: нужно {event.amount}, доступно {reserved_amount}")
            reserved_amount -= event.amount
            free_amount += event.amount
            logger.info(f"[Finance] Снятие резерва {event.amount} → reserved={reserved_amount}, free={free_amount}")

        FinanceSnapshot.objects.create(
            total_balance=total_balance,
            reserved_amount=reserved_amount,
            free_amount=free_amount,
            last_event_id=event.id,
        )
