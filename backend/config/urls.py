from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('apps.disponibilidad.urls')),
    #ACCOUNTS
    path('api/accounts/', include('apps.accounts.urls')),
    #TUTORIAS
    path('api/tutorias/', include('apps.tutorias.urls')),
]