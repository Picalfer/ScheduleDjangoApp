# Generated by Django 5.1.7 on 2025-03-22 07:58

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0002_usersettings_delete_post'),
    ]

    operations = [
        migrations.AddField(
            model_name='usersettings',
            name='theme',
            field=models.CharField(default='light', max_length=10),
        ),
    ]
