from uuid import uuid4

from django.db import transaction
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from apps.disponibilidad.models import BloqueDisponibilidad
from apps.tutorias.models import Cancelacion, Tutoria

from .services import bloque_iniciado, notificar_reserva, puede_cancelar, puede_editar


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

        # BE-09: solo bloques que no han empezado.
        if bloque_iniciado(bloque):
            raise serializers.ValidationError({
                'bloque_id': 'El bloque de disponibilidad ya inició o terminó.'
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

        # BE-08: el código sale del id, que solo existe después de crear.
        tutoria = Tutoria.objects.create(
            bloque=bloque,
            estudiante=estudiante,
            codigo=f'TMP-{uuid4().hex[:16]}',
            **validated_data
        )
        tutoria.codigo = f'TUT-{tutoria.id:06d}'
        tutoria.save(update_fields=['codigo'])

        bloque.cupo_ocupado += 1

        if bloque.cupo_ocupado >= bloque.cupo_total:
            bloque.estado = 'COMPLETO'

        bloque.save(update_fields=['cupo_ocupado', 'estado'])
        notificar_reserva(tutoria)

        return tutoria


class ReferenciaSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    nombre = serializers.CharField()


class BloqueResumenSerializer(serializers.ModelSerializer):
    """Datos del bloque que necesita la pantalla de una tutoría (BE-22)."""
    materia = serializers.SerializerMethodField()
    docente = serializers.SerializerMethodField()

    class Meta:
        model = BloqueDisponibilidad
        fields = [
            'id',
            'fecha',
            'hora_inicio',
            'hora_fin',
            'modalidad',
            'lugar',
            'enlace_virtual',
            'materia',
            'docente',
        ]
        read_only_fields = fields

    @extend_schema_field(ReferenciaSerializer(allow_null=True))
    def get_materia(self, bloque):
        if bloque.materia is None:
            return None
        return {'id': bloque.materia_id, 'nombre': bloque.materia.nombre}

    @extend_schema_field(ReferenciaSerializer)
    def get_docente(self, bloque):
        return {'id': bloque.docente_id, 'nombre': bloque.docente.get_full_name()}


class TutoriaSerializer(serializers.ModelSerializer):
    docente = serializers.CharField(
        source='bloque.docente.get_full_name',
        read_only=True
    )
    estudiante_nombre = serializers.CharField(
        source='estudiante.get_full_name',
        read_only=True
    )
    bloque_detalle = BloqueResumenSerializer(source='bloque', read_only=True)
    puede_cancelar = serializers.SerializerMethodField()
    puede_editar = serializers.SerializerMethodField()

    class Meta:
        model = Tutoria
        fields = [
            'id',
            'codigo',
            'bloque',
            'bloque_detalle',
            'docente',
            'estudiante',
            'estudiante_nombre',
            'tema',
            'descripcion',
            'estado',
            'asistencia',
            'minutos_retraso',
            'hora_inicio_real',
            'hora_fin_real',
            'notas_docente',
            'compromisos',
            'puede_cancelar',
            'puede_editar',
        ]
        read_only_fields = [
            'id',
            'codigo',
            'bloque',
            'docente',
            'estudiante',
            'estado',
            'asistencia',
            'minutos_retraso',
            'hora_inicio_real',
            'hora_fin_real',
            'notas_docente',
            'compromisos',
        ]

    def get_puede_cancelar(self, tutoria) -> bool:
        return puede_cancelar(tutoria)

    def get_puede_editar(self, tutoria) -> bool:
        return puede_editar(tutoria)


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
        # BE-07: el origen lo fija el servidor según quién cancela.
        read_only_fields = [
            'id',
            'tutoria',
            'origen',
            'horas_previas',
            'penalizada',
        ]

    def validate_motivo(self, value):
        if not value.strip():
            raise serializers.ValidationError(
                'El motivo de cancelación es obligatorio.'
            )
        return value
