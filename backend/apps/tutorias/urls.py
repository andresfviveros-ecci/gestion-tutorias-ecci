from django.urls import path
from .views import TutoriaView, TutoriaDetailView

urlpatterns = [
    path('tutorias/', TutoriaView.as_view(), name='tutorias'),
    path('tutorias/<int:pk>/',TutoriaDetailView.as_view(),name='tutoria-detalle'),
]