# Run this script in the data/ folder to create the data file
# > cd visualanalytics/static/data/
# > python ../../scripts/gen_house_data.py


# import calendar # get names of the months
import csv
import numpy as np
import pandas as pd

# for saving files
from django.conf import settings
from django.core.files import File

YEARS = list(range(2000, 2010))

# Bayesian model
def rand_generate_safety_data(seed = 1):
	model = 1 # or 1

	# setting
	np.random.seed(seed)
	houses_per_year = 100
	houses_total = len(YEARS) * houses_per_year

	#### Year Built
	data_year_built = np.random.choice(YEARS, houses_total)
	
	#### Size
	# year 2000 - 2010: 1000 - 2000 sq-ft
	data_size_raw = 1000 + (data_year_built - 2000) * 100 + np.random.normal(loc=0, scale=300, size=houses_total)
	data_size = np.clip(data_size_raw.astype('int'), 500, 10000)

	if model == 2:
		data_size_raw = np.random.normal(loc=1500, scale=600, size=houses_total)
		data_size = np.clip(data_size_raw.astype('int'), 500, 10000)

	#### Price (1500 sq-ft => $500,000)
	data_price_raw = data_size * 500000 / 1500 + np.random.normal(loc=0, scale=300000, size=houses_total)

	if model == 2:
		# Price (2000 - 2010 year => $300,000 - $800,000)
		data_price_raw = 300000 + (data_year_built - 2000) * 50000 + np.random.normal(loc=0, scale=200000, size=houses_total)
	
	data_price = np.clip(data_price_raw.astype('int'), 50000, 100000000)

	### Wear Level (High: 80% -> 30% from 2000 to 2010)
	data_wear_level_prob = 0.8 - 0.5 * (data_year_built - 2000) / 10
	data_wear_level = np.where(np.random.random(houses_total) < data_wear_level_prob, 'High', 'Low')

	if model == 2:
		data_wear_level = np.where(np.random.random(houses_total) < 0.5, 'High', 'Low')

	### Neighborhood Safety
	data_neighborhood_safety = np.where(np.random.random(houses_total) < 0.7, 'Good', 'Poor')

	#### compile dataframe
	data_df = pd.DataFrame({
			'year_built': data_year_built,
			'size': data_size,
			'price': data_price,
			'wear_level': data_wear_level,
			'neighborhood_safety': data_neighborhood_safety,
		})

	#### save to file
	out_file = 'gen_house_data_practice_' + str(seed) + '.csv'
	with open(settings.MEDIA_ROOT + out_file, 'w') as OFile:
		data_df.to_csv(OFile)

if __name__ == "__main__":
	settings.configure()
	rand_generate_safety_data()