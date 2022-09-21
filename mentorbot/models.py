from django.db import models
from django.contrib.auth.models import User
from django.dispatch import receiver
from django.db.models.signals import post_save

class UserData(models.Model):
	user = models.OneToOneField(
		User,
		on_delete=models.PROTECT, # Prevent deletion of the referenced object by raising ProtectedError
	)
	user_type = models.CharField(max_length=100, default='normal')
	progress = models.CharField(max_length=100, default='created')
	completion_code = models.CharField(max_length=10, default='')
	causal_survey_answers = models.TextField(default='[]')
	survey_response_json = models.TextField(default='{}')
	practice_task_json = models.TextField(default='{}')
	actual_task_json = models.TextField(default='{}')
	condition = models.CharField(max_length=100)
	campaign_data_config = models.TextField(default="{}")
	logs = models.TextField(default="[]")

	def __unicode__(self):
		return '%s' % (self.user_id)

# Comment out the following two functions to disable auto-creating user data (and manually create UserData in views.py)
# https://simpleisbetterthancomplex.com/tutorial/2016/07/22/how-to-extend-django-user-model.html
# https://simpleisbetterthancomplex.com/tutorial/2016/07/28/how-to-create-django-signals.html
@receiver(post_save, sender=User)
def create_user_data(sender, instance, created, **kwargs):
    if created:
        UserData.objects.create(user=instance)

@receiver(post_save, sender=User)
def save_user_data(sender, instance, **kwargs):
    instance.userdata.save()


class UserLog(models.Model):
	user = models.ForeignKey(
		User,
		on_delete=models.PROTECT, # Prevent deletion of the referenced object by raising ProtectedError
	)
	timestamp = models.DateTimeField()
	path = models.CharField(max_length=100)
	action = models.CharField(max_length=50)
	message_json = models.TextField(default="{}")

class CausalDiagram(models.Model):
	username = models.CharField(max_length=100)
	context = models.CharField(max_length=100)
	label = models.CharField(max_length=100)
	variables_json = models.TextField(default="[]")
	causal_diagram_json = models.TextField(default="{}")
	timestamp = models.DateTimeField(auto_now=True) # auto-filled whenever save() is called

class RegressionResult(models.Model):
	cache_key = models.TextField()
	Yname = models.TextField()
	Xnames = models.TextField()
	result_json = models.TextField()


# data models for the MentorBot
class Essay(models.Model):
	author_name = models.CharField(max_length=100)
	create_time = models.DateTimeField(auto_now=True)
	topic_id = models.CharField(max_length=100)
	text = models.TextField(default="")

class Feedback(models.Model):
	essay = models.ForeignKey(
		Essay,
		on_delete=models.PROTECT, # Prevent deletion of the referenced object by raising ProtectedError
	)
	author_name = models.CharField(max_length=100)
	create_time = models.DateTimeField(auto_now=True)
	text = models.TextField(default="")
