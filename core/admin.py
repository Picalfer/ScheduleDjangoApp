from django import forms
from django.contrib import admin

from core.forms import LessonAdminForm
from core.models import Teacher, Student, Lesson, OpenSlots, BalanceOperation, Client


@admin.register(Teacher)
class TeacherAdmin(admin.ModelAdmin):
    list_display = ('id', 'get_full_name', 'user')

    def get_full_name(self, obj):
        return obj.user.get_full_name()

    get_full_name.short_description = 'ФИО'


class StudentInline(admin.TabularInline):
    model = Student
    extra = 1
    fields = ('name', 'teacher')


class BalanceOperationInline(admin.TabularInline):
    model = BalanceOperation
    extra = 0
    readonly_fields = ('date',)
    fields = ('operation_type', 'amount', 'date', 'notes')


@admin.register(Client)
class ClientAdmin(admin.ModelAdmin):
    list_display = ('name', 'email', 'phone')
    readonly_fields = ('balance',)
    search_fields = ('name', 'email', 'phone')
    inlines = [StudentInline, BalanceOperationInline]


@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    list_display = ('name', 'client', 'teacher', 'family_balance')
    list_select_related = ('client', 'teacher')
    search_fields = ('name', 'client__name')


@admin.register(OpenSlots)
class OpenSlotsAdmin(admin.ModelAdmin):
    list_display = ('teacher', 'teacher_name', 'weekly_open_slots')

    def teacher_name(self, obj):
        return obj.teacher.get_full_name()

    teacher_name.short_description = 'ФИО'

    def formfield_for_dbfield(self, db_field, request, **kwargs):
        if db_field.name == 'weekly_open_slots':
            kwargs[
                'help_text'] = 'Пустой вариант: {"monday": [], "tuesday": [], "wednesday": [], "thursday": [], "friday": [], "saturday": [], "sunday": []}'

        return super().formfield_for_dbfield(db_field, request, **kwargs)


@admin.register(Lesson)
class LessonAdmin(admin.ModelAdmin):
    form = LessonAdminForm
    list_display = ('date', 'status', 'lesson_type', 'teacher', 'time', 'student', 'course')
    list_filter = ('lesson_type', 'status', 'date')

    def get_fields(self, request, obj=None):
        # Для создания нового урока (когда obj=None)
        if obj is None:
            return [
                'student', 'teacher', 'course',
                'lesson_type', 'date', 'time', 'schedule'
            ]
        # Для редактирования существующего урока
        return super().get_fields(request, obj)

    def formfield_for_dbfield(self, db_field, request, **kwargs):
        if db_field.name == 'time':
            # Создаем список вариантов времени (только целые часы)
            time_choices = [(f"{hour:02d}:00:00", f"{hour:02d}:00") for hour in range(0, 24)]

            # Используем Select-виджет с ограниченными вариантами
            kwargs['widget'] = forms.Select(choices=time_choices)
            kwargs['help_text'] = 'Выберите час (минуты будут установлены в 00 автоматически)'

        if db_field.name == 'course':
            courses = ["Не выбран", "Roblox", "Scratch", "Создание сайтов", "Python", "Unity", "Figma", "Комп с нуля", "Blender", "Android", "C++"]
            kwargs['widget'] = forms.Select(choices=[(c, c) for c in courses])

        return super().formfield_for_dbfield(db_field, request, **kwargs)

    @admin.display(boolean=True, description='Регулярный?')
    def lesson_type_display(self, obj):
        return obj.lesson_type == 'recurring'
