from django.conf.urls import include, url
from django.conf import settings
from django.conf.urls.static import static

# serve media files: https://timmyomahony.com/blog/static-vs-media-and-root-vs-path-in-django/
urlpatterns = [
	url(r'', include('mentorbot.urls'))
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
