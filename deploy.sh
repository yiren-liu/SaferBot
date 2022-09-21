#!/bin/bash
pipenv shell

# migrate and deploy
git checkout testing
git pull
git checkout master
git merge testing
python manage.py collectstatic
echo "Deploy complete!"
gunicorn gettingstarted.wsgi -b 0.0.0.0:8000 --workers=3 --threads=2 \
--access-logfile log/access_file_g.log --error-logfile log/error_file_g.log \
--capture-output --enable-stdio-inheritance
