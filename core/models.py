import logging
from datetime import date as date_type, datetime, timedelta, time

from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.db import models, transaction

logger = logging.getLogger(__name__)


class Teacher(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)

    @property
    def name(self):
        return f"{self.user.first_name} {self.user.last_name}".strip()

    def __str__(self):
        return self.user.get_full_name() or self.user.username

    class Meta:
        verbose_name = 'Преподаватель'
        verbose_name_plural = 'Преподаватели'


class PhoneNumber(models.Model):
    client = models.ForeignKey(
        'Client',
        on_delete=models.CASCADE,
        related_name='phone_numbers',
        verbose_name='Клиент'
    )
    number = models.CharField(
        max_length=20,
        verbose_name='Номер телефона'
    )
    note = models.CharField(
        max_length=100,
        blank=True,
        verbose_name='Заметка (например, "Бабушка Алла")'
    )
    is_primary = models.BooleanField(
        default=False,
        verbose_name='Основной номер'
    )

    class Meta:
        verbose_name = 'Номер телефона'
        verbose_name_plural = 'Номера телефонов'
        ordering = ['-is_primary', 'id']

    def __str__(self):
        return f"{self.number} ({self.note})" if self.note else self.number


class Client(models.Model):
    name = models.CharField(max_length=100, verbose_name='Имя родителя')
    email = models.EmailField(blank=True, verbose_name='Email')

    balance = models.IntegerField(
        default=0,
        verbose_name='Баланс уроков'
    )

    allow_negative_once = models.BooleanField(
        default=False,
        verbose_name='Разрешить одно списание в минус'
    )

    @property
    def primary_phone(self):
        """Возвращает основной номер телефона"""
        return self.phone_numbers.filter(is_primary=True).first() or self.phone_numbers.first()

    def add_lessons(self, amount, student, note=''):
        """Пополнение баланса с логированием"""
        if amount <= 0:
            raise ValueError("Количество уроков должно быть положительным")

        self.balance += amount
        self.save()

        BalanceOperation.objects.create(
            client=self,
            student=student,
            operation_type='add',
            amount=amount,
            notes=note or f"Пополнение баланса на {amount} уроков"
        )

    @transaction.atomic
    def spend_lesson(self, student, note=''):
        """Атомарное списание урока с баланса"""
        with transaction.atomic():
            # Блокируем запись клиента для изменения
            client = Client.objects.select_for_update().get(pk=self.pk)

            if client.balance > 0:
                # Обычное списание при положительном балансе
                BalanceOperation.objects.create(
                    client=client,
                    student=student,
                    operation_type='spend',
                    amount=1,
                    notes=note or f"Занятие с {student.name}"
                )
                return True
            elif client.allow_negative_once:
                # Списание в минус (однократное)
                BalanceOperation.objects.create(
                    client=client,
                    student=student,
                    operation_type='spend',
                    amount=1,
                    notes=note or f"Занятие с {student.name} (списание в минус)"
                )
                client.refresh_from_db()
                # Сбрасываем флаг и сохраняем
                client.allow_negative_once = False
                client.save()
                return True
            else:
                # Нельзя списать - баланс 0 и нет разрешения на минус
                return False

    def clean(self):
        super().clean()
        # Проверяем, что баланс либо положительный, либо (отрицательный И разрешено одно списание)
        if self.balance < 0 and not self.allow_negative_once:
            raise ValidationError(
                {'balance': 'Баланс не может быть отрицательным без специального разрешения'}
            )

    def __str__(self):
        return f"{self.name} (Баланс: {self.balance})"

    class Meta:
        verbose_name = 'Клиент'
        verbose_name_plural = 'Клиенты'
        indexes = [
            models.Index(fields=['balance']),
        ]


class Student(models.Model):
    client = models.ForeignKey(
        Client,
        on_delete=models.CASCADE,
        related_name='students',
        verbose_name='Клиент (родитель)',
        null=True,
        blank=True
    )
    name = models.CharField(max_length=100, verbose_name='Имя ученика')
    notes = models.TextField(blank=True, verbose_name='Примечания')

    @property
    def lesson_balance(self):
        """Свойство для совместимости с фронтендом (возвращает баланс клиента)"""
        if not hasattr(self, 'client') or not self.client:
            return 0
        return self.client.balance

    def spend_lesson(self, note=''):
        """Списание урока через клиента (для совместимости)"""
        if not hasattr(self, 'client') or not self.client:
            return False
        return self.client.spend_lesson(self, note)

    teacher = models.ForeignKey(
        'Teacher',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name='Преподаватель'
    )

    @property
    def family_balance(self):
        return self.client.balance

    family_balance.fget.short_description = "Баланс"

    def __str__(self):
        return f"{self.name} (Клиент: {self.client.name})"

    class Meta:
        verbose_name = 'Ученик'
        verbose_name_plural = 'Ученики'


class BalanceOperation(models.Model):
    OPERATION_TYPES = [
        ('add', 'Пополнение'),
        ('spend', 'Списание'),
        ('correction', 'Корректировка')
    ]

    client = models.ForeignKey(
        Client,
        on_delete=models.CASCADE,
        related_name='operations'
    )
    student = models.ForeignKey(
        Student,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name='Ученик'
    )
    operation_type = models.CharField(
        max_length=10,
        choices=OPERATION_TYPES,
        verbose_name='Тип операции'
    )
    amount = models.PositiveIntegerField(verbose_name='Количество уроков')
    balance_before = models.IntegerField(verbose_name='Баланс до операции')
    balance_after = models.IntegerField(verbose_name='Баланс после операции')
    date = models.DateTimeField(auto_now_add=True, verbose_name='Дата операции')
    notes = models.CharField(max_length=100, blank=True, verbose_name='Комментарий')

    def save(self, *args, **kwargs):
        with transaction.atomic():
            # Блокируем клиента для изменения
            client = Client.objects.select_for_update().get(pk=self.client.pk)

            if not self.pk:  # Только для новых операций
                self.balance_before = client.balance

                if self.operation_type == 'spend':
                    if client.balance < self.amount and not client.allow_negative_once:
                        raise ValueError("Недостаточно средств на балансе")

                # Обновляем баланс
                if self.operation_type == 'add':
                    client.balance += self.amount
                elif self.operation_type == 'spend':
                    client.balance -= self.amount
                    # Если ушли в минус - сбрасываем флаг
                    if client.balance < 0:
                        client.allow_negative_once = False
                elif self.operation_type == 'correction':
                    client.balance = self.amount

                self.balance_after = client.balance
                client.save()

            super().save(*args, **kwargs)

    class Meta:
        verbose_name = 'Операция с балансом'
        verbose_name_plural = 'Операции с балансом'
        ordering = ['-date']

    def __str__(self):
        return (f"{self.get_operation_type_display()} {self.amount} уроков | "
                f"Баланс: {self.balance_before}→{self.balance_after} ({self.client.name})")


class Lesson(models.Model):
    LESSON_TYPE_CHOICES = [
        ('single', 'Разовый'),
        ('recurring', 'Регулярный'),
        ('demo', 'Вводный')
    ]

    STATUS_CHOICES = [
        ('scheduled', 'Запланирован'),
        ('completed', 'Проведён'),
        ('canceled', 'Отменён'),
    ]
    student_name = models.CharField(
        max_length=100,
        blank=True,
        verbose_name='Имя ученика'
    )

    # Основные связи
    student = models.ForeignKey(Student, on_delete=models.CASCADE, verbose_name='Студент')
    teacher = models.ForeignKey(Teacher, on_delete=models.CASCADE, verbose_name='Преподаватель')
    course = models.CharField(max_length=100, default='Не выбран', verbose_name='Курс')

    # Тип и статус урока
    lesson_type = models.CharField(
        max_length=10,
        choices=LESSON_TYPE_CHOICES,
        verbose_name='Тип урока'
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='scheduled',
        verbose_name='Статус'
    )

    # Для разовых уроков
    date = models.DateField(null=True, verbose_name='Дата урока')
    time = models.TimeField(null=True, blank=True, verbose_name='Время урока')

    # Для регулярных уроков
    schedule = models.JSONField(
        default=list,
        verbose_name='Регулярное расписание',
        help_text='Поле для постоянного расписания'
    )

    # Информация об уроке
    lesson_topic = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        verbose_name='Тема урока'
    )
    lesson_notes = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        verbose_name='Комментарий преподавателя'
    )
    homework = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        verbose_name='Домашнее задание'
    )
    cancel_reason = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        default=None,
        verbose_name='Причина отмены урока'
    )

    # Системные поля
    completed_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name='Фактическое время проведения'
    )
    canceled_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name='Фактическое время проведения'
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Дата создания')

    def create_next_lesson(self):
        """Создает следующий урок в цепочке повторяющихся занятий"""
        if self.lesson_type != 'recurring' or not self.schedule:
            return None

        next_date, next_time = self.calculate_next_date_and_time()
        if not next_date:
            return None

        return Lesson.objects.create(
            student=self.student,
            student_name=self.student.name,
            teacher=self.teacher,
            course=self.course,
            lesson_type='recurring',
            status='scheduled',
            date=next_date,
            time=next_time,
            schedule=self.schedule,
        )

    def calculate_next_date_and_time(self):
        """Вычисляет следующую дату и время на основе расписания"""
        try:
            weekday_mapping = {
                'monday': 0, 'tuesday': 1, 'wednesday': 2,
                'thursday': 3, 'friday': 4, 'saturday': 5, 'sunday': 6
            }

            # Получаем дни расписания с временем
            if not self.schedule:
                return None, None

            # Обрабатываем self.date (может быть date или datetime)
            current_date = self.date
            if isinstance(current_date, datetime):
                current_date = current_date.date()
            elif not isinstance(current_date, date_type):
                raise ValueError("Поле date должно быть datetime.date или datetime.datetime")

            # Находим следующий учебный день после текущей даты и соответствующее время
            for days_ahead in range(1, 8):  # Проверяем 7 дней вперед
                next_date = current_date + timedelta(days=days_ahead)
                next_day_name = list(weekday_mapping.keys())[next_date.weekday()]

                # Ищем этот день в расписании
                for schedule_item in self.schedule:
                    if schedule_item['day'] == next_day_name:
                        # Парсим время из строки "HH:MM"
                        time_str = schedule_item['time']
                        hours, minutes = map(int, time_str.split(':'))
                        next_time = time(hours, minutes)
                        return next_date, next_time

            return None, None

        except Exception as e:
            logger.error(f'Ошибка расчета даты для урока {self.id}: {str(e)}')
            return None

    def save(self, *args, **kwargs):
        if self.lesson_type == 'single' or self.lesson_type == 'single':
            self.schedule = []  # Очищаем расписание для разовых и вводных уроков
        super().save(*args, **kwargs)

    class Meta:
        verbose_name = 'Урок'
        verbose_name_plural = 'Уроки'
        ordering = ['date', 'time']

    def __str__(self):
        if self.lesson_type == 'single' or self.lesson_type == 'single':
            return f"{self.date} {self.time} - {self.course} ({self.get_status_display()})"
        return f"Регулярный: {self.course} ({self.get_status_display()})"


class UserSettings(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='settings')
    working_hours_start = models.IntegerField(default=9)  # Начало рабочего дня
    working_hours_end = models.IntegerField(default=18)  # Конец рабочего дня
    theme = models.CharField(max_length=10, default='light')  # Тема (light/dark)

    def __str__(self):
        return f"Настройки пользователя {self.user.username}"


class OpenSlots(models.Model):
    teacher = models.OneToOneField(User, on_delete=models.CASCADE, related_name='open_slots')
    weekly_open_slots = models.JSONField(default=dict)

    class Meta:
        verbose_name = 'Открытые часы'
        verbose_name_plural = 'Открытые часы'

    def __str__(self):
        return f"Open slots for {self.teacher.username}"


class TeacherPayment(models.Model):
    teacher = models.ForeignKey(Teacher, on_delete=models.CASCADE, related_name='payments')
    week_start_date = models.DateField()  # Понедельник расчетной недели
    week_end_date = models.DateField()  # Воскресенье расчетной недели
    lessons_count = models.PositiveIntegerField(default=0)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    is_paid = models.BooleanField(default=False)
    payment_date = models.DateField(null=True, blank=True)

    class Meta:
        unique_together = ['teacher', 'week_start_date']
        verbose_name = 'Выпплата преподавателю'
        verbose_name_plural = 'Выплаты преподавателям'
