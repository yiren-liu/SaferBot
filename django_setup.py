# This script is for running scripts that need "Django" access
#
# For Python console, do
# >>> from django_setup import *
#
# >>> # then you can use django related modules
#
# setting up the environment variable
import os
os.environ["DJANGO_SETTINGS_MODULE"] = "gettingstarted.settings"

import django
django.setup()

# to access Django User model
from django.contrib.auth.models import User

# to access user defined models
from mentorbot.models import *
