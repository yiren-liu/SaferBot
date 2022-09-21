# SaferBot

This project hosts the web server of the SaferBot website --- web-based conversational system that aims to help with handling community safety incident reports by facilitating the interaction between users and safety administration agents.


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
