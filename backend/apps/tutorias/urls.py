from django.urls import path

from .views import TutoriaDetailView, TutoriasRecibidasView, TutoriaView

urlpatterns = [
    path('tutorias/', TutoriaView.as_view(), name='tutorias'),
    path('tutorias/<int:pk>/',TutoriaDetailView.as_view(),name='tutoria-detalle'),
    path('recibidas/', TutoriasRecibidasView.as_view(), name='tutorias-recibidas'),
]
