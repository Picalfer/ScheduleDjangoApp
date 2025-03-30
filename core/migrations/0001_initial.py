# Generated by Django 5.1.7 on 2025-03-30 22:55

import django.core.validators
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Client',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100, verbose_name='Имя родителя')),
                ('email', models.EmailField(blank=True, max_length=254, verbose_name='Email')),
                ('phone', models.CharField(blank=True, max_length=20, verbose_name='Телефон')),
                ('balance', models.PositiveIntegerField(default=0, validators=[django.core.validators.MinValueValidator(0)], verbose_name='Баланс уроков')),
            ],
            options={
                'verbose_name': 'Клиент',
                'verbose_name_plural': 'Клиенты',
            },
        ),
        migrations.CreateModel(
            name='OpenSlots',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('weekly_open_slots', models.JSONField(default=dict)),
                ('teacher', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='open_slots', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Открытые часы',
                'verbose_name_plural': 'Открытые часы',
            },
        ),
        migrations.CreateModel(
            name='Student',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100, verbose_name='Имя ученика')),
                ('notes', models.TextField(blank=True, verbose_name='Примечания')),
                ('client', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='students', to='core.client', verbose_name='Клиент (родитель)')),
            ],
            options={
                'verbose_name': 'Ученик',
                'verbose_name_plural': 'Ученики',
            },
        ),
        migrations.CreateModel(
            name='BalanceOperation',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('operation_type', models.CharField(choices=[('add', 'Пополнение'), ('spend', 'Списание'), ('correction', 'Корректировка')], max_length=10, verbose_name='Тип операции')),
                ('amount', models.PositiveIntegerField(verbose_name='Количество уроков')),
                ('date', models.DateTimeField(auto_now_add=True, verbose_name='Дата операции')),
                ('notes', models.CharField(blank=True, max_length=100, verbose_name='Комментарий')),
                ('client', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='operations', to='core.client')),
                ('student', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='core.student', verbose_name='Ученик')),
            ],
            options={
                'verbose_name': 'Операция с балансом',
                'verbose_name_plural': 'Операции с балансом',
                'ordering': ['-date'],
            },
        ),
        migrations.CreateModel(
            name='Teacher',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('user', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Преподаватель',
                'verbose_name_plural': 'Преподаватели',
            },
        ),
        migrations.AddField(
            model_name='student',
            name='teacher',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='core.teacher', verbose_name='Преподаватель'),
        ),
        migrations.CreateModel(
            name='Lesson',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('student_name', models.CharField(blank=True, max_length=100, verbose_name='Имя ученика')),
                ('course', models.CharField(default='Не выбран', max_length=100, verbose_name='Курс')),
                ('lesson_type', models.CharField(choices=[('single', 'Разовый'), ('recurring', 'Регулярный')], max_length=10, verbose_name='Тип урока')),
                ('status', models.CharField(choices=[('scheduled', 'Запланирован'), ('completed', 'Проведён'), ('canceled', 'Отменён')], default='scheduled', max_length=20, verbose_name='Статус')),
                ('date', models.DateField(null=True, verbose_name='Дата урока')),
                ('time', models.TimeField(blank=True, null=True, verbose_name='Время урока')),
                ('schedule', models.JSONField(default=list, help_text='Поле для постоянного расписания', verbose_name='Регулярное расписание')),
                ('lesson_topic', models.CharField(blank=True, max_length=255, null=True, verbose_name='Тема урока')),
                ('lesson_notes', models.CharField(blank=True, max_length=255, null=True, verbose_name='Комментарий преподавателя')),
                ('homework', models.CharField(blank=True, max_length=255, null=True, verbose_name='Домашнее задание')),
                ('cancel_reason', models.CharField(blank=True, default=None, max_length=255, null=True, verbose_name='Причина отмены урока')),
                ('completed_at', models.DateTimeField(blank=True, null=True, verbose_name='Фактическое время проведения')),
                ('canceled_at', models.DateTimeField(blank=True, null=True, verbose_name='Фактическое время проведения')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Дата создания')),
                ('student', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='core.student', verbose_name='Студент')),
                ('teacher', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='core.teacher', verbose_name='Преподаватель')),
            ],
            options={
                'verbose_name': 'Урок',
                'verbose_name_plural': 'Уроки',
                'ordering': ['date', 'time'],
            },
        ),
        migrations.CreateModel(
            name='UserSettings',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('working_hours_start', models.IntegerField(default=9)),
                ('working_hours_end', models.IntegerField(default=18)),
                ('theme', models.CharField(default='light', max_length=10)),
                ('user', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='settings', to=settings.AUTH_USER_MODEL)),
            ],
        ),
    ]
