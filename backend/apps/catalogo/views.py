from django.db.models import ProtectedError
from django_filters import rest_framework as filters
from drf_spectacular.utils import extend_schema
from rest_framework import generics, status
from rest_framework.response import Response

from apps.accounts.permisos import LecturaOCoordinador
from config.api import UsuarioFilter

from .models import (
    DocenteMateria,
    Inscripcion,
    Materia,
    PeriodoAcademico,
    ProgramaAcademico,
)
from .serializer import (
    DocenteMateriaSerializer,
    InscripcionSerializer,
    MateriaSerializer,
    PeriodoAcademicoSerializer,
    ProgramaAcademicoSerializer,
)


class CatalogoDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Detalle con GET, PUT, PATCH y DELETE. Si otros registros dependen
    del objeto, DELETE responde 409 con el motivo (BE-14)."""
    permission_classes = [LecturaOCoordinador]
    motivo_protegido = 'No se puede eliminar porque otros registros dependen de este.'

    def destroy(self, request, *args, **kwargs):
        try:
            return super().destroy(request, *args, **kwargs)
        except ProtectedError:
            return Response(
                {'detail': self.motivo_protegido, 'code': 'protegido', 'errors': {}},
                status=status.HTTP_409_CONFLICT
            )


@extend_schema(tags=['Materias'])
class MateriaView(generics.ListCreateAPIView):
    permission_classes = [LecturaOCoordinador]
    queryset = Materia.objects.all()
    serializer_class = MateriaSerializer
    filterset_fields = ['programa', 'semestre', 'activa']


@extend_schema(tags=['Materias'])
class MateriaDetailView(CatalogoDetailView):
    queryset = Materia.objects.all()
    serializer_class = MateriaSerializer
    motivo_protegido = 'No se puede eliminar la materia porque tiene tutorías registradas.'


""" APIS PARA CREAR PROGRAMA ACADEMICO"""
@extend_schema(tags=['Programas Académicos'])
class ProgramaAcademicoView(generics.ListCreateAPIView):
    permission_classes = [LecturaOCoordinador]
    queryset = ProgramaAcademico.objects.all()
    serializer_class = ProgramaAcademicoSerializer
    filterset_fields = ['activo']


@extend_schema(tags=['Programas Académicos'])
class ProgramaAcademicoDetailView(CatalogoDetailView):
    queryset = ProgramaAcademico.objects.all()
    serializer_class = ProgramaAcademicoSerializer
    motivo_protegido = 'No se puede eliminar el programa porque tiene materias asociadas.'


""" APIS DE PERIODO"""
@extend_schema(tags=['Periodos Académicos'])
class PeriodoAcademicoView(generics.ListCreateAPIView):
    permission_classes = [LecturaOCoordinador]
    queryset = PeriodoAcademico.objects.all()
    serializer_class = PeriodoAcademicoSerializer
    filterset_fields = ['activo']


@extend_schema(tags=['Periodos Académicos'])
class PeriodoAcademicoDetailView(CatalogoDetailView):
    queryset = PeriodoAcademico.objects.all()
    serializer_class = PeriodoAcademicoSerializer
    motivo_protegido = 'No se puede eliminar el periodo porque tiene tutorías registradas.'


""" APIS DE ASIGNACIÓN DE DOCENTES E INSCRIPCIONES
Existen en la base y los requisitos nuevos los necesitan. """
class DocenteMateriaFilter(filters.FilterSet):
    docente = UsuarioFilter(field_name='docente_id', help_text='Id del docente, o "me".')

    class Meta:
        model = DocenteMateria
        fields = ['docente', 'materia', 'periodo']


class InscripcionFilter(filters.FilterSet):
    estudiante = UsuarioFilter(field_name='estudiante_id', help_text='Id del estudiante, o "me".')

    class Meta:
        model = Inscripcion
        fields = ['estudiante', 'materia', 'periodo']


@extend_schema(tags=['Docentes - Materias'])
class DocenteMateriaView(generics.ListCreateAPIView):
    permission_classes = [LecturaOCoordinador]
    queryset = DocenteMateria.objects.select_related('docente', 'materia', 'periodo')
    serializer_class = DocenteMateriaSerializer
    filterset_class = DocenteMateriaFilter


@extend_schema(tags=['Docentes - Materias'])
class DocenteMateriaDetailView(generics.RetrieveDestroyAPIView):
    permission_classes = [LecturaOCoordinador]
    queryset = DocenteMateria.objects.select_related('docente', 'materia', 'periodo')
    serializer_class = DocenteMateriaSerializer


@extend_schema(tags=['Inscripciones'])
class InscripcionView(generics.ListCreateAPIView):
    permission_classes = [LecturaOCoordinador]
    queryset = Inscripcion.objects.select_related('estudiante', 'materia', 'periodo')
    serializer_class = InscripcionSerializer
    filterset_class = InscripcionFilter


@extend_schema(tags=['Inscripciones'])
class InscripcionDetailView(generics.RetrieveDestroyAPIView):
    permission_classes = [LecturaOCoordinador]
    queryset = Inscripcion.objects.select_related('estudiante', 'materia', 'periodo')
    serializer_class = InscripcionSerializer
