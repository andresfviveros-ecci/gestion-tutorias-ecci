from rest_framework import serializers
from .models import BloqueDisponibilidad

class BloqueDisponibilidadSerializer(serializers.ModelSerializer):
    class Meta:
        model = BloqueDisponibilidad
        fields = [
            'docente',
            'fecha',
            'hora_inicio',
            'hora_fin',
            'modalidad',
        ]
        read_only_fields = ['docente']