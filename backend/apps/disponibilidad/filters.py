from datetime import date

from django_filters import rest_framework as filters

from config.api import UsuarioFilter

from .choices import ESTADO_BLOQUE_CHOICES
from .models import BloqueDisponibilidad


class BloqueDisponibilidadFilter(filters.FilterSet):
    """BE-27: por defecto solo bloques de hoy en adelante y no cancelados.
    ?desde=, ?hasta= e ?incluir_pasados=1 amplían el rango; ?estado=CANCELADO
    muestra los cancelados."""
    docente = UsuarioFilter(field_name='docente_id', help_text='Id del docente, o "me".')
    materia = filters.NumberFilter(field_name='materia_id')
    periodo = filters.NumberFilter(field_name='periodo_id')
    fecha = filters.DateFilter()
    desde = filters.DateFilter(field_name='fecha', lookup_expr='gte')
    hasta = filters.DateFilter(field_name='fecha', lookup_expr='lte')
    estado = filters.ChoiceFilter(choices=ESTADO_BLOQUE_CHOICES)
    incluir_pasados = filters.BooleanFilter(method='filtrar_pasados', help_text='1 para incluir bloques pasados.')

    class Meta:
        model = BloqueDisponibilidad
        fields = []

    def filtrar_pasados(self, queryset, name, value):
        # El filtro por defecto se aplica en filter_queryset.
        return queryset

    def filter_queryset(self, queryset):
        datos = self.form.cleaned_data
        if not (datos.get('incluir_pasados') or datos.get('desde') or datos.get('fecha')):
            queryset = queryset.filter(fecha__gte=date.today())
        if not datos.get('estado'):
            queryset = queryset.exclude(estado='CANCELADO')
        return super().filter_queryset(queryset)
