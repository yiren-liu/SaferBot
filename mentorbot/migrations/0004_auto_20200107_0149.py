# Generated by Django 2.0.1 on 2020-01-07 07:49

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('mentorbot', '0003_auto_20191201_0228'),
    ]

    operations = [
        migrations.AlterField(
            model_name='userlog',
            name='action',
            field=models.CharField(max_length=50),
        ),
        migrations.AlterField(
            model_name='userlog',
            name='path',
            field=models.CharField(max_length=100),
        ),
    ]