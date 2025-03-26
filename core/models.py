from django.contrib.auth.models import User
from django.core.validators import MinValueValidator
from django.db import models


class Teacher(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    courses = models.CharField(max_length=255, blank=True)  # Например: "Python, JavaScript"

    def __str__(self):
        return self.user.get_full_name() or self.user.username


class Student(models.Model):
    name = models.CharField(
        max_length=100,
        default='Новый ученик',  # Добавьте временное значение по умолчанию
        verbose_name='Имя ученика'
    )
    subject = models.CharField(max_length=100,
                               default='не выбрано')  # Предмет
    teacher = models.ForeignKey(
        Teacher,  # Или User, если используете вариант 2
        on_delete=models.SET_NULL,
        null=True,
        related_name='students'
    )
    bitrix_link = models.URLField(max_length=500, blank=True)  # Ссылка на Битрикс

    lesson_balance = models.PositiveIntegerField(
        default=0,
        verbose_name='Баланс уроков',
        validators=[MinValueValidator(0)]  # Гарантируем, что баланс не уйдет в минус
    )

    def spend_lesson(self):
        """
        Уменьшает баланс уроков на 1.
        Возвращает True если операция успешна, False если баланс недостаточен.
        """
        if self.lesson_balance > 0:
            self.lesson_balance -= 1
            self.save()
            return True
        return False

    def __str__(self):
        return f"{self.name} ({self.subject}) - осталось уроков: {self.lesson_balance}"


class TimeSlot(models.Model):
    teacher = models.ForeignKey(
        Teacher,
        on_delete=models.CASCADE,
        related_name='time_slots'
    )
    student = models.ForeignKey(Student, on_delete=models.CASCADE)
    date = models.DateField()
    time = models.TimeField()
    is_recurring = models.BooleanField(
        default=False,
        verbose_name='Регулярный урок',
        help_text='Отметьте для регулярных занятий'
    )
    subject = models.CharField(max_length=100)

    STATUS_CHOICES = [
        ('scheduled', 'Запланирован'),
        ('completed', 'Проведён'),
        ('canceled', 'Отменён'),
    ]
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='scheduled'
    )

    # Дополнительные поля для информации о проведённых уроках
    lesson_topic = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        verbose_name='Тема урока'
    )
    lesson_notes = models.TextField(
        blank=True,
        null=True,
        verbose_name='Комментарий к уроку'
    )
    homework = models.TextField(
        blank=True,
        null=True,
        verbose_name='Домашнее задание'
    )
    completed_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name='Дата и время проведения'
    )

    start_date = models.DateField(
        verbose_name='Дата начала регулярных уроков',
        null=True,
        blank=True
    )

    class Meta:
        verbose_name = 'Урок'
        verbose_name_plural = 'Уроки'
        ordering = ['date', 'time']

    def __str__(self):
        return f"{self.date} {self.time} - {self.student} ({self.get_status_display()})"


class LessonLog(models.Model):
    lesson = models.ForeignKey(
        TimeSlot,
        on_delete=models.PROTECT,
        related_name='logs',
        verbose_name='Урок'
    )
    teacher = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        verbose_name='Преподаватель'
    )
    student = models.ForeignKey(
        Student,
        on_delete=models.PROTECT,
        verbose_name='Студент'
    )
    action = models.CharField(
        max_length=50,
        choices=[
            ('completed', 'Проведен'),
            ('canceled', 'Отменен'),
            ('modified', 'Изменен')
        ],
        verbose_name='Действие'
    )
    old_balance = models.IntegerField(verbose_name='Было уроков')
    new_balance = models.IntegerField(verbose_name='Стало уроков')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Дата записи')
    notes = models.TextField(blank=True, verbose_name='Примечания')

    class Meta:
        verbose_name = 'Лог урока'
        verbose_name_plural = 'Логи уроков'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.get_action_display()} - {self.student.name} ({self.created_at})"


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
