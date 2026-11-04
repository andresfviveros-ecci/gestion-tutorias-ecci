from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import serializers, status, views
from rest_framework.response import Response

from apps.accounts.permisos import EsCoordinador

from .services import indicadores_panel


@extend_schema(tags=['Reportes'])
class IndicadoresPanelView(views.APIView):
    """Indicadores del panel de coordinación (los consulta /accounts/dashboard-stats/)."""
    permission_classes = [EsCoordinador]

    @extend_schema(responses={200: inline_serializer('IndicadoresPanel', {
        'tutorias_mes': serializers.IntegerField(),
        'estudiantes_activos': serializers.IntegerField(),
        'tutores_activos': serializers.IntegerField(),
        'materia_mas_demandada': serializers.CharField(allow_null=True),
        'porcentaje_demandada': serializers.CharField(),
    })})
    def get(self, request, format=None):
        return Response(indicadores_panel(), status=status.HTTP_200_OK)
