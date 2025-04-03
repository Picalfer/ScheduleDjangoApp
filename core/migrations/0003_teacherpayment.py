# Generated by Django 5.1.7 on 2025-04-01 19:06

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0002_remove_client_phone_phonenumber'),
    ]

    operations = [
        migrations.CreateModel(
            name='TeacherPayment',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('week_start_date', models.DateField()),
                ('lessons_count', models.PositiveIntegerField(default=0)),
                ('amount', models.DecimalField(decimal_places=2, max_digits=10)),
                ('is_paid', models.BooleanField(default=False)),
                ('payment_date', models.DateField(blank=True, null=True)),
                ('teacher', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='payments', to='core.teacher')),
            ],
            options={
                'unique_together': {('teacher', 'week_start_date')},
            },
        ),
    ]
