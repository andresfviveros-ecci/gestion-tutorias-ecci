from rest_framework import serializers
from apps.tutorias.models import Tutoria
from apps.disponibilidad.models import BloqueDisponibilidad

class TutoriaRegisterSerializer(serializers.ModelSerializer):
    bloque_id = serializers.IntegerField(write_only=True)
    class Meta:
        model = Tutoria
        fields = [
            'bloque_id',
            'tema',
            'descripcion',
        ]
    def validate_bloque_id(self, value):
        try:
            bloque = BloqueDisponibilidad.objects.get(id=value)
        except BloqueDisponibilidad.DoesNotExist:
            raise serializers.ValidationError(
                'El bloque de disponibilidad no existe.'
            )
        if bloque.estado != 'DISPONIBLE':
            raise serializers.ValidationError(
                'El bloque de disponibilidad no está disponible.'
            )
        if bloque.cupo_ocupado >= bloque.cupo_total:
            raise serializers.ValidationError(
                'El bloque de disponibilidad no tiene cupos disponibles.'
            )
        return value
    def create(self, validated_data):
        bloque_id = validated_data.pop('bloque_id')
        estudiante = self.context['request'].user
        bloque = BloqueDisponibilidad.objects.get(id=bloque_id)
        tutoria = Tutoria.objects.create(
            bloque=bloque,
            estudiante=estudiante,
            codigo=f'TUT-{bloque.id}-{estudiante.id}',
            **validated_data
        )
        bloque.cupo_ocupado += 1
        if bloque.cupo_ocupado >= bloque.cupo_total:
            bloque.estado = 'COMPLETO'
        bloque.save()
        return tutoria