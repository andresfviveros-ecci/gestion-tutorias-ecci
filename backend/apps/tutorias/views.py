from django.shortcuts import get_object_or_404
from rest_framework import views, status
from rest_framework.response import Response
from apps.accounts.permisos import EsDocente, LecturaOEstudiante
from rest_framework.exceptions import ValidationError
from drf_spectacular.utils import extend_schema

from apps.tutorias.models import Tutoria
from .serializers import (
    TutoriaRegisterSerializer,
    TutoriaSerializer,
    CancelacionSerializer,
)
from .services import cancelar_tutoria, puede_editar

# Lo que el serializer de lectura necesita sin consultas extra por fila.
RELACIONES_LECTURA = ('bloque__docente', 'bloque__materia', 'estudiante')


@extend_schema(tags=['Tutorías'])
class TutoriaView(views.APIView):
    permission_classes = [LecturaOEstudiante]

    @extend_schema(responses={200: TutoriaSerializer(many=True)})
    def get(self, request, format=None):
        tutorias = Tutoria.objects.filter(
            estudiante=request.user
        ).select_related(*RELACIONES_LECTURA)

        serializer = TutoriaSerializer(tutorias, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        request=TutoriaRegisterSerializer,
        responses={201: TutoriaSerializer}
    )
    def post(self, request, format=None):
        serializer = TutoriaRegisterSerializer(
            data=request.data,
            context={'request': request}
        )

        serializer.is_valid(raise_exception=True)
        tutoria = serializer.save()

        return Response({
            'message': 'La tutoría fue reservada correctamente.',
            'tutoria': TutoriaSerializer(tutoria).data
        }, status=status.HTTP_201_CREATED)


@extend_schema(tags=['Tutorías'])
class TutoriasRecibidasView(views.APIView):
    """Tutorías reservadas en los bloques del docente en sesión (BE-19)."""
    permission_classes = [EsDocente]

    @extend_schema(responses={200: TutoriaSerializer(many=True)})
    def get(self, request, format=None):
        tutorias = Tutoria.objects.filter(
            bloque__docente=request.user
        ).select_related(*RELACIONES_LECTURA).order_by('bloque__fecha', 'bloque__hora_inicio')

        estado = request.query_params.get('estado')
        if estado:
            tutorias = tutorias.filter(estado=estado)

        serializer = TutoriaSerializer(tutorias, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


@extend_schema(tags=['Tutorías'])
class TutoriaDetailView(views.APIView):
    permission_classes = [LecturaOEstudiante]

    def get_tutoria(self, pk, user):
        return get_object_or_404(
            Tutoria.objects.select_related(*RELACIONES_LECTURA),
            pk=pk,
            estudiante=user
        )

    def actualizar(self, request, pk, partial):
        tutoria = self.get_tutoria(pk, request.user)

        # BE-09: solo reservadas y antes del inicio.
        if not puede_editar(tutoria):
            raise ValidationError(
                'Solo se pueden actualizar tutorías reservadas que no han iniciado.'
            )

        serializer = TutoriaSerializer(
            tutoria,
            data=request.data,
            partial=partial
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(responses={200: TutoriaSerializer})
    def get(self, request, pk, format=None):
        tutoria = self.get_tutoria(pk, request.user)
        serializer = TutoriaSerializer(tutoria)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        request=TutoriaSerializer,
        responses={200: TutoriaSerializer}
    )
    def put(self, request, pk, format=None):
        return self.actualizar(request, pk, partial=False)

    @extend_schema(
        request=TutoriaSerializer,
        responses={200: TutoriaSerializer}
    )
    def patch(self, request, pk, format=None):
        return self.actualizar(request, pk, partial=True)

    @extend_schema(
        request=CancelacionSerializer,
        responses={200: dict}
    )
    def delete(self, request, pk, format=None):
        tutoria = self.get_tutoria(pk, request.user)

        serializer = CancelacionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        cancelacion = cancelar_tutoria(
            tutoria,
            request.user,
            serializer.validated_data['motivo']
        )

        return Response({
            'message': 'La tutoría fue cancelada correctamente.',
            'cancelacion': CancelacionSerializer(cancelacion).data
        }, status=status.HTTP_200_OK)
