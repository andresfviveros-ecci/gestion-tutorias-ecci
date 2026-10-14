from rest_framework import status, views
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Materia
from .serializer import *
from drf_spectacular.utils import extend_schema
from .models import PeriodoAcademico
from .serializer import PeriodoAcademicoSerializer

@extend_schema(tags=['Materias'])
class MateriaView(views.APIView):
    permission_classes = [IsAuthenticated]

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
    permission_classes = [IsAuthenticated]

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

        materia.delete()

        return Response(
            status=status.HTTP_204_NO_CONTENT
        )

""" APIS PARA CREAR PROGRAMA ACADEMICO"""
@extend_schema(tags=['Programas Académicos'])
class ProgramaAcademicoView(views.APIView):
    permission_classes = [IsAuthenticated]

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
    permission_classes = [IsAuthenticated]

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

    @extend_schema(responses={204: None})
    def delete(self, request, pk, format=None):
        programa = self.get_programa(pk)

        if programa is None:
            return Response(
                {'error': 'El programa académico no existe.'},
                status=status.HTTP_404_NOT_FOUND
            )

        programa.delete()

        return Response(
            status=status.HTTP_204_NO_CONTENT
        )
    
""" APIS DE PERIODO"""
@extend_schema(tags=['Periodos Académicos'])
class PeriodoAcademicoView(views.APIView):
    permission_classes = [IsAuthenticated]

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
    permission_classes = [IsAuthenticated]

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

    @extend_schema(responses={204: None, 404: None})
    def delete(self, request, pk, format=None):
        periodo = self.get_periodo(pk)

        if periodo is None:
            return Response(
                {'error': 'El periodo académico no existe.'},
                status=status.HTTP_404_NOT_FOUND
            )

        periodo.delete()

        return Response(status=status.HTTP_204_NO_CONTENT)