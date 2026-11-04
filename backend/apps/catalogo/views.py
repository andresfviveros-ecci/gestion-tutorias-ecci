from rest_framework import generics, status, views
from django.db.models import ProtectedError
from apps.accounts.permisos import LecturaOCoordinador
from rest_framework.response import Response
from .models import DocenteMateria, Inscripcion, Materia
from .serializer import *
from drf_spectacular.utils import extend_schema
from .models import PeriodoAcademico
from .serializer import PeriodoAcademicoSerializer

def eliminar_protegido(objeto, motivo):
    """Borra el objeto o responde 409 si otros registros dependen de él (BE-14)."""
    try:
        objeto.delete()
    except ProtectedError:
        return Response({'detail': motivo}, status=status.HTTP_409_CONFLICT)
    return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema(tags=['Materias'])
class MateriaView(views.APIView):
    permission_classes = [LecturaOCoordinador]

    @extend_schema(
        responses={200: MateriaSerializer(many=True)}
    )
    def get(self, request, format=None):
        materias = Materia.objects.all()
        serializer = MateriaSerializer(materias, many=True)

        return Response(
            serializer.data,
            status=status.HTTP_200_OK
        )

    @extend_schema(
        request=MateriaSerializer,
        responses={201: MateriaSerializer}
    )
    def post(self, request, format=None):
        serializer = MateriaSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED
        )


@extend_schema(tags=['Materias'])
class MateriaDetailView(views.APIView):
    permission_classes = [LecturaOCoordinador]

    def get_materia(self, pk):
        try:
            return Materia.objects.get(pk=pk)
        except Materia.DoesNotExist:
            return None

    @extend_schema(
        responses={
            200: MateriaSerializer,
            404: {'type': 'object', 'properties': {'error': {'type': 'string'}}}
        }
    )
    def get(self, request, pk, format=None):
        materia = self.get_materia(pk)

        if materia is None:
            return Response(
                {'error': 'La materia no existe.'},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = MateriaSerializer(materia)

        return Response(
            serializer.data,
            status=status.HTTP_200_OK
        )

    @extend_schema(
        request=MateriaSerializer,
        responses={
            200: MateriaSerializer,
            404: {'type': 'object', 'properties': {'error': {'type': 'string'}}}
        }
    )
    def put(self, request, pk, format=None):
        materia = self.get_materia(pk)

        if materia is None:
            return Response(
                {'error': 'La materia no existe.'},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = MateriaSerializer(
            materia,
            data=request.data
        )
        serializer.is_valid(raise_exception=True)
        materia = serializer.save()

        return Response(
            serializer.data,
            status=status.HTTP_200_OK
        )

    @extend_schema(
        responses={
            204: None,
            404: {'type': 'object', 'properties': {'error': {'type': 'string'}}}
        }
    )
    def delete(self, request, pk, format=None):
        materia = self.get_materia(pk)

        if materia is None:
            return Response(
                {'error': 'La materia no existe.'},
                status=status.HTTP_404_NOT_FOUND
            )

        return eliminar_protegido(
            materia,
            'No se puede eliminar la materia porque tiene tutorías registradas.'
        )

""" APIS PARA CREAR PROGRAMA ACADEMICO"""
@extend_schema(tags=['Programas Académicos'])
class ProgramaAcademicoView(views.APIView):
    permission_classes = [LecturaOCoordinador]

    @extend_schema(
        responses={200: ProgramaAcademicoSerializer(many=True)}
    )
    def get(self, request, format=None):
        programas = ProgramaAcademico.objects.all()
        serializer = ProgramaAcademicoSerializer(
            programas,
            many=True
        )

        return Response(
            serializer.data,
            status=status.HTTP_200_OK
        )

    @extend_schema(
        request=ProgramaAcademicoSerializer,
        responses={201: ProgramaAcademicoSerializer}
    )
    def post(self, request, format=None):
        serializer = ProgramaAcademicoSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED
        )


@extend_schema(tags=['Programas Académicos'])
class ProgramaAcademicoDetailView(views.APIView):
    permission_classes = [LecturaOCoordinador]

    def get_programa(self, pk):
        try:
            return ProgramaAcademico.objects.get(pk=pk)
        except ProgramaAcademico.DoesNotExist:
            return None

    @extend_schema(responses={200: ProgramaAcademicoSerializer})
    def get(self, request, pk, format=None):
        programa = self.get_programa(pk)

        if programa is None:
            return Response(
                {'error': 'El programa académico no existe.'},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = ProgramaAcademicoSerializer(programa)

        return Response(
            serializer.data,
            status=status.HTTP_200_OK
        )

    @extend_schema(
        request=ProgramaAcademicoSerializer,
        responses={200: ProgramaAcademicoSerializer}
    )
    def put(self, request, pk, format=None):
        programa = self.get_programa(pk)

        if programa is None:
            return Response(
                {'error': 'El programa académico no existe.'},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = ProgramaAcademicoSerializer(
            programa,
            data=request.data
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(
            serializer.data,
            status=status.HTTP_200_OK
        )

    @extend_schema(
        request=ProgramaAcademicoSerializer,
        responses={200: ProgramaAcademicoSerializer}
    )
    def patch(self, request, pk, format=None):
        programa = self.get_programa(pk)

        if programa is None:
            return Response(
                {'error': 'El programa académico no existe.'},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = ProgramaAcademicoSerializer(
            programa,
            data=request.data,
            partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(
            serializer.data,
            status=status.HTTP_200_OK
        )

    @extend_schema(responses={204: None, 409: dict})
    def delete(self, request, pk, format=None):
        programa = self.get_programa(pk)

        if programa is None:
            return Response(
                {'error': 'El programa académico no existe.'},
                status=status.HTTP_404_NOT_FOUND
            )

        return eliminar_protegido(
            programa,
            'No se puede eliminar el programa porque tiene materias asociadas.'
        )
    
""" APIS DE PERIODO"""
@extend_schema(tags=['Periodos Académicos'])
class PeriodoAcademicoView(views.APIView):
    permission_classes = [LecturaOCoordinador]

    @extend_schema(
        responses={200: PeriodoAcademicoSerializer(many=True)}
    )
    def get(self, request, format=None):
        periodos = PeriodoAcademico.objects.all()
        serializer = PeriodoAcademicoSerializer(periodos, many=True)

        return Response(
            serializer.data,
            status=status.HTTP_200_OK
        )

    @extend_schema(
        request=PeriodoAcademicoSerializer,
        responses={201: PeriodoAcademicoSerializer}
    )
    def post(self, request, format=None):
        serializer = PeriodoAcademicoSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED
        )


@extend_schema(tags=['Periodos Académicos'])
class PeriodoAcademicoDetailView(views.APIView):
    permission_classes = [LecturaOCoordinador]

    def get_periodo(self, pk):
        try:
            return PeriodoAcademico.objects.get(pk=pk)
        except PeriodoAcademico.DoesNotExist:
            return None

    @extend_schema(
        responses={200: PeriodoAcademicoSerializer, 404: None}
    )
    def get(self, request, pk, format=None):
        periodo = self.get_periodo(pk)

        if periodo is None:
            return Response(
                {'error': 'El periodo académico no existe.'},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = PeriodoAcademicoSerializer(periodo)

        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        request=PeriodoAcademicoSerializer,
        responses={200: PeriodoAcademicoSerializer, 404: None}
    )
    def put(self, request, pk, format=None):
        periodo = self.get_periodo(pk)

        if periodo is None:
            return Response(
                {'error': 'El periodo académico no existe.'},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = PeriodoAcademicoSerializer(
            periodo,
            data=request.data
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        request=PeriodoAcademicoSerializer,
        responses={200: PeriodoAcademicoSerializer, 404: None}
    )
    def patch(self, request, pk, format=None):
        periodo = self.get_periodo(pk)

        if periodo is None:
            return Response(
                {'error': 'El periodo académico no existe.'},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = PeriodoAcademicoSerializer(
            periodo,
            data=request.data,
            partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(responses={204: None, 404: None, 409: dict})
    def delete(self, request, pk, format=None):
        periodo = self.get_periodo(pk)

        if periodo is None:
            return Response(
                {'error': 'El periodo académico no existe.'},
                status=status.HTTP_404_NOT_FOUND
            )

        return eliminar_protegido(
            periodo,
            'No se puede eliminar el periodo porque tiene tutorías registradas.'
        )

""" APIS DE ASIGNACIÓN DE DOCENTES E INSCRIPCIONES
Existen en la base y los requisitos nuevos los necesitan. Se filtran con
?docente= / ?estudiante=, ?materia= y ?periodo=. """
class AsignacionMixin:
    permission_classes = [LecturaOCoordinador]
    filtros = ()

    def get_queryset(self):
        queryset = self.queryset.select_related('materia', 'periodo', *self.filtros[:1])
        for campo in self.filtros + ('materia', 'periodo'):
            valor = self.request.query_params.get(campo)
            if valor == 'me':
                valor = self.request.user.id
            if valor:
                queryset = queryset.filter(**{f'{campo}_id': valor})
        return queryset


@extend_schema(tags=['Docentes - Materias'])
class DocenteMateriaView(AsignacionMixin, generics.ListCreateAPIView):
    queryset = DocenteMateria.objects.all()
    serializer_class = DocenteMateriaSerializer
    filtros = ('docente',)


@extend_schema(tags=['Docentes - Materias'])
class DocenteMateriaDetailView(AsignacionMixin, generics.RetrieveDestroyAPIView):
    queryset = DocenteMateria.objects.all()
    serializer_class = DocenteMateriaSerializer
    filtros = ('docente',)


@extend_schema(tags=['Inscripciones'])
class InscripcionView(AsignacionMixin, generics.ListCreateAPIView):
    queryset = Inscripcion.objects.all()
    serializer_class = InscripcionSerializer
    filtros = ('estudiante',)


@extend_schema(tags=['Inscripciones'])
class InscripcionDetailView(AsignacionMixin, generics.RetrieveDestroyAPIView):
    queryset = Inscripcion.objects.all()
    serializer_class = InscripcionSerializer
    filtros = ('estudiante',)
