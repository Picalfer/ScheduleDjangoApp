from django.contrib.auth.models import User
from django.db.models import Q

EXCLUDED_TEACHERS_IDS = list(
    User.objects.filter(
        Q(first_name='Мария', last_name='Вакулина') |
        Q(first_name='Артур', last_name='Кожемякин') |
        Q(first_name='Тестовый', last_name='Препод')
    ).values_list('id', flat=True)
)


def get_excluded_teacher_ids():
    return list(
        User.objects.filter(
            Q(first_name='Мария', last_name='Вакулина') |
            Q(first_name='Боровик', last_name='Кожемякин') |
            Q(first_name='Школьный', last_name='Преподаватель')
        ).values_list('id', flat=True)
    )
