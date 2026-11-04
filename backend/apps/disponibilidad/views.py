from django.shortcuts import get_object_or_404
from rest_framework import status, views
from apps.accounts.permisos import LecturaODocente
from rest_framework.response import Response

from apps.disponibilidad.models import BloqueDisponibilidad
from apps.tutorias.services import bloque_iniciado
from .serializers import BloqueDisponibilidadSerializer
from .services import cancelar_bloque
from drf_spectacular.utils import OpenApiParameter, extend_schema

MOTIVO_CANCELACION_BLOQUE = 'El docente canceló la disponibilidad.'


@extend_schema(tags=['Disponibilidad'])
class BloqueDisponibilidadView(views.APIView):
    permission_classes = [LecturaODocente]

    @extend_schema(
        parameters=[
            OpenApiParameter('docente', str, description='Id del docente, o "me" para el docente en sesión.'),
            OpenApiParameter('materia', int),
            OpenApiParameter('fecha', str),
            OpenApiParameter('estado', str),
        ],
        responses={200: BloqueDisponibilidadSerializer(many=True)}
    )
    def get(self, request, format=None):
        disponibilidades = BloqueDisponibilidad.objects.select_related(
            'docente',
            'materia',
            'periodo'
        ).all().order_by('fecha', 'hora_inicio')
        docente_id = request.query_params.get('docente')
        materia_id = request.query_params.get('materia')
        fecha = request.query_params.get('fecha')
        estado = request.query_params.get('estado')
        if docente_id == 'me':
            docente_id = request.user.id
        if docente_id:
            disponibilidades = disponibilidades.filter(
                docente_id=docente_id
            )
        if materia_id:
            disponibilidades = disponibilidades.filter(
                materia_id=materia_id
            )
        if fecha:
            disponibilidades = disponibilidades.filter(fecha=fecha)
        if estado:
            disponibilidades = disponibilidades.filter(estado=estado)
        serializer = BloqueDisponibilidadSerializer(
            disponibilidades,
            many=True
        )
        return Response(
            serializer.data,
            status=status.HTTP_200_OK
        )

    @extend_schema(
        request=BloqueDisponibilidadSerializer,
        responses={201: BloqueDisponibilidadSerializer}
    )
    def post(self, request, format=None):
        serializer = BloqueDisponibilidadSerializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save(docente=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


@extend_schema(tags=['Disponibilidad'])
class DisponibilidadUpdateView(views.APIView):
    permission_classes = [LecturaODocente]

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

    @extend_schema(responses={200: dict, 204: None})
    def delete(self, request, pk, format=None):
        disponibilidad = self.get_propia(request, pk)

        # Un bloque que ya empezó es historial: cambiarlo alteraría los reportes.
        if bloque_iniciado(disponibilidad):
            return Response(
                {'detail': 'Este bloque ya inició o terminó, así que no se puede eliminar ni cancelar.'},
                status=status.HTTP_400_BAD_REQUEST
            )

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
