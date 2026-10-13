from django.contrib import admin
from django.urls import path, include
from django.views.generic import RedirectView
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

urlpatterns = [
     path('', RedirectView.as_view(url='/api/docs/', permanent=False)),
    path('admin/', admin.site.urls),
    path('api/disponibilidad/', include('apps.disponibilidad.urls')),
    #ACCOUNTS
    path('api/accounts/', include('apps.accounts.urls')),
    #TUTORIAS
    path('api/tutorias/', include('apps.tutorias.urls')),
    #SWAGGER
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/catalogo/', include('apps.catalogo.urls')),
]