from django import forms
from django.contrib import admin

from core.models import Teacher, Student, Lesson


@admin.register(Teacher)
class TeacherAdmin(admin.ModelAdmin):
    list_display = ('id', 'get_full_name', 'user')

    def get_full_name(self, obj):
        return obj.user.get_full_name()  # Метод для отображения ФИО

    get_full_name.short_description = 'ФИО'  # Заголовок колонки


@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    list_display = ('name', 'teacher', 'bitrix_link', 'lesson_balance')


@admin.register(Lesson)
class LessonAdmin(admin.ModelAdmin):
    list_display = ('date', 'lesson_type', 'teacher', 'start_date', 'time', 'student')
    list_filter = ('lesson_type', 'status', 'date')

    def save_model(self, request, obj, form, change):
        if obj.lesson_type and not obj.start_date:
            obj.start_date = obj.date
        super().save_model(request, obj, form, change)

    def formfield_for_dbfield(self, db_field, request, **kwargs):
        if db_field.name == 'time':
            # Создаем список вариантов времени (только целые часы)
            time_choices = [(f"{hour:02d}:00:00", f"{hour:02d}:00") for hour in range(0, 24)]

            # Используем Select-виджет с ограниченными вариантами
            kwargs['widget'] = forms.Select(choices=time_choices)
            kwargs['help_text'] = 'Выберите час (минуты будут установлены в 00 автоматически)'

        return super().formfield_for_dbfield(db_field, request, **kwargs)

    @admin.display(boolean=True, description='Регулярный?')
    def lesson_type_display(self, obj):
        return obj.lesson_type == 'recurring'
