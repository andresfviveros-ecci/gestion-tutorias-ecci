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

    def validate(self, attrs):
        hora_inicio = attrs.get('hora_inicio')
        hora_fin = attrs.get('hora_fin')
        cupo_total = attrs.get('cupo_total', 1)

        if hora_inicio is not None and hora_fin is not None:
            if hora_inicio >= hora_fin:
                raise serializers.ValidationError({
                    'hora_fin': (
                        'La hora de finalización debe ser posterior '
                        'a la hora de inicio.'
                    )
                })

        if cupo_total < 1:
            raise serializers.ValidationError({
                'cupo_total': 'El cupo total debe ser mayor que cero.'
            })

        return attrs


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

    def validate(self, attrs):
        hora_inicio = attrs.get(
            'hora_inicio',
            self.instance.hora_inicio
        )
        hora_fin = attrs.get(
            'hora_fin',
            self.instance.hora_fin
        )
        cupo_total = attrs.get(
            'cupo_total',
            self.instance.cupo_total
        )

        if hora_inicio >= hora_fin:
            raise serializers.ValidationError({
                'hora_fin': (
                    'La hora de finalización debe ser posterior '
                    'a la hora de inicio.'
                )
            })

        if cupo_total < 1:
            raise serializers.ValidationError({
                'cupo_total': 'El cupo total debe ser mayor que cero.'
            })

        if cupo_total < self.instance.cupo_ocupado:
            raise serializers.ValidationError({
                'cupo_total': (
                    'No puede ser menor que los cupos '
                    'que ya están ocupados.'
                )
            })

        return attrs