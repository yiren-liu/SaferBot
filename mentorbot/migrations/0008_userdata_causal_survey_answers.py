# Generated by Django 2.0.1 on 2020-08-23 06:37

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('mentorbot', '0007_userdata_user_type'),
    ]

    operations = [
        migrations.AddField(
            model_name='userdata',
            name='causal_survey_answers',
            field=models.TextField(default='[]'),
        ),
    ]
