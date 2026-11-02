from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import generics, serializers, status, views
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from apps.accounts.permisos import LecturaODocente
from apps.disponibilidad.models import BloqueDisponibilidad
from apps.tutorias.services import bloque_iniciado

from .filters import BloqueDisponibilidadFilter
from .serializers import BloqueDisponibilidadSerializer
from .services import cancelar_bloque

MOTIVO_CANCELACION_BLOQUE = 'El docente canceló la disponibilidad.'


@extend_schema(tags=['Disponibilidad'])
class BloqueDisponibilidadView(generics.ListCreateAPIView):
    """Listado con filtros (BloqueDisponibilidadFilter) y paginación con ?page=."""
    permission_classes = [LecturaODocente]
    serializer_class = BloqueDisponibilidadSerializer
    filterset_class = BloqueDisponibilidadFilter
    queryset = BloqueDisponibilidad.objects.select_related(
        'docente',
        'materia',
        'periodo'
    ).order_by('fecha', 'hora_inicio')

    def perform_create(self, serializer):
        serializer.save(docente=self.request.user)


@extend_schema(tags=['Disponibilidad'])
class DisponibilidadUpdateView(views.APIView):
    permission_classes = [LecturaODocente]
    serializer_class = BloqueDisponibilidadSerializer

    def get_disponibilidad(self, pk):
        return get_object_or_404(
            BloqueDisponibilidad.objects.select_related('docente', 'materia', 'periodo'),
            pk=pk
        )

    def get_propia(self, request, pk):
        disponibilidad = self.get_disponibilidad(pk)
        if disponibilidad.docente_id != request.user.id:
            self.permission_denied(
                request,
                message='No tiene permisos sobre esta disponibilidad.'
            )
        return disponibilidad

    @extend_schema(responses={200: BloqueDisponibilidadSerializer})
    def get(self, request, pk, format=None):
        serializer = BloqueDisponibilidadSerializer(self.get_disponibilidad(pk))
        return Response(serializer.data, status=status.HTTP_200_OK)

    def actualizar(self, request, pk, partial):
        serializer = BloqueDisponibilidadSerializer(
            self.get_propia(request, pk),
            data=request.data,
            partial=partial,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        request=BloqueDisponibilidadSerializer,
        responses={200: BloqueDisponibilidadSerializer}
    )
    def put(self, request, pk, format=None):
        return self.actualizar(request, pk, partial=False)

    @extend_schema(
        request=BloqueDisponibilidadSerializer,
        responses={200: BloqueDisponibilidadSerializer}
    )
    def patch(self, request, pk, format=None):
        return self.actualizar(request, pk, partial=True)

    @extend_schema(
        request=inline_serializer('CancelarBloque', {'motivo': serializers.CharField(required=False)}),
        responses={
            200: inline_serializer('BloqueCancelado', {
                'detail': serializers.CharField(),
                'tutorias_canceladas': serializers.IntegerField(),
            }),
            204: None,
        }
    )
    def delete(self, request, pk, format=None):
        disponibilidad = self.get_propia(request, pk)

        # Un bloque que ya empezó es historial: cambiarlo alteraría los reportes.
        if bloque_iniciado(disponibilidad):
            raise ValidationError('Este bloque ya inició o terminó, así que no se puede eliminar ni cancelar.')

        # Sin tutorías se borra. Con tutorías se cancela: las reservas
        # activas pasan a CANCELADA_DOCENTE y se avisa a cada estudiante.
        if not disponibilidad.tutorias.exists():
            disponibilidad.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)

        motivo = (request.data.get('motivo') or '').strip() or MOTIVO_CANCELACION_BLOQUE
        canceladas = cancelar_bloque(disponibilidad, request.user, motivo)
        return Response(
            {
                'detail': (
                    f'La disponibilidad se canceló. Se cancelaron {canceladas} '
                    'tutorías y se avisó a los estudiantes.'
                ),
                'tutorias_canceladas': canceladas,
            },
            status=status.HTTP_200_OK
        )
