from django.urls import path

from .views import (
    TutoriaDetailView,
    TutoriaRecibidaDetailView,
    TutoriasRecibidasView,
    TutoriaView,
)

urlpatterns = [
    path('tutorias/', TutoriaView.as_view(), name='tutorias'),
    path('tutorias/<int:pk>/',TutoriaDetailView.as_view(),name='tutoria-detalle'),
    path('recibidas/', TutoriasRecibidasView.as_view(), name='tutorias-recibidas'),
    path('recibidas/<int:pk>/', TutoriaRecibidaDetailView.as_view(), name='tutoria-recibida-detalle'),
]
