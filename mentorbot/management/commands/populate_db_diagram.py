from django.conf import settings
from django.core.management.base import BaseCommand
from mentorbot.models import CausalDiagram

import csv, os

# reference: https://eli.thegreenplace.net/2014/02/15/programmatically-populating-a-django-database

class Command(BaseCommand):
	args = '<foo bar ...>'
	help = 'our help string comes here'

	def handle(self, *args, **options):
		diagram_filename = 'mentorbot/static/data/compiled_diagrams.csv'
		filepath = os.path.join(settings.BASE_DIR, diagram_filename)

		with open(diagram_filename, 'r') as diagram_file:
			diagram_reader = csv.DictReader(diagram_file)

			saved = 0
			for row in diagram_reader:
				
				records = CausalDiagram.objects.filter(
					username=row['username'],
					label=row['label'],
					context=row['context'],
				)

				# delete original data that matches 'username', 'label', and 'context' specified in the compiled data
				if records:
					n = records.delete()
					print('Deleted %d record(s) of %s with label %s' % (n[0], row['username'], row['label']))

				# save diagram data into the database
				record = CausalDiagram(**row)
				record.save()
				saved += 1

			print('\nSaved %d records' % (saved))
