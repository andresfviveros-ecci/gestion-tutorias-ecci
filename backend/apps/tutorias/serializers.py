from django.db import transaction
from rest_framework import serializers
from apps.tutorias.models import Tutoria, Cancelacion
from apps.disponibilidad.models import BloqueDisponibilidad


class TutoriaRegisterSerializer(serializers.ModelSerializer):
    bloque_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = Tutoria
        fields = [
            'id',
            'codigo',
            'bloque_id',
            'estudiante',
            'tema',
            'descripcion',
            'estado',
            'asistencia',
            'minutos_retraso',
            'hora_inicio_real',
            'hora_fin_real',
            'notas_docente',
            'compromisos',
        ]
        read_only_fields = [
            'id',
            'codigo',
            'estudiante',
            'estado',
            'asistencia',
            'minutos_retraso',
            'hora_inicio_real',
            'hora_fin_real',
            'notas_docente',
            'compromisos',
        ]

    def validate_bloque_id(self, value):
        if not BloqueDisponibilidad.objects.filter(id=value).exists():
            raise serializers.ValidationError(
                'El bloque de disponibilidad no existe.'
            )
        return value

    @transaction.atomic
    def create(self, validated_data):
        bloque_id = validated_data.pop('bloque_id')

        bloque = BloqueDisponibilidad.objects.select_for_update().get(
            id=bloque_id
        )

        if bloque.estado != 'DISPONIBLE':
            raise serializers.ValidationError({
                'bloque_id': 'El bloque de disponibilidad no está disponible.'
            })

        if bloque.cupo_ocupado >= bloque.cupo_total:
            raise serializers.ValidationError({
                'bloque_id': 'El bloque de disponibilidad no tiene cupos disponibles.'
            })

        estudiante = self.context['request'].user

        if Tutoria.objects.filter(
            bloque=bloque,
            estudiante=estudiante,
            estado__in=['RESERVADA', 'CONFIRMADA', 'EN_CURSO']
        ).exists():
            raise serializers.ValidationError({
                'bloque_id': 'Ya tienes una tutoría activa en este bloque.'
            })

        tutoria = Tutoria.objects.create(
            bloque=bloque,
            estudiante=estudiante,
            codigo=f'TUT-{bloque.id}-{estudiante.id}',
            **validated_data
        )

        bloque.cupo_ocupado += 1

        if bloque.cupo_ocupado >= bloque.cupo_total:
            bloque.estado = 'COMPLETO'

        bloque.save(update_fields=['cupo_ocupado', 'estado'])

        return tutoria


class TutoriaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tutoria
        fields = [
            'id',
            'codigo',
            'bloque',
            'estudiante',
            'tema',
            'descripcion',
            'estado',
            'asistencia',
            'minutos_retraso',
            'hora_inicio_real',
            'hora_fin_real',
            'notas_docente',
            'compromisos',
        ]
        read_only_fields = [
            'id',
            'codigo',
            'bloque',
            'estudiante',
            'estado',
            'asistencia',
            'minutos_retraso',
            'hora_inicio_real',
            'hora_fin_real',
            'notas_docente',
            'compromisos',
        ]


class CancelacionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Cancelacion
        fields = [
            'id',
            'tutoria',
            'origen',
            'motivo',
            'horas_previas',
            'penalizada',
        ]
        read_only_fields = [
            'id',
            'tutoria',
            'horas_previas',
            'penalizada',
        ]

    def validate_motivo(self, value):
        if not value.strip():
            raise serializers.ValidationError(
                'El motivo de cancelación es obligatorio.'
            )
        return value