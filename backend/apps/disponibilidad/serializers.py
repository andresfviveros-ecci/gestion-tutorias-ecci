from rest_framework import serializers
from .models import BloqueDisponibilidad
class BloqueDisponibilidadSerializer(serializers.ModelSerializer):
    class Meta:
        model = BloqueDisponibilidad
        fields = [
            'docente',
            'materia',
            'periodo',
            'fecha',
            'hora_inicio',
            'hora_fin',
            'modalidad',
            'lugar',
            'enlace_virtual',
            'cupo_total',
            'cupo_ocupado',
            'estado',
            'observaciones',
        ]
        read_only_fields = ['docente', 'cupo_ocupado', 'estado']



class BloqueDisponibilidadUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = BloqueDisponibilidad
        fields = [
            'materia',
            'periodo',
            'fecha',
            'hora_inicio',
            'hora_fin',
            'modalidad',
            'lugar',
            'enlace_virtual',
            'cupo_total',
            'estado',
            'observaciones',
        ]