from django.contrib.auth.models import User
from django.core.management.base import BaseCommand

from core.models import OpenSlots


class Command(BaseCommand):
    help = 'Создает записи OpenSlots для всех существующих пользователей'

    def handle(self, *args, **kwargs):
        users = User.objects.all()
        for user in users:
            # Проверяем, есть ли уже запись для пользователя
            if not OpenSlots.objects.filter(teacher=user).exists():
                OpenSlots.objects.create(
                    teacher=user,
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
                self.stdout.write(self.style.SUCCESS(f'Создана запись для пользователя {user.username}'))
            else:
                self.stdout.write(self.style.WARNING(f'Запись для пользователя {user.username} уже существует'))
