# Generated by Django 5.1.7 on 2025-04-03 19:56

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0005_alter_teacherpayment_week_end_date'),
    ]

    operations = [
        migrations.AddField(
            model_name='balanceoperation',
            name='balance_after',
            field=models.IntegerField(blank=True, null=True, verbose_name='Баланс после операции'),
        ),
        migrations.AddField(
            model_name='balanceoperation',
            name='balance_before',
            field=models.IntegerField(blank=True, null=True, verbose_name='Баланс до операции'),
        ),
    ]
