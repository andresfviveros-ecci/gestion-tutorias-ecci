from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import views, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import ValidationError
from drf_spectacular.utils import extend_schema

from apps.tutorias.models import Tutoria
from apps.disponibilidad.models import BloqueDisponibilidad
from .serializer import (
    TutoriaRegisterSerializer,
    TutoriaSerializer,
    CancelacionSerializer,
)


@extend_schema(tags=['Tutorías'])
class TutoriaView(views.APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(responses={200: TutoriaSerializer(many=True)})
    def get(self, request, format=None):
        tutorias = Tutoria.objects.filter(
            estudiante=request.user
        ).select_related('bloque')

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
class TutoriaDetailView(views.APIView):
    permission_classes = [IsAuthenticated]

    def get_tutoria(self, pk, user):
        return get_object_or_404(
            Tutoria.objects.select_related('bloque'),
            pk=pk,
            estudiante=user
        )

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
        tutoria = self.get_tutoria(pk, request.user)

        if tutoria.estado != 'RESERVADA':
            raise ValidationError(
                'Solo se pueden actualizar tutorías en estado RESERVADA.'
            )

        serializer = TutoriaSerializer(
            tutoria,
            data=request.data
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        request=TutoriaSerializer,
        responses={200: TutoriaSerializer}
    )
    def patch(self, request, pk, format=None):
        tutoria = self.get_tutoria(pk, request.user)

        if tutoria.estado != 'RESERVADA':
            raise ValidationError(
                'Solo se pueden actualizar tutorías en estado RESERVADA.'
            )

        serializer = TutoriaSerializer(
            tutoria,
            data=request.data,
            partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        request=CancelacionSerializer,
        responses={200: dict}
    )
    @transaction.atomic
    def delete(self, request, pk, format=None):
        tutoria = get_object_or_404(
            Tutoria.objects.select_for_update().select_related('bloque'),
            pk=pk,
            estudiante=request.user
        )

        if tutoria.estado != 'RESERVADA':
            raise ValidationError(
                'Solo se pueden cancelar tutorías en estado RESERVADA.'
            )

        serializer = CancelacionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        bloque = BloqueDisponibilidad.objects.select_for_update().get(
            pk=tutoria.bloque_id
        )

        cancelacion = serializer.save(
            tutoria=tutoria,
            cancelado_por=request.user
        )

        tutoria.estado = 'CANCELADA'
        tutoria.save(update_fields=['estado'])

        if bloque.cupo_ocupado > 0:
            bloque.cupo_ocupado -= 1

        if (
            bloque.estado == 'COMPLETO'
            and bloque.cupo_ocupado < bloque.cupo_total
        ):
            bloque.estado = 'DISPONIBLE'

        bloque.save(update_fields=['cupo_ocupado', 'estado'])

        return Response({
            'message': 'La tutoría fue cancelada correctamente.',
            'cancelacion': CancelacionSerializer(cancelacion).data
        }, status=status.HTTP_200_OK)