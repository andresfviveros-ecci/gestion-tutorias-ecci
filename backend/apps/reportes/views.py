from django.shortcuts import get_object_or_404
from drf_spectacular.utils import OpenApiParameter, extend_schema, inline_serializer
from rest_framework import serializers, status, views
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from apps.accounts.permisos import EsCoordinador
from apps.catalogo.models import PeriodoAcademico

from .services import indicadores_panel, reporte_tutores


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


@extend_schema(
    tags=['Reportes'],
    parameters=[OpenApiParameter('periodo', int, description='Id del periodo; por defecto, el activo.')],
    responses={200: inline_serializer('ReporteTutor', {
        'id': serializers.IntegerField(),
        'nombre': serializers.CharField(),
        'tipo': serializers.ChoiceField(choices=['Docente', 'Estudiante']),
        'tutorias': serializers.IntegerField(),
        'completadas': serializers.IntegerField(),
        'no_asistio': serializers.IntegerField(),
        'canceladas_por_tutor': serializers.IntegerField(),
        'evaluaciones': serializers.IntegerField(),
        'promedio_calificacion': serializers.FloatField(allow_null=True),
    }, many=True)},
)
class ReporteTutoresView(views.APIView):
    """RF-09: reporte por tutor para la coordinación."""
    permission_classes = [EsCoordinador]

    def get(self, request, format=None):
        periodo_id = request.query_params.get('periodo')
        if periodo_id is not None and not periodo_id.isdigit():
            raise ValidationError({'periodo': 'Debe ser el id de un periodo.'})
        if periodo_id:
            periodo = get_object_or_404(PeriodoAcademico, pk=periodo_id)
        else:
            periodo = PeriodoAcademico.objects.filter(activo=True).first()
            if periodo is None:
                raise ValidationError({'periodo': 'No hay un periodo activo; indica ?periodo=.'})
        return Response(reporte_tutores(periodo), status=status.HTTP_200_OK)
