# Run this script in the data/ folder to create the data file
# > cd mentorbot/static/data/
# > python ../../safety_data.py


import calendar # get names of the months
import csv
import numpy as np
import pandas as pd

# for saving files
from django.conf import settings
from django.core.files import File


MONTH_NAMES = np.array(calendar.month_name)
MONTHS = list(range(1, 13))
HOURS = list(range(24))
SCHOOL_MONTHS = [2, 3, 4, 5, 9, 10, 11, 12] # Feb. to May and Sep. to Dec.
NIGHT_HOURS = [20, 21, 22, 23, 0, 1] # 8 PM to 2 AM

# Bayesian model
def rand_generate_safety_data(seed = 10000):
	# setting
	np.random.seed(seed)
	reports_per_month = 1000
	reports_total = len(MONTHS) * reports_per_month

	#### generate Month and hour
	data_month = np.random.choice(MONTHS, reports_total)
	data_month_name = MONTH_NAMES[data_month]
	data_hour = np.random.choice(HOURS, reports_total)

	#### generate category
	data_is_school_month = np.isin(data_month, SCHOOL_MONTHS)
	data_is_night_hour = np.isin(data_hour, NIGHT_HOURS)
	# # prob. distribution of NOISE REPORT    SCHOOL MONTH  |   NOT SCHOOL MONTH
	# #                     NIGHT           |      90%      |       75%
	# #                     NOT NIGHT       |      75%      |       60%
	# data_noise_prob = np.ones(reports_total) * 0.6 + 0.15 * data_is_school_month + 0.15 * data_is_night_hour

	# prob. distribution of NOISE REPORT:    SCHOOL MONTH (85%)  |   NOT SCHOOL MONTH (65%)
	data_noise_prob = np.ones(reports_total) * 0.65 + 0.2 * data_is_school_month
	data_category = np.where(np.random.random(reports_total) < data_noise_prob, 'Noise Disturbance', 'Drug/Alcohol')

	#### generate is_anonymous
	# # Noise: 80%, Not Noise: 40%
	# data_anonymous_prob = np.where(data_category == 'Noise Disturbance', 0.8, 0.4)

	# prob. distribution of Anonymous          NOT SCHOOL MONTH  |   SCHOOL MONTH
	#                     DRUG/ALCOHOL      |      90%           |       75%
	#                     NOISE             |      75%           |       60%
	data_anonymous_prob = np.ones(reports_total) * 0.6 + 0.15 * ~data_is_school_month + 0.15 * (data_category != 'Noise Disturbance')
	data_anonymous = np.where(np.random.random(reports_total) < data_anonymous_prob, True, False)

	#### generate has_location
	# data_location = np.where(np.random.random(reports_total) < 0.5, True, False)

	# prob. distribution of HAS LOCATION:    SCHOOL MONTH (85%)  |   NOT SCHOOL MONTH (65%)
	data_location_prob = np.ones(reports_total) * 0.65 + 0.2 * data_is_school_month
	data_location = np.where(np.random.random(reports_total) < data_location_prob, True, False)

	#### generate text_length
	# prob. distribution of Long Text          NOT NIGHT HOUR    |   NIGHT HOUR
	#                     DRUG/ALCOHOL      |      80%           |       50%
	#                     NOISE             |      50%           |       20%
	data_text_length_long_prob = np.ones(reports_total) * 0.2 + 0.3 * ~data_is_night_hour + 0.3 * (data_category != 'Noise Disturbance')
	data_text_length_type = np.where(np.random.random(reports_total) < data_text_length_long_prob, 'long', 'short')

	long_text_raw = np.random.normal(loc=150, scale=40.0, size=reports_total)
	long_text = np.clip(long_text_raw.astype('int'), 5, 300)
	short_text_raw = np.random.normal(loc=90, scale=40.0, size=reports_total)
	short_text = np.clip(short_text_raw.astype('int'), 5, 300)
	data_text_length = np.where(data_text_length_type == 'long', long_text, short_text)

	#### generate replied
	# # Anonymous: 90%, Not anonymous: 60%
	# data_replied_prob = np.where(data_anonymous, 0.9, 0.6)
	# Anonoymous: 20% - 40% - 60% - 80%: NOT NIGHT HOUR, PROVIDE GPS, IS ANONYMOUS each increase the probability of 20%
	data_replied_prob = np.ones(reports_total) * 0.2 + 0.2 * ~data_is_night_hour + 0.2 * data_location + 0.2 * data_anonymous
	data_replied = np.where(np.random.random(reports_total) < data_replied_prob, True, False)

	#### compile dataframe
	data_df = pd.DataFrame({
			'month': data_month_name,
			'hour': data_hour,
			'event_category': data_category,
			'is_anonymous': data_anonymous,
			'event_text_length': data_text_length,
			'has_location': data_location,
			'replied': data_replied,
		})

	#### save to file
	out_file = 'gen_safety_data_model1_' + str(seed) + '.csv'
	with open(settings.MEDIA_ROOT + out_file, 'w') as OFile:
		data_df.to_csv(OFile)

if __name__ == "__main__":
	settings.configure()
	rand_generate_safety_data(1)
