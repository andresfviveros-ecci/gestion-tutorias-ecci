from django.urls import path
from .views import MateriaView,ProgramaAcademicoView,ProgramaAcademicoDetailView

urlpatterns = [
    path('materias/',MateriaView.as_view(),name='crear-materia'),
    path('programas/',ProgramaAcademicoView.as_view(),name='programas-academicos'),
    path('programas/<int:pk>/',ProgramaAcademicoDetailView.as_view(),name='programa-academico-detalle'),
]