from django.contrib.auth.models import User
from django.core.validators import MinValueValidator
from django.db import models


class Teacher(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)

    def __str__(self):
        return self.user.get_full_name() or self.user.username

    class Meta:
        verbose_name = 'Преподаватель'
        verbose_name_plural = 'Преподаватели'


class Student(models.Model):
    name = models.CharField(
        max_length=100,
        default='Новый ученик',
        verbose_name='Имя ученика'
    )
    teacher = models.ForeignKey(
        Teacher,
        on_delete=models.SET_NULL,
        null=True,
        related_name='students'
    )
    bitrix_link = models.URLField(max_length=500, blank=True)

    lesson_balance = models.PositiveIntegerField(
        default=0,
        verbose_name='Баланс уроков',
        validators=[MinValueValidator(0)]
    )

    def spend_lesson(self):
        if self.lesson_balance > 0:
            self.lesson_balance -= 1
            self.save()
            return True
        return False

    def add_lessons(self, count):
        self.lesson_balance += count
        self.save()

    def __str__(self):
        return f"{self.name} - осталось уроков: {self.lesson_balance}"

    class Meta:
        verbose_name = 'Ученик'
        verbose_name_plural = 'Ученики'


class Lesson(models.Model):
    LESSON_TYPE_CHOICES = [
        ('single', 'Разовый'),
        ('recurring', 'Регулярный')
    ]

    STATUS_CHOICES = [
        ('scheduled', 'Запланирован'),
        ('completed', 'Проведён'),
        ('canceled', 'Отменён'),
    ]

    # Основные связи
    student = models.ForeignKey(Student, on_delete=models.CASCADE, verbose_name='Студент')
    student_name = models.CharField(max_length=100, blank=True, verbose_name='Имя студента')
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
    date = models.DateField(null=True, blank=True, verbose_name='Дата')
    time = models.TimeField(null=True, blank=True, verbose_name='Время')

    # Для регулярных уроков
    schedule = models.JSONField(
        default=list,
        verbose_name='Расписание',
        help_text='''Формат: [{"day": "monday", "time": "14:00"}, {"day": "wednesday", "time": "16:00"}]'''
    )
    start_date = models.DateField(
        verbose_name='Дата начала повторений',
        null=True,
        blank=True
    )

    # Информация об уроке
    lesson_topic = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        verbose_name='Тема урока'
    )
    lesson_notes = models.TextField(
        blank=True,
        null=True,
        verbose_name='Комментарий преподавателя'
    )
    homework = models.TextField(
        blank=True,
        null=True,
        verbose_name='Домашнее задание'
    )

    # Системные поля
    completed_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name='Фактическое время проведения'
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Дата создания')

    class Meta:
        verbose_name = 'Урок'
        verbose_name_plural = 'Уроки'
        ordering = ['date', 'time']

    def __str__(self):
        if self.lesson_type == 'single':
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

    def __str__(self):
        return f"Open slots for {self.teacher.username}"
