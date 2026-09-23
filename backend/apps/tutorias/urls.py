from django.urls import path
from apps.tutorias.views import TutoRegisterView


urlpatterns = [
    path('reservar/', TutoRegisterView.as_view(), name='reservar-tutoria'),
]