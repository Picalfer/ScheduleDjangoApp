from django.contrib import admin

from .models import Course, Level, Guide


class GuideInline(admin.TabularInline):
    model = Guide
    extra = 1
    fields = ('title', 'html_file', 'assets', 'order')


class LevelInline(admin.TabularInline):
    model = Level
    extra = 1
    fields = ('title', 'description', 'order')
    show_change_link = True  # Добавляет ссылку на отдельное редактирование


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ('title', 'levels_count')
    inlines = [LevelInline]

    def levels_count(self, obj):
        return obj.levels.count()

    levels_count.short_description = 'Уровней'


@admin.register(Level)
class LevelAdmin(admin.ModelAdmin):
    list_display = ('title', 'course', 'guides_count')
    list_filter = ('course',)
    inlines = [GuideInline]
    ordering = ('course', 'order')

    def guides_count(self, obj):
        return obj.guides.count()

    guides_count.short_description = 'Методичек'


@admin.register(Guide)
class GuideAdmin(admin.ModelAdmin):
    list_display = ('title', 'level', 'course')
    list_filter = ('level__course',)
    ordering = ('level', 'order')

    def course(self, obj):
        return obj.level.course

    course.short_description = 'Курс'

    def delete_queryset(self, request, queryset):
        for obj in queryset:
            obj.delete()
