from django.urls import path
from .views import *

urlpatterns = [
    path('disponibilidad/', BloqueDisponibilidadView.as_view(), name= 'bloque-disponibilidad'),
    path('<int:pk>/actualizar/', DisponibilidadUpdateView.as_view(), name='actualizar-disponibilidad'),
]