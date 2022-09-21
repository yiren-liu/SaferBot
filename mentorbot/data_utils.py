##################################################################################################################
#   Generate random dataset with certain relations among variables
##################################################################################################################

# to test the functions in Python shell:
'''
import visualanalytics.data_utils as va_data
datafilepath = 'static/data/gen_safety_data_model1_1.csv.csv'
Yname = 'month'
Xnames = ['event_category']
va_data.regressionAnalysis(datafilepath, Yname, Xnames)
'''

# (first, run imports and the constant variables before the function definitions)
'''
fullfilepath = 'visualanalytics/static/data/gen_safety_data_model1_1.csv'
df = df = pd.read_csv(fullfilepath)
Yname = 'hour'
Xnames = ['month']

bool_cols = df.dtypes == bool
df[df.columns[bool_cols]] = df[df.columns[bool_cols]].astype(int)
col_get_dummies = [Xname for Xname in Xnames if Xname in NEED_DUMMY]
df = pd.get_dummies(df, columns=col_get_dummies, drop_first=True)

if FIELD_TYPE[Yname] == 'categorical':
	regressionType = 'MNLogit'
else:
	regressionType = 'OLS'
	# Note: if X and Y are both numerical, switching X and Y for IV and DV will give you the same p-value.

Y = df[Yname]
Xnames_dummy = [col for col in df.columns
	# col is one of the original Xnames
	if (col in Xnames) or
	   # or col starts with one of the dummified col + '_'
	   (any([col.startswith(dummy_col + '_') for dummy_col in col_get_dummies]))
]

X = df[Xnames_dummy]
X = sm.add_constant(X)

if regressionType == 'MNLogit':
	model = sm.MNLogit(Y,X)
else:
	model = sm.OLS(Y,X)

result = model.fit()
result_summary = result.summary()
print(result_summary)


'''

# to read data in Python shell:
'''
df = pd.read_csv('visualanalytics/static/data/gen_safety_data_1.csv')
'''


# to suppress a 'useless' warning (https://stackoverflow.com/questions/40845304/runtimewarning-numpy-dtype-size-changed-may-indicate-binary-incompatibility)
import warnings
warnings.filterwarnings("ignore", message="numpy.dtype size changed")
warnings.filterwarnings("ignore", message="numpy.ufunc size changed")


# to flush output
import sys
import os
import csv
import numpy as np


# for saving files
from django.conf import settings
from django.core.files import File

# for regression analysis
import pandas as pd
import statsmodels.api as sm
# import matplotlib.pyplot as plt

# a workaround to fix an open issue: https://github.com/statsmodels/statsmodels/issues/3931
from scipy import stats
stats.chisqprob = lambda chisq, df: stats.chi2.sf(chisq, df)

# def plothist(data):
# 	plt.hist(data)
# 	plt.show()

"""
	Hard-coded data
"""
# Note: do not use variable names that starts with another variable name (e.g., 'hour', 'hour_2');
# Otherwise, the columns will be messed up when it get dummified
#
# This determines whether to use OLS or Logit when the variable is treated as an dependent variable
FIELD_TYPE = {
	# safety
	'replied': 'categorical',
	'event_category': 'categorical',
	'month': 'categorical',
	'hour': 'categorical',
	'has_location': 'categorical',
	'event_text_length': 'numerical',
	'is_anonymous': 'categorical',
	# campaign
	'success': 'categorical',
	'goal': 'numerical',
	'shares': 'numerical',
	'category': 'categorical',
	'country': 'categorical',
	'length': 'numerical',
	'duration': 'numerical',
	'month': 'categorical',
	# college application
	'gender': 'categorical',
	'admission': 'categorical',
	'department': 'categorical',
	# Car MPG
	'mpg': 'numerical',
	'cylinders': 'numerical',
	'displacement': 'numerical',
	'horsepower': 'numerical',
	'weight': 'numerical',
	'acceleration': 'numerical',
	'model_year': 'categorical',
	'origin': 'categorical',
	# Houses
	'wear_level': 'categorical',
	'year_built': 'categorical',
	'size': 'numerical',
	'price': 'numerical',
	'neighborhood_safety': 'categorical',
}

# categorical fields that either (1) have more than 2 levels or (2) is a string.
# these fields needs to be "dummified" if they are IV
#
# normal_term: do not use variable names that starts with another variable name (e.g., 'hour', 'hour_2');
# Otherwise, the columns will be messed up when it get dummified
#
# essentially this is a subset of the categorical variables above, excluding binary variables like 'success'
NEED_DUMMY = [
	# safety
	'month',
	'hour',
	'event_category',
	# campaign
	'category',
	'country',
	# application
	'gender',
	'department',
	# Car MPG
	'model_year',
	'origin',
	# Houses
	'wear_level',
	'neighborhood_safety',
]

"""
	Basic statistical model wrappers
"""

# c1 and c2 as categorical fields.
# e.g., chisquare(dataset, 'replied', 'is_anonymous')
def chisquare(df, c1, c2):
	chi2, p, dof, expected = stats.chi2_contingency(observed=pd.crosstab(df[c1], df[c2]))
	return {'pvalue': p}

# n1 and n2 are numeical value.
# e.g., pearson(dataset, 'weight', 'height')
def pearson(df, n1, n2):
	coef, p = stats.pearsonr(df[n1], df[n2])
	return {'coef': coef, 'pvalue': p}

# n1 and n2 are numeical value. (Non-normality)
def spearman(df, n1, n2):
	result = stats.spearmanr(df[n1], df[n2])
	return {'pvalue': result.pvalue}

# one categorical and one numerical variable. (Non-normality)
def kruskal(df, c, n):
	result = stats.kruskal(*[df.iloc[subgroup_index][n].values for subgroup_index in df.groupby(by=c).groups.values()])
	return {'pvalue': result.pvalue}

# x and y should be numerical data
def mutualinfo(df, x, y):
	return {'mutual_info': mutual_info_regression(df[x].values.reshape(-1,1),df[y].values)[0]}

"""
	Automatic pairwise statistical testing
"""

# Run auto pairwise testings between each field in the dataframe.
# Return a list with p-value and the tested pair
def pairwiseTests(df, field_types):
	pairwise_tests = []

	# For each combination
	for pair in list(itertools.combinations(list(cast_dataset.columns), 2)):
		v1, v2 = pair
		v1_type, v2_type = field_types[v1], field_types[v2]

		# Run tests based on variable type, currently assumes non-normality
		if (v1_type == 'categorical' and v2_type == 'categorical'):
			result = chisquare(df, v1, v2)
		elif (v1_type == 'categorical' and v2_type == 'numerical'):
			result = kruskal(df, v1, v2)
		elif (v1_type == 'numerical' and v2_type == 'categorical'):
			result = kruskal(df, v2, v1)
		elif (v1_type == 'numerical' and v2_type == 'numerical'):
			result = spearman(df, v1, v2)

		pairwise_tests.append([result['pvalue'], pair])

	# sort by p-value from low to high
	pairwise_tests.sort()

	return pairwise_tests


def rand_generate_campaign_data(user_id = 'default', seed = 10000):
	np.random.seed(seed)

	######## configuring the relations existing in the dataset
	# Manual
	z_goal = 0
	z_shares = 1
	z_category = 1
	z_country = 0
	z_length = 1
	z_duration = 0

	AX_goal = 0
	AX_shares = 1
	AX_category = 1
	AX_country = 0
	AX_length = 1
	AX_duration = 0

	# Random
	conditions = [(1,1),(0,1),(1,0)]*2
	random_conditions = np.random.permutation(conditions)
	z_goal     = random_conditions[0][0]
	z_shares   = random_conditions[1][0]
	z_category = random_conditions[2][0]
	z_country  = random_conditions[3][0]
	z_length   = random_conditions[4][0]
	z_duration = random_conditions[5][0]

	AX_goal     = random_conditions[0][1]
	AX_shares   = random_conditions[1][1]
	AX_category = random_conditions[2][1]
	AX_country  = random_conditions[3][1]
	AX_length   = random_conditions[4][1]
	AX_duration = random_conditions[5][1]

	# Manual for Testing
	z_goal = 0
	z_shares = 1
	z_category = -0.15 # +: food has lower success rate
	z_country = 1
	z_length = 0
	z_duration = 0

	AX_goal = 0
	AX_shares = 1
	AX_category = 1
	AX_country = 1
	AX_length = 0
	AX_duration = 0

	variables = ['goal', 'shares', 'category', 'country', 'length', 'duration']
	variables_pattern = [ ('A' if random_conditions[i][1] else '-') + ('B' if random_conditions[i][0] else '-') for i in range(6)]
	for i, variable in enumerate(variables):
		print ('%10s:  ' % variable)
		if random_conditions[i][1]:
			print ('A-X, ')
		else:
			print ('---, ')
		if random_conditions[i][0]:
			print ('X-B, ')
		else:
			print ('---, ')
		print (variables_pattern[i], '\n')



	######## general settings
	MONTH = [1, 2, 3]
	# campaign_per_month = 5000
	campaign_per_month = 1000
	campaign_per_month = 2000 # Testing, in study we used 1000
	campaign_number = len(MONTH) * campaign_per_month

	#### generate Month: (1, 2, 3)
	data_month = np.random.choice(MONTH, campaign_number)
	# plothist(data_month)
	month_unique, month_unique_count = np.unique(data_month, return_counts=True)

	#### generate goal
	# based on month
	if AX_goal:
		data_goal_raw = data_month * 2500 + np.random.normal(loc=0.0, scale=1000.0, size=campaign_number)
		data_goal = np.clip(data_goal_raw.astype('int'), 100, 12000) # set boundaries
	else:
		data_goal_raw = 2 * 2500 + np.random.normal(loc=0.0, scale=1000.0, size=campaign_number)
		data_goal = np.clip(data_goal_raw.astype('int'), 100, 12000)
	# plothist(data_goal)

	#### generate shares
	# based on month
	if AX_shares:
		data_shares_raw = (len(MONTH) + 1 - data_month) * 150 + np.random.normal(loc=0.0, scale=100.0, size=campaign_number)
		data_shares = np.clip(data_shares_raw.astype('int'), 0, 900)
	else:
		data_shares_raw = (len(MONTH) + 1 - 2) * 150 + np.random.normal(loc=0.0, scale=100.0, size=campaign_number)
		data_shares = np.clip(data_shares_raw.astype('int'), 0, 900)

	# plothist(data_shares)

	#### generate description length
	# based on month (750, 500, 250)
	if AX_length:
		data_length_raw = (len(MONTH) + 1 - data_month) * 250 + np.random.normal(loc=0.0, scale=200.0, size=campaign_number)
		data_length = np.clip(data_length_raw.astype('int'), 50, 1500)
	else:
		data_length_raw = (len(MONTH) + 1 - 2) * 250 + np.random.normal(loc=0.0, scale=200.0, size=campaign_number)
		data_length = np.clip(data_length_raw.astype('int'), 50, 1500)
	data_length_logit = data_length

	#### generate duration
	# based on month (30, 60, 90)
	if AX_duration:
		data_duration_raw = (data_month) * 30 + np.random.normal(loc=0.0, scale=20.0, size=campaign_number)
		data_duration = np.clip(data_duration_raw.astype('int'), 1, 150)
	else:
		data_duration_raw = (2) * 30 + np.random.normal(loc=0.0, scale=20.0, size=campaign_number)
		data_duration = np.clip(data_duration_raw.astype('int'), 1, 150)
	data_duration_logit = -data_duration

	#### generate categories: (X, Y) = (1, 2)
	# based on month: (1: X: 0.3, Y: 0.7), (2: X: 0.5, Y: 0.5), (3: X: 0.7, Y: 0.3)
	# not based on month: X: 0.5, Y: 0.5
	if AX_category:
		data_category = np.zeros(campaign_number)
		for i, month in enumerate(month_unique):
			if month == 1:
				weights = [0.3, 0.7]
			elif month == 2:
				weights = [0.5, 0.5]
			elif month == 3:
				weights = [0.7, 0.3]
			else:
				raise ValueError("{month} is not valid".format(month=repr(month)))
			data_category[data_month==month] = np.random.choice([1, 2], size=month_unique_count[i], p=weights)
	else:
		data_category = np.random.choice([1, 2], size=campaign_number, p=[0.5, 0.5])
	data_category_logit = (data_category == 2).astype('float') # category 1 has higher success logit

	#### generate countries: (A, B) = (1, 2)
	# based on month: (1: A: 0.7, B: 0.3), (2: A: 0.5, B: 0.5), (3: A: 0.3, B: 0.7)
	# not based on month: A: 0.5, B: 0.5
	if AX_country:
		data_country = np.zeros(campaign_number)
		for i, month in enumerate(month_unique):
			if month == 1:
				weights = [0.7, 0.3]
			elif month == 2:
				weights = [0.5, 0.5]
			elif month == 3:
				weights = [0.3, 0.7]
			else:
				raise ValueError("{month} is not valid".format(month=repr(month)))
			data_country[data_month==month] = np.random.choice([1, 2], size=month_unique_count[i], p=weights)
	else:
		data_country = np.random.choice([1, 2], size=campaign_number, p=[0.5, 0.5])
	data_country_logit = (data_country == 1).astype('float') # country 2 has higher success logit


	######### generate success
	beta_0 = - (-(z_goal / np.std(data_goal)) * np.mean(data_goal) + (z_shares / np.std(data_shares) * np.mean(data_shares)) + (z_category / np.std(data_category) * np.mean(data_category_logit)) + (z_country / np.std(data_country) * np.mean(data_country_logit)) + (z_length / np.std(data_length) * np.mean(data_length_logit)) + (z_duration / np.std(data_duration) * np.mean(data_duration_logit)))
	success_logit = beta_0 + (-(z_goal / np.std(data_goal)) * data_goal + (z_shares / np.std(data_shares)) * data_shares) + ( z_category / np.std(data_category_logit) * data_category_logit) + ( z_country / np.std(data_country_logit) * data_country_logit) + (z_length / np.std(data_length) * data_length_logit) + (z_duration / np.std(data_duration) * (data_duration_logit))

	logit_normalize_range = 3
	normal_term = logit_normalize_range / np.amax(success_logit)
	success_logit_normalized = success_logit * normal_term
	# plothist(success_logit_normalized)

	success_prob = np.exp(success_logit_normalized) / (1 + np.exp(success_logit_normalized))
	data_success = np.random.random(campaign_number) < success_prob


	campaign_id = range(1, campaign_number+1)
	campaigns_data = zip(campaign_id, data_month, data_goal, data_shares, data_success, data_category, data_country, data_length, data_duration)
	campaigns = [dict(zip(['id', 'month', 'goal', 'shares', 'success', 'category', 'country', 'length', 'duration'], campaign)) for campaign in campaigns_data]

	######### output campaigns
	ofile = user_id + '_' + str(seed) + "_campaigns_data.csv"
	with open(settings.MEDIA_ROOT + ofile, 'w') as csvOFile:
		djangoFile = File(csvOFile)
		print (djangoFile.name)
		writer = csv.writer(djangoFile, quoting=csv.QUOTE_ALL)
		oHeader = ['id', 'month', 'goal', 'shares', 'success', 'category', 'country', 'length', 'duration']
		writer.writerow(oHeader)

		for campaign in campaigns:
			writer.writerow([campaign[key] for key in oHeader])

	config = {
		'data_path':	ofile,
		'data_pattern':	dict(zip(variables, variables_pattern)),
		'random_seed':	seed,
	}
	return config

# TODO: separate these functions to another file
# takes Yname as DV and Xnames as IVs, use sm.MNLogit for categorical data, sm.OLS for numerical data
#
# Xnames: an array or a string indicating the X variable key
def regressionAnalysis(datafilepath, Yname, Xnames):
	# print (sm.version.version)
	# datafile can be in static/ file
	# df = pd.read_csv(datafilepath)
	filepath = datafilepath.lstrip(os.sep) # remove the leading seperator; otherwise will be treated as absolute path in os.join function
	basepath = os.path.dirname(os.path.realpath(__file__))
	fullfilepath = os.path.join(basepath, filepath)

	df = pd.read_csv(fullfilepath)


	# print(df.dtypes)

	# convert bool columns to int
	# (bool IV cannot be used in sm.OLS() and sm.Logit())
	# (bool DV or int DV give the same results, but for the sake of simplicity, we can just convert bool to int)
	bool_cols = df.dtypes == bool
	df[df.columns[bool_cols]] = df[df.columns[bool_cols]].astype(int)

	# allow specifying a single variable key with a string
	if type(Xnames) != list:
		Xnames = [Xnames]

	# # convert string (object) columns to int
	# object_cols = df.dtypes == object
	# for i, col in enumerate(df.columns):
	# 	if object_cols[i]:
	# 		df[col] = pd.factorize(df[col])[0]
	# one-hot encoding
	col_get_dummies = [Xname for Xname in Xnames if Xname in NEED_DUMMY]
	df = pd.get_dummies(df, columns=col_get_dummies, drop_first=True)

	# print('after preprocessing')
	print(df.dtypes)


	# Note: using MNLogit or Logit for binary variable give you the same results, so we can just use MNLogit
	# if Yname in ['success', 'category', 'country', 'month', 'replied', 'event_category', 'hour', 'has_location', 'is_anonymous']:
	if FIELD_TYPE[Yname] == 'categorical':
		regressionType = 'MNLogit'
	else:
		regressionType = 'OLS'
		# Note: if X and Y are both numerical, switching X and Y for IV and DV will give you the same p-value.

	Y = df[Yname]
	Xnames_dummy = [col for col in df.columns
		# col is one of the original Xnames
		if (col in Xnames) or
		   # or col starts with one of the dummified col + '_'
		   (any([col.startswith(dummy_col + '_') for dummy_col in col_get_dummies]))
	]

	X = df[Xnames_dummy]
	X = sm.add_constant(X)

	if regressionType == 'MNLogit':
		model = sm.MNLogit(Y,X)
	else:
		model = sm.OLS(Y,X)

	result = model.fit()
	result_summary = result.summary()
	print(result_summary)


	# names = result.pvalues.index.tolist()
	# print(names)

	# for name in names:
	# 	print(result.pvalues.loc[name])

	# Note: the below output is related to an open issue: https://github.com/statsmodels/statsmodels/issues/3931
	# without the workaround, "[0]" must be removed as result.pvalues.loc[name] becomes a float number
	# the above note does not matter after the note below is applied

	# Note: if Y is a categorical variable with k levels, result.pvalues.loc[name] will be
	# an array (Series) with k-1 p-values (using the first value as the reference group).
	# Otherwise, when Y is a binary variable, result.pvalues.loc[name] will be an array with one p-value.
	# Either way, use min() to get the most significant result.
	# This should work for both 'MNLogit' and 'OLS'
	cols = result.pvalues.index.tolist()
	output = {}
	for col in cols:
		# columns that are not dummified
		p = result.pvalues.loc[col].min()
		if col in Xnames:
			output[col] = p
		else:
			# find which original column is
			for dummy_col in col_get_dummies:
				if col.startswith(dummy_col + '_'):
					# add or update the p value of this col
					output[dummy_col] = min(output.get(dummy_col, 1), p)
					break

	print (output)
	sys.stdout.flush()

	return {
		'info': {
			'pvalues': str(result.pvalues),
			'summary': str(result_summary),
		} ,
		'output': output,
	}



if __name__ == "__main__":
	# rand_generate_campaign_data()



	# Y = df['success']
	# X = df[['month','length','country']]
	# X = sm.add_constant(X)
	# model = sm.MNLogit(Y,X)
	# result = model.fit()
	# print(result.summary())


	# regressionAnalysis('success', ['month', 'country', 'duration', 'category', 'shares', 'goal'])
	df = pd.read_csv('mentorbot/static/data/gen_safety_data_model1_1.csv.csv')
	Yname = 'event_category'
	Xnames = ['hour', 'is_anonymous']


# import numpy as np
# import pandas as pd
# import statsmodels.api as sm
# df = pd.read_csv('media/seed0_0_campaigns_data_numericalcoded.csv')
# Y = df['success']
# X = df[['month', 'country', 'duration', 'category', 'shares', 'goal']]
# X = sm.add_constant(X)
# model = sm.MNLogit(Y,X)
# result = model.fit()
