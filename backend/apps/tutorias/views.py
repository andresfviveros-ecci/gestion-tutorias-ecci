from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import generics, serializers, status, views
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from apps.accounts.permisos import LecturaOEstudiante
from apps.tutores.permisos import EsTutor
from apps.tutorias.models import EvaluacionTutoria, Tutoria

from .filters import TutoriaFilter
from .serializers import (
    CambioEstadoSerializer,
    CancelacionSerializer,
    EvaluacionSerializer,
    TutoriaRecibidaSerializer,
    TutoriaRegisterSerializer,
    TutoriaSerializer,
)
from .services import cambiar_estado_por_tutor, cancelar_tutoria, puede_editar

# Lo que el serializer de lectura necesita sin consultas extra por fila.
RELACIONES_LECTURA = ('bloque__docente', 'bloque__materia', 'estudiante', 'evaluacion')


@extend_schema(tags=['Tutorías'])
class TutoriaView(generics.ListAPIView):
    """Tutorías del estudiante en sesión; filtros en TutoriaFilter."""
    permission_classes = [LecturaOEstudiante]
    serializer_class = TutoriaSerializer
    filterset_class = TutoriaFilter

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):  # generación del esquema
            return Tutoria.objects.none()
        return Tutoria.objects.filter(
            estudiante=self.request.user
        ).select_related(*RELACIONES_LECTURA)

    @extend_schema(
        request=TutoriaRegisterSerializer,
        responses={201: inline_serializer('TutoriaReservada', {
            'message': serializers.CharField(),
            'tutoria': TutoriaSerializer(),
        })}
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
class TutoriasRecibidasView(generics.ListAPIView):
    """Tutorías reservadas en los bloques del docente en sesión (BE-19)."""
    permission_classes = [EsTutor]
    serializer_class = TutoriaRecibidaSerializer
    filterset_class = TutoriaFilter

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):  # generación del esquema
            return Tutoria.objects.none()
        return Tutoria.objects.filter(
            bloque__docente=self.request.user
        ).select_related(*RELACIONES_LECTURA).order_by('bloque__fecha', 'bloque__hora_inicio')


@extend_schema(tags=['Tutorías'])
class TutoriaDetailView(views.APIView):
    permission_classes = [LecturaOEstudiante]
    serializer_class = TutoriaSerializer

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
        responses={200: inline_serializer('TutoriaCancelada', {
            'message': serializers.CharField(),
            'cancelacion': CancelacionSerializer(),
        })}
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


@extend_schema(tags=['Tutorías'])
class TutoriaRecibidaDetailView(views.APIView):
    """Una tutoría de los bloques del tutor en sesión. Con PATCH la confirma,
    la cancela (con motivo) o la marca completada o no asistió (RF-10)."""
    permission_classes = [EsTutor]
    serializer_class = TutoriaRecibidaSerializer

    def get_tutoria(self, pk, user):
        return get_object_or_404(
            Tutoria.objects.select_related(*RELACIONES_LECTURA),
            pk=pk,
            bloque__docente=user
        )

    @extend_schema(responses={200: TutoriaRecibidaSerializer})
    def get(self, request, pk, format=None):
        return Response(TutoriaRecibidaSerializer(self.get_tutoria(pk, request.user)).data)

    @extend_schema(request=CambioEstadoSerializer, responses={200: TutoriaRecibidaSerializer})
    def patch(self, request, pk, format=None):
        tutoria = self.get_tutoria(pk, request.user)
        serializer = CambioEstadoSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        datos = dict(serializer.validated_data)
        tutoria = cambiar_estado_por_tutor(
            tutoria, request.user, datos.pop('estado'), datos.pop('motivo', None), **datos
        )
        return Response(TutoriaRecibidaSerializer(tutoria).data, status=status.HTTP_200_OK)


@extend_schema(tags=['Tutorías'])
class EvaluacionView(views.APIView):
    """RF-09: el estudiante califica su tutoría completada, una sola vez."""
    permission_classes = [LecturaOEstudiante]
    serializer_class = EvaluacionSerializer

    def get_tutoria(self, pk, user):
        return get_object_or_404(Tutoria.objects.select_related('evaluacion'), pk=pk, estudiante=user)

    @extend_schema(responses={200: EvaluacionSerializer})
    def get(self, request, pk, format=None):
        tutoria = self.get_tutoria(pk, request.user)
        evaluacion = get_object_or_404(EvaluacionTutoria, tutoria=tutoria)
        return Response(EvaluacionSerializer(evaluacion).data)

    @extend_schema(request=EvaluacionSerializer, responses={201: EvaluacionSerializer})
    def post(self, request, pk, format=None):
        tutoria = self.get_tutoria(pk, request.user)
        serializer = EvaluacionSerializer(data=request.data, context={'tutoria': tutoria})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
