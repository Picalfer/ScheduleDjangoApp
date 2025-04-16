# Generated by Django 5.1.7 on 2025-04-16 11:31

import django.utils.timezone
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('core', '0011_remove_lesson_is_reliable'),
    ]

    operations = [
        migrations.AlterModelOptions(
            name='teacherpayment',
            options={'ordering': ['-created_at'], 'verbose_name': 'Выплата преподавателю',
                     'verbose_name_plural': 'Выплаты преподавателям'},
        ),
        migrations.AddField(
            model_name='teacherpayment',
            name='created_at',
            field=models.DateTimeField(default=django.utils.timezone.now, verbose_name='Дата создания'),
        ),
    ]
