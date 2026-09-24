from rest_framework import status, views
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from apps.disponibilidad.models import BloqueDisponibilidad
from .serializers import BloqueDisponibilidadSerializer, BloqueDisponibilidadUpdateSerializer
class BloqueDisponibilidadView(views.APIView):
    permission_classes = [IsAuthenticated]
    def post(self, request, format=None):
        serializer = BloqueDisponibilidadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(docente=request.user)

        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
class DisponibilidadUpdateView(views.APIView):
    permission_classes = [IsAuthenticated]
    def put(self, request, pk, format=None):
        try:
            bloque = BloqueDisponibilidad.objects.get(id=pk)
        except BloqueDisponibilidad.DoesNotExist:
            return Response(
                {'error': 'La disponibilidad no existe.'},
                status=status.HTTP_404_NOT_FOUND
            )
        if bloque.docente_id != request.user.id:
            return Response(
                {'error': 'No tiene permisos para actualizar esta disponibilidad.'},
                status=status.HTTP_403_FORBIDDEN
            )
        serializer = BloqueDisponibilidadUpdateSerializer(
            bloque,
            data=request.data
        )
        serializer.is_valid(raise_exception=True)
        conflictos = BloqueDisponibilidad.objects.filter(
            docente=bloque.docente,
            fecha=serializer.validated_data.get('fecha', bloque.fecha),
            hora_inicio__lt=serializer.validated_data.get('hora_fin', bloque.hora_fin),
            hora_fin__gt=serializer.validated_data.get('hora_inicio', bloque.hora_inicio),
        ).exclude(id=bloque.id)
        if conflictos.exists():
            return Response(
                {'error': 'El horario seleccionado presenta conflicto con otra disponibilidad existente.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        bloque = serializer.save()
        return Response({
            'message': 'La disponibilidad fue actualizada correctamente.',
            'disponibilidad': {
                'id': bloque.id,
                'docente': bloque.docente_id,
                'fecha': bloque.fecha,
                'hora_inicio': bloque.hora_inicio,
                'hora_fin': bloque.hora_fin,
                'modalidad': bloque.modalidad,
            }
        }, status=status.HTTP_200_OK)