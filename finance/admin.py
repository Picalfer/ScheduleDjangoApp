from django.contrib import admin

from finance.models import SchoolExpense


@admin.register(SchoolExpense)
class SchoolExpenseAdmin(admin.ModelAdmin):
    list_display = ['category_display', 'amount', 'description', 'expense_date', 'created_at']
    list_filter = ['category', 'expense_date', 'created_at']
    search_fields = ['description', 'amount']
    date_hierarchy = 'expense_date'
    ordering = ['-expense_date']
    list_per_page = 20

    fieldsets = (
        ('Основная информация', {
            'fields': ('category', 'amount', 'description', 'expense_date')
        }),
        ('Системная информация', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )

    readonly_fields = ['created_at']

    def category_display(self, obj):
        return obj.get_category_display()

    category_display.short_description = 'Категория'

    # Действия
    actions = ['mark_as_advertising', 'mark_as_software']

    def mark_as_advertising(self, request, queryset):
        updated = queryset.update(category='advertising')
        self.message_user(request, f'{updated} расходов помечено как "Реклама"')

    mark_as_advertising.short_description = 'Пометить как Реклама'

    def mark_as_software(self, request, queryset):
        updated = queryset.update(category='software')
        self.message_user(request, f'{updated} расходов помечено как "Софт/Подписки"')

    mark_as_software.short_description = 'Пометить как Софт/Подписки'
