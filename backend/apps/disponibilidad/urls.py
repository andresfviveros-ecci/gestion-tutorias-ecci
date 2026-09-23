from django.urls import path
from .views import BloqueDisponibilidadView

urlpatterns = [
    path('disponibilidad/', BloqueDisponibilidadView.as_view(), name= 'bloque-disponibilidad'),
]