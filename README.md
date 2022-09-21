This project hosts the web server of the SaferBot website.

Add your own Google API key to "api/your-api-key.json" for DialogFlow
And modify 

* installing requirements 
```
conda env create -n coroots -f requirements.yaml
```

* running the demo server
```
python manage.py migrate
python manage.py runserver 
```

Or

* use docker
```
docker-compose up --build
```