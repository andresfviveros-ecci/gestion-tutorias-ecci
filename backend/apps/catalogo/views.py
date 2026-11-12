from django.db import transaction
from django.db.models import F, ProtectedError
from django_filters import rest_framework as filters
from drf_spectacular.utils import extend_schema
from rest_framework import generics, status, views
from rest_framework.response import Response

from apps.accounts.permisos import EsCoordinador, LecturaOCoordinador, es_coordinacion
from config.api import UsuarioFilter

from .models import (
    Configuracion,
    DocenteMateria,
    Inscripcion,
    Materia,
    PeriodoAcademico,
    ProgramaAcademico,
)
from .serializer import (
    AsignacionMateriasSerializer,
    ConfiguracionSerializer,
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

    def destroy(self, request, *args, **kwargs):
        # Los bloques usan SET_NULL y las asignaciones e inscripciones CASCADE,
        # así que el borrado nunca fallaba: se perdía el historial en silencio.
        materia = self.get_object()
        if materia.disponibilidades.exists():
            motivo = 'No se puede eliminar la materia porque tiene bloques de disponibilidad o tutorías.'
        elif materia.docentes.exists() or materia.inscripciones.exists():
            motivo = 'No se puede eliminar la materia porque tiene docentes asignados o estudiantes inscritos.'
        else:
            return super().destroy(request, *args, **kwargs)
        return Response(
            {'detail': f'{motivo} Puedes desactivarla en su lugar.', 'code': 'protegido', 'errors': {}},
            status=status.HTTP_409_CONFLICT
        )


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


def inscripciones_visibles(user, inscripciones):
    if es_coordinacion(user):
        return inscripciones
    if user.groups.filter(name='Docente').exists():
        return inscripciones.filter(
            materia__docentes__docente=user,
            materia__docentes__periodo=F('periodo')
        ).distinct()
    return inscripciones.filter(estudiante=user)


@extend_schema(tags=['Docentes - Materias'])
class DocenteMateriaView(generics.ListCreateAPIView):
    permission_classes = [LecturaOCoordinador]
    queryset = DocenteMateria.objects.select_related('docente', 'materia', 'periodo')
    serializer_class = DocenteMateriaSerializer
    filterset_class = DocenteMateriaFilter


@extend_schema(tags=['Docentes - Materias'])
class AsignarMateriasView(views.APIView):
    """GT-251: asigna varias materias a un docente en una sola petición."""
    permission_classes = [EsCoordinador]

    @extend_schema(request=AsignacionMateriasSerializer, responses={201: DocenteMateriaSerializer(many=True)})
    @transaction.atomic
    def post(self, request, format=None):
        serializer = AsignacionMateriasSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        asignaciones = serializer.save()
        return Response(DocenteMateriaSerializer(asignaciones, many=True).data, status=status.HTTP_201_CREATED)


@extend_schema(tags=['Docentes - Materias'])
class DocenteMateriaDetailView(generics.RetrieveDestroyAPIView):
    permission_classes = [LecturaOCoordinador]
    queryset = DocenteMateria.objects.select_related('docente', 'materia', 'periodo')
    serializer_class = DocenteMateriaSerializer


@extend_schema(tags=['Inscripciones'])
class InscripcionView(generics.ListCreateAPIView):
    """La coordinación ve todas las inscripciones; un estudiante, solo las
    suyas, y un docente, las de las materias que tiene asignadas."""
    permission_classes = [LecturaOCoordinador]
    serializer_class = InscripcionSerializer
    filterset_class = InscripcionFilter

    def get_queryset(self):
        inscripciones = Inscripcion.objects.select_related('estudiante', 'materia', 'periodo')
        if getattr(self, 'swagger_fake_view', False):  # generación del esquema
            return inscripciones.none()
        return inscripciones_visibles(self.request.user, inscripciones)


@extend_schema(tags=['Inscripciones'])
class InscripcionDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET, PATCH y PUT (notas de los cortes) y DELETE. Escribe solo la coordinación."""
    permission_classes = [LecturaOCoordinador]
    serializer_class = InscripcionSerializer

    def get_queryset(self):
        inscripciones = Inscripcion.objects.select_related('estudiante', 'materia', 'periodo')
        if getattr(self, 'swagger_fake_view', False):  # generación del esquema
            return inscripciones.none()
        return inscripciones_visibles(self.request.user, inscripciones)


""" API DE CONFIGURACIÓN
Parámetros de las reglas de tutorías: cualquiera los consulta y solo la
coordinación y el administrador los cambian. """
@extend_schema(tags=['Configuración'])
class ConfiguracionView(generics.RetrieveUpdateAPIView):
    permission_classes = [LecturaOCoordinador]
    serializer_class = ConfiguracionSerializer

    def get_object(self):
        return Configuracion.actual()
