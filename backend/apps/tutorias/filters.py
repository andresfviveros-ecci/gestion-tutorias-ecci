from django_filters import rest_framework as filters

from .choices import ESTADO_TUTORIA_CHOICES
from .models import Tutoria


class TutoriaFilter(filters.FilterSet):
    estado = filters.ChoiceFilter(choices=ESTADO_TUTORIA_CHOICES)
    materia = filters.NumberFilter(field_name='bloque__materia_id')
    desde = filters.DateFilter(field_name='bloque__fecha', lookup_expr='gte')
    hasta = filters.DateFilter(field_name='bloque__fecha', lookup_expr='lte')

    class Meta:
        model = Tutoria
        fields = []
