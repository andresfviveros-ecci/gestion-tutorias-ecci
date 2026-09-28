from django.contrib import admin
from django.urls import path, include
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('apps.disponibilidad.urls')),
    #ACCOUNTS
    path('api/accounts/', include('apps.accounts.urls')),
    #TUTORIAS
    path('api/tutorias/', include('apps.tutorias.urls')),
    #SWAGGER
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
]