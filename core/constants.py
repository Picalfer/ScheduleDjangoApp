from django.contrib.auth.models import User
from django.db.models import Q


def get_excluded_teacher_ids():
    return list(
        User.objects.filter(
            Q(first_name='Мария', last_name='Вакулина') |
            Q(first_name='Боровик', last_name='Кожемякин') |
            Q(first_name='Школьный', last_name='Преподаватель')
        ).values_list('id', flat=True)
    )
