from rest_framework import status, views
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Q

from apps.disponibilidad.models import BloqueDisponibilidad
from .serializers import (
    BloqueDisponibilidadSerializer,
    BloqueDisponibilidadUpdateSerializer
)
from drf_spectacular.utils import extend_schema


def existe_conflicto(docente, fecha, hora_inicio, hora_fin, excluir_id=None):
    conflictos = BloqueDisponibilidad.objects.filter(
        docente=docente,
        fecha=fecha,
        hora_inicio__lt=hora_fin,
        hora_fin__gt=hora_inicio
    )
    if excluir_id is not None:
        conflictos = conflictos.exclude(pk=excluir_id)
    return conflictos.exists()
@extend_schema(tags=['Disponibilidad'])
class BloqueDisponibilidadView(views.APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
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
        responses={
            201: BloqueDisponibilidadSerializer,
            400: dict
        }
    )
    def post(self, request, format=None):
        serializer = BloqueDisponibilidadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        datos = serializer.validated_data
        if existe_conflicto(
            docente=request.user,
            fecha=datos['fecha'],
            hora_inicio=datos['hora_inicio'],
            hora_fin=datos['hora_fin']
        ):
            return Response(
                {
                    'error': (
                        'El horario seleccionado presenta conflicto '
                        'con otra disponibilidad existente.'
                    )
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        disponibilidad = serializer.save(docente=request.user)
        return Response(
            BloqueDisponibilidadSerializer(disponibilidad).data,
            status=status.HTTP_201_CREATED
        )
@extend_schema(tags=['Disponibilidad'])
class DisponibilidadUpdateView(views.APIView):
    permission_classes = [IsAuthenticated]
    def get_disponibilidad(self, pk):
        try:
            return BloqueDisponibilidad.objects.get(pk=pk)
        except BloqueDisponibilidad.DoesNotExist:
            return None
    @extend_schema(
        responses={
            200: BloqueDisponibilidadSerializer,
            404: dict
        }
    )
    def get(self, request, pk, format=None):
        disponibilidad = self.get_disponibilidad(pk)
        if disponibilidad is None:
            return Response(
                {'error': 'La disponibilidad no existe.'},
                status=status.HTTP_404_NOT_FOUND
            )
        serializer = BloqueDisponibilidadSerializer(disponibilidad)
        return Response(
            serializer.data,
            status=status.HTTP_200_OK
        )
    @extend_schema(
        request=BloqueDisponibilidadUpdateSerializer,
        responses={
            200: BloqueDisponibilidadSerializer,
            400: dict,
            403: dict,
            404: dict
        }
    )
    def put(self, request, pk, format=None):
        disponibilidad = self.get_disponibilidad(pk)
        if disponibilidad is None:
            return Response(
                {'error': 'La disponibilidad no existe.'},
                status=status.HTTP_404_NOT_FOUND
            )
        if disponibilidad.docente_id != request.user.id:
            return Response(
                {
                    'error': (
                        'No tiene permisos para actualizar '
                        'esta disponibilidad.'
                    )
                },
                status=status.HTTP_403_FORBIDDEN
            )
        serializer = BloqueDisponibilidadUpdateSerializer(
            disponibilidad,
            data=request.data
        )
        serializer.is_valid(raise_exception=True)
        datos = serializer.validated_data
        fecha = datos.get('fecha', disponibilidad.fecha)
        hora_inicio = datos.get(
            'hora_inicio',
            disponibilidad.hora_inicio
        )
        hora_fin = datos.get(
            'hora_fin',
            disponibilidad.hora_fin
        )
        if existe_conflicto(
            docente=disponibilidad.docente,
            fecha=fecha,
            hora_inicio=hora_inicio,
            hora_fin=hora_fin,
            excluir_id=disponibilidad.id
        ):
            return Response(
                {
                    'error': (
                        'El horario seleccionado presenta conflicto '
                        'con otra disponibilidad existente.'
                    )
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        cupo_total = datos.get(
            'cupo_total',
            disponibilidad.cupo_total
        )
        if cupo_total < disponibilidad.cupo_ocupado:
            return Response(
                {
                    'error': (
                        'El cupo total no puede ser menor '
                        'que los cupos que ya están ocupados.'
                    )
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        disponibilidad = serializer.save()
        return Response(
            BloqueDisponibilidadSerializer(disponibilidad).data,
            status=status.HTTP_200_OK
        )
    @extend_schema(
        responses={
            204: None,
            403: dict,
            404: dict
        }
    )
    def delete(self, request, pk, format=None):
        disponibilidad = self.get_disponibilidad(pk)

        if disponibilidad is None:
            return Response(
                {'error': 'La disponibilidad no existe.'},
                status=status.HTTP_404_NOT_FOUND
            )
        if disponibilidad.docente_id != request.user.id:
            return Response(
                {
                    'error': (
                        'No tiene permisos para eliminar '
                        'esta disponibilidad.'
                    )
                },
                status=status.HTTP_403_FORBIDDEN
            )
        if disponibilidad.cupo_ocupado > 0:
            return Response(
                {
                    'error': (
                        'No se puede eliminar una disponibilidad '
                        'que tiene cupos ocupados.'
                    )
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        disponibilidad.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)