from io import BytesIO

from django.contrib import admin
from django.http import HttpResponse
from django.utils.timezone import now
from openpyxl import Workbook

from core.models import Teacher, Student, TimeSlot, LessonLog


@admin.register(LessonLog)
class LessonLogAdmin(admin.ModelAdmin):
    list_display = ('id', 'lesson', 'student', 'teacher', 'action', 'created_at')
    list_filter = (
        'action',
        ('teacher', admin.RelatedOnlyFieldListFilter),
        ('student', admin.RelatedOnlyFieldListFilter),
        'created_at'
    )
    search_fields = ('student__name', 'teacher__username', 'notes')
    readonly_fields = ('created_at', 'old_balance', 'new_balance')
    date_hierarchy = 'created_at'
    actions = ['export_logs']  # Регистрируем действие

    # Метод для экспорта логов

    def export_logs(self, request, queryset):
        wb = Workbook()
        ws = wb.active
        ws.title = "Логи уроков"

        # Заголовки
        ws.append([
            'ID', 'ID урока', 'Студент',
            'Преподаватель', 'Действие',
            'Было уроков', 'Стало уроков',
            'Дата проведения', 'Примечания'
        ])

        # Данные
        for log in queryset:
            ws.append([
                log.id,
                log.lesson.id,
                log.student.name,
                log.teacher.get_full_name() or log.teacher.username,
                log.get_action_display(),
                log.old_balance,
                log.new_balance,
                log.created_at.strftime('%d.%m.%Y %H:%M'),
                log.notes
            ])

        # Настройка ширины колонок
        for column in ws.columns:
            max_length = 0
            for cell in column:
                try:
                    if len(str(cell.value)) > max_length:
                        max_length = len(str(cell.value))
                except:
                    pass
            ws.column_dimensions[column[0].column_letter].width = max_length + 2

        buffer = BytesIO()
        wb.save(buffer)
        buffer.seek(0)

        response = HttpResponse(
            buffer.getvalue(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = 'attachment; filename=lesson_logs_%s.xlsx' % now().strftime('%Y-%m-%d')
        return response

    export_logs.short_description = "Экспорт выбранных логов в CSV"

    fieldsets = (
        (None, {
            'fields': ('lesson', 'teacher', 'student', 'action')
        }),
        ('Баланс', {
            'fields': ('old_balance', 'new_balance')
        }),
        ('Дополнительно', {
            'fields': ('created_at', 'notes')
        }),
    )


@admin.register(Teacher)
class TeacherAdmin(admin.ModelAdmin):
    list_display = ('user', 'courses')
    search_fields = ('user__username', 'courses')


@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    list_display = ('name', 'subject', 'teacher', 'bitrix_link')
    list_filter = ('subject', 'teacher')
    search_fields = ('name', 'subject')


class LessonLogInline(admin.TabularInline):
    model = LessonLog
    extra = 0
    readonly_fields = ('teacher', 'student', 'action', 'created_at')
    can_delete = False


from django import forms
from django.contrib import admin


@admin.register(TimeSlot)
class TimeSlotAdmin(admin.ModelAdmin):
    list_display = ('date', 'time', 'teacher', 'student', 'subject', 'is_recurring_display')
    list_filter = ('is_recurring', 'status', 'date')
    inlines = [LessonLogInline]

    def formfield_for_dbfield(self, db_field, request, **kwargs):
        if db_field.name == 'time':
            # Создаем список вариантов времени (только целые часы)
            time_choices = [(f"{hour:02d}:00:00", f"{hour:02d}:00") for hour in range(0, 24)]

            # Используем Select-виджет с ограниченными вариантами
            kwargs['widget'] = forms.Select(choices=time_choices)
            kwargs['help_text'] = 'Выберите час (минуты будут установлены в 00 автоматически)'

        return super().formfield_for_dbfield(db_field, request, **kwargs)

    @admin.display(boolean=True, description='Регулярный?')
    def is_recurring_display(self, obj):
        return obj.is_recurring
