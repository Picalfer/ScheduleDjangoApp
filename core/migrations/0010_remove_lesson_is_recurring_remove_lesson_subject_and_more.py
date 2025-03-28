# Generated by Django 5.1.7 on 2025-03-27 14:47

import django.db.models.deletion
import django.utils.timezone
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0009_rename_timeslot_to_lesson'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='lesson',
            name='is_recurring',
        ),
        migrations.RemoveField(
            model_name='lesson',
            name='subject',
        ),
        migrations.RemoveField(
            model_name='student',
            name='subject',
        ),
        migrations.RemoveField(
            model_name='teacher',
            name='courses',
        ),
        migrations.AddField(
            model_name='lesson',
            name='course',
            field=models.CharField(default='Не выбран', max_length=100, verbose_name='Курс'),
        ),
        migrations.AddField(
            model_name='lesson',
            name='created_at',
            field=models.DateTimeField(auto_now_add=True, default=django.utils.timezone.now, verbose_name='Дата создания'),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='lesson',
            name='lesson_type',
            field=models.CharField(choices=[('single', 'Разовый'), ('recurring', 'Регулярный')], default='single', max_length=10, verbose_name='Тип урока'),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='lesson',
            name='schedule',
            field=models.JSONField(default=list, help_text='Формат: [{"day": "monday", "time": "14:00"}, {"day": "wednesday", "time": "16:00"}]', verbose_name='Расписание'),
        ),
        migrations.AlterField(
            model_name='lesson',
            name='completed_at',
            field=models.DateTimeField(blank=True, null=True, verbose_name='Фактическое время проведения'),
        ),
        migrations.AlterField(
            model_name='lesson',
            name='date',
            field=models.DateField(blank=True, null=True, verbose_name='Дата'),
        ),
        migrations.AlterField(
            model_name='lesson',
            name='lesson_notes',
            field=models.TextField(blank=True, null=True, verbose_name='Комментарий преподавателя'),
        ),
        migrations.AlterField(
            model_name='lesson',
            name='start_date',
            field=models.DateField(blank=True, null=True, verbose_name='Дата начала повторений'),
        ),
        migrations.AlterField(
            model_name='lesson',
            name='status',
            field=models.CharField(choices=[('scheduled', 'Запланирован'), ('completed', 'Проведён'), ('canceled', 'Отменён')], default='scheduled', max_length=20, verbose_name='Статус'),
        ),
        migrations.AlterField(
            model_name='lesson',
            name='student',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='core.student', verbose_name='Студент'),
        ),
        migrations.AlterField(
            model_name='lesson',
            name='teacher',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='core.teacher', verbose_name='Преподаватель'),
        ),
        migrations.AlterField(
            model_name='lesson',
            name='time',
            field=models.TimeField(blank=True, null=True, verbose_name='Время'),
        ),
        migrations.DeleteModel(
            name='LessonLog',
        ),
    ]
