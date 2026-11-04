from django.urls import path

from .views import (
    ConfiguracionView,
    DocenteMateriaDetailView,
    DocenteMateriaView,
    InscripcionDetailView,
    InscripcionView,
    MateriaDetailView,
    MateriaView,
    PeriodoAcademicoDetailView,
    PeriodoAcademicoView,
    ProgramaAcademicoDetailView,
    ProgramaAcademicoView,
)

urlpatterns = [
    path('materias/',MateriaView.as_view(),name='crear-materia'),
    path('materias/<int:pk>/', MateriaDetailView.as_view(), name='materia-detalle'),
    path('programas/',ProgramaAcademicoView.as_view(),name='programas-academicos'),
    path('programas/<int:pk>/',ProgramaAcademicoDetailView.as_view(),name='programa-academico-detalle'),
    path('periodos/',PeriodoAcademicoView.as_view(),name='periodos'),
    path('periodos/<int:pk>/',PeriodoAcademicoDetailView.as_view(),name='periodo-detalle'),
    path('docentes-materias/', DocenteMateriaView.as_view(), name='docentes-materias'),
    path('docentes-materias/<int:pk>/', DocenteMateriaDetailView.as_view(), name='docente-materia-detalle'),
    path('inscripciones/', InscripcionView.as_view(), name='inscripciones'),
    path('inscripciones/<int:pk>/', InscripcionDetailView.as_view(), name='inscripcion-detalle'),
    path('configuracion/', ConfiguracionView.as_view(), name='configuracion'),
]
