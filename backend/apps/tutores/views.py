from django.db import transaction
from django.db.models import Exists, OuterRef
from django.shortcuts import get_object_or_404
from django_filters import rest_framework as filters
from drf_spectacular.utils import extend_schema
from rest_framework import generics, status, views
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.accounts.permisos import EsEstudiante, en_grupos, es_coordinacion
from apps.catalogo.models import DocenteMateria
from config.api import UsuarioFilter

from .models import SolicitudTutor
from .serializers import RevisionSerializer, SolicitudTutorSerializer
from .services import notificar_solicitud, revisar


def solicitudes_visibles(user):
    """La coordinación ve todas; el docente, las de las materias que tiene
    asignadas en el periodo de la solicitud; el estudiante, las suyas."""
    solicitudes = SolicitudTutor.objects.select_related('estudiante', 'materia', 'periodo', 'revisada_por')
    if es_coordinacion(user):
        return solicitudes
    if en_grupos(user, ('Docente',)):
        asignada = DocenteMateria.objects.filter(
            docente=user, materia=OuterRef('materia'), periodo=OuterRef('periodo')
        )
        return solicitudes.filter(Exists(asignada))
    return solicitudes.filter(estudiante=user)


class SolicitudTutorFilter(filters.FilterSet):
    estudiante = UsuarioFilter(field_name='estudiante_id', help_text='Id del estudiante, o "me".')

    class Meta:
        model = SolicitudTutor
        fields = ['estudiante', 'materia', 'periodo', 'estado']


@extend_schema(tags=['Tutores'])
class SolicitudTutorView(generics.ListCreateAPIView):
    """GET: solicitudes visibles para el usuario. POST: el estudiante pide
    ser tutor de una materia (RF-02)."""
    serializer_class = SolicitudTutorSerializer
    filterset_class = SolicitudTutorFilter

    def get_permissions(self):
        return [EsEstudiante()] if self.request.method == 'POST' else [IsAuthenticated()]

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):  # generación del esquema
            return SolicitudTutor.objects.none()
        return solicitudes_visibles(self.request.user)

    @transaction.atomic
    def perform_create(self, serializer):
        solicitud = serializer.save()
        notificar_solicitud(solicitud)


@extend_schema(tags=['Tutores'])
class SolicitudTutorDetailView(generics.RetrieveAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = SolicitudTutorSerializer

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):  # generación del esquema
            return SolicitudTutor.objects.none()
        return solicitudes_visibles(self.request.user)


class RevisionView(views.APIView):
    """RF-03: aprobar, rechazar o revocar. Rechazar y revocar piden motivo."""
    permission_classes = [IsAuthenticated]
    estado = None

    @extend_schema(tags=['Tutores'], request=RevisionSerializer, responses={200: SolicitudTutorSerializer})
    def post(self, request, pk, format=None):
        solicitud = get_object_or_404(solicitudes_visibles(request.user), pk=pk)
        serializer = RevisionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        solicitud = revisar(solicitud, request.user, self.estado, serializer.validated_data.get('motivo', ''))
        return Response(SolicitudTutorSerializer(solicitud).data, status=status.HTTP_200_OK)


class AprobarView(RevisionView):
    estado = 'APROBADA'


class RechazarView(RevisionView):
    estado = 'RECHAZADA'


class RevocarView(RevisionView):
    estado = 'REVOCADA'
