# services/payment_service.py
from datetime import timedelta

from django.utils import timezone

from core.models import Lesson, Teacher, TeacherPayment


def calculate_weekly_payments():
    print("Генерация недельных выплат")
    today = timezone.now().date()
    last_sunday = today - timedelta(days=today.weekday() + 1)
    last_monday = last_sunday - timedelta(days=6)
    due_date = last_sunday + timedelta(days=7)  # Оплатить в следующее воскресенье

    completed_lessons = Lesson.objects.filter(
        date__gte=last_monday,
        date__lte=last_sunday,
        status='completed'
    )

    for teacher in Teacher.objects.all():
        teacher_lessons = completed_lessons.filter(teacher=teacher)
        count = teacher_lessons.count()

        if count > 0:
            amount = count * 500  # TODO: заменить константой

            TeacherPayment.objects.update_or_create(
                teacher=teacher,
                week_start_date=last_monday,
                defaults={
                    'week_end_date': last_sunday,
                    'lessons_count': count,
                    'amount': amount,
                    'is_paid': False,
                    'due_date': due_date
                }
            )
