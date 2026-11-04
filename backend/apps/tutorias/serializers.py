from datetime import datetime
from uuid import uuid4

from django.db import transaction
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from apps.catalogo.models import Configuracion
from apps.disponibilidad.models import BloqueDisponibilidad
from apps.tutores.services import validar_tutor_para_reserva
from apps.tutorias.models import Cancelacion, Tutoria

from .estados import ACTIVOS
from .services import (
    ESTADOS_DEL_TUTOR,
    MAX_MINUTOS_RETRASO,
    bloque_iniciado,
    estados_para_tutor,
    limite_cancelacion,
    notificar_reserva,
    puede_cancelar,
    puede_editar,
    validar_plazo_reserva,
)


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
        # RF-08: y con la anticipación de Configuracion.
        validar_plazo_reserva(bloque)

        if bloque.cupo_ocupado >= bloque.cupo_total:
            raise serializers.ValidationError({
                'bloque_id': 'El bloque de disponibilidad no tiene cupos disponibles.'
            })

        estudiante = self.context['request'].user

        if Tutoria.objects.filter(
            bloque=bloque,
            estudiante=estudiante,
            estado__in=ACTIVOS
        ).exists():
            raise serializers.ValidationError({
                'bloque_id': 'Ya tienes una tutoría activa en este bloque.'
            })
        # RF-04 y RF-02: el tutor sigue habilitado y le lleva semestres al estudiante.
        validar_tutor_para_reserva(bloque, estudiante)

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
    limite_cancelacion = serializers.SerializerMethodField()

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
            'limite_cancelacion',
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

    def _config(self):
        # Una sola consulta por respuesta, aunque sea un listado.
        if 'config' not in self.context:
            self.context['config'] = Configuracion.actual()
        return self.context['config']

    def get_puede_cancelar(self, tutoria) -> bool:
        return puede_cancelar(tutoria, self._config())

    def get_puede_editar(self, tutoria) -> bool:
        return puede_editar(tutoria)

    def get_limite_cancelacion(self, tutoria) -> datetime:
        """Hasta cuándo puede cancelar el estudiante (RF-08)."""
        return limite_cancelacion(tutoria, self._config())


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


class TutoriaRecibidaSerializer(TutoriaSerializer):
    """Tutoría vista por el tutor: trae a qué estados la puede llevar."""
    estados_siguientes = serializers.SerializerMethodField()

    class Meta(TutoriaSerializer.Meta):
        fields = TutoriaSerializer.Meta.fields + ['estados_siguientes']

    def get_estados_siguientes(self, tutoria) -> list[str]:
        return estados_para_tutor(tutoria)


class CambioEstadoSerializer(serializers.Serializer):
    estado = serializers.ChoiceField(choices=ESTADOS_DEL_TUTOR)
    motivo = serializers.CharField(required=False, allow_blank=True)
    notas_docente = serializers.CharField(required=False, allow_blank=True)
    compromisos = serializers.CharField(required=False, allow_blank=True)
    minutos_retraso = serializers.IntegerField(required=False, min_value=0, max_value=MAX_MINUTOS_RETRASO)

    def validate(self, attrs):
        if attrs['estado'] == 'CANCELADA_DOCENTE' and not attrs.get('motivo', '').strip():
            raise serializers.ValidationError({'motivo': 'El motivo de cancelación es obligatorio.'})
        if attrs['estado'] != 'COMPLETADA' and attrs.get('minutos_retraso'):
            raise serializers.ValidationError({'minutos_retraso': 'Solo aplica a tutorías completadas.'})
        return attrs
