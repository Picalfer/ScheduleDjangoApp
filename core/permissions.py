def is_administrator(user):
    """Проверка, что пользователь имеет права администратора"""
    return user.is_authenticated and (user.is_staff or user.is_superuser)


def is_manager(user):
    """Проверка, что пользователь менеджер"""
    return user.is_authenticated and user.groups.filter(name='Менеджеры').exists()


def is_teacher(user):
    """Проверка, что пользователь преподаватель"""
    return user.is_authenticated and user.groups.filter(name='Преподаватели').exists()
