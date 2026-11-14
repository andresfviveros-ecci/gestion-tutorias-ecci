""" NOTIFICACIONES DEL USUARIO EN SESIÓN
Cada usuario solo ve y marca las suyas: la de otro responde 404. """
from django_filters import rest_framework as filters
from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import generics, serializers, views
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

from .models import Notificacion
from .serializers import NotificacionSerializer


def notificaciones_de(usuario):
    return Notificacion.objects.filter(usuario=usuario)


class NotificacionesPaginacion(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class NotificacionFilter(filters.FilterSet):
    leida = filters.BooleanFilter(help_text='false: solo las no leídas.')

    class Meta:
        model = Notificacion
        fields = ['leida']


@extend_schema(tags=['Notificaciones'])
class NotificacionListView(generics.ListAPIView):
    """Las notificaciones del usuario, de la más reciente a la más vieja,
    paginadas de a 20."""
    serializer_class = NotificacionSerializer
    filterset_class = NotificacionFilter
    pagination_class = NotificacionesPaginacion

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):  # generación del esquema
            return Notificacion.objects.none()
        return notificaciones_de(self.request.user).order_by('-date_creation', '-id')


@extend_schema(tags=['Notificaciones'])
class NotificacionDetailView(generics.UpdateAPIView):
    """PATCH {"leida": true}: marca una notificación como leída."""
    serializer_class = NotificacionSerializer
    http_method_names = ['patch', 'options']

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return Notificacion.objects.none()
        return notificaciones_de(self.request.user)


@extend_schema(
    tags=['Notificaciones'],
    responses={200: inline_serializer('ResumenNotificaciones', {'no_leidas': serializers.IntegerField()})},
)
class NotificacionResumenView(views.APIView):
    """Cuántas no leídas tiene el usuario. La campana lo consulta cada 60
    segundos: es una sola consulta con count()."""

    def get(self, request):
        return Response({'no_leidas': notificaciones_de(request.user).filter(leida=False).count()})


@extend_schema(
    tags=['Notificaciones'],
    request=None,
    responses={200: inline_serializer('NotificacionesMarcadas', {'actualizadas': serializers.IntegerField()})},
)
class MarcarTodasView(views.APIView):
    """Marca como leídas todas las notificaciones del usuario."""

    def post(self, request):
        actualizadas = notificaciones_de(request.user).filter(leida=False).update(leida=True)
        return Response({'actualizadas': actualizadas})
