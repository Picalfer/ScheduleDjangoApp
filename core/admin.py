from django.contrib import admin

from core.models import Teacher, Student, TimeSlot


@admin.register(Teacher)
class TeacherAdmin(admin.ModelAdmin):
    list_display = ('user', 'courses')
    search_fields = ('user__username', 'courses')


@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    list_display = ('name', 'subject', 'teacher', 'bitrix_link')
    list_filter = ('subject', 'teacher')
    search_fields = ('name', 'subject')


@admin.register(TimeSlot)
class TimeSlotAdmin(admin.ModelAdmin):
    list_display = ('date', 'time', 'teacher', 'student', 'subject', 'is_recurring_display')
    list_filter = ('is_recurring', 'status', 'date')

    @admin.display(boolean=True, description='Регулярный?')
    def is_recurring_display(self, obj):
        return obj.is_recurring
