from datetime import datetime

from django.utils import timezone
from rest_framework import serializers

from apps.catalogo.models import Configuracion
from apps.tutores.services import es_tutor_estudiante, materias_habilitadas

from .models import BloqueDisponibilidad
from .services import cupos_de_la_semana, existe_conflicto


class BloqueDisponibilidadSerializer(serializers.ModelSerializer):
    """Un solo serializer para crear, editar y leer bloques. Al editar, los
    campos que no llegan se toman del bloque guardado."""
    docente_nombre = serializers.CharField(
        source='docente.get_full_name',
        read_only=True
    )
    materia_nombre = serializers.CharField(
        source='materia.nombre',
        read_only=True,
        default=None
    )

    class Meta:
        model = BloqueDisponibilidad
        fields = [
            'id',
            'docente',
            'docente_nombre',
            'materia',
            'materia_nombre',
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
        # BE-11: el dueño, el estado y el cupo ocupado los fija el servidor.
        read_only_fields = ['docente', 'cupo_ocupado', 'estado']
        extra_kwargs = {'materia': {'required': True, 'allow_null': False}}

    def _valor(self, attrs, campo, por_defecto=None):
        if campo in attrs:
            return attrs[campo]
        return getattr(self.instance, campo, por_defecto)

    def validate(self, attrs):
        bloque = self.instance
        fecha = self._valor(attrs, 'fecha')
        hora_inicio = self._valor(attrs, 'hora_inicio')
        hora_fin = self._valor(attrs, 'hora_fin')
        cupo_total = self._valor(attrs, 'cupo_total', 1)
        periodo = self._valor(attrs, 'periodo')
        materia = self._valor(attrs, 'materia')
        docente = bloque.docente if bloque else self.context['request'].user

        if materia is None:
            raise serializers.ValidationError({'materia': 'La materia es obligatoria.'})

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

        if bloque is not None and cupo_total < bloque.cupo_ocupado:
            raise serializers.ValidationError({
                'cupo_total': (
                    'No puede ser menor que los cupos '
                    'que ya están ocupados.'
                )
            })

        # BE-10: nada en el pasado ni fuera del periodo activo.
        if datetime.combine(fecha, hora_inicio) <= timezone.now():
            raise serializers.ValidationError({
                'fecha': 'No se puede publicar disponibilidad en el pasado.'
            })

        if not periodo.activo:
            raise serializers.ValidationError({
                'periodo': 'El periodo académico no está activo.'
            })

        if not periodo.fecha_inicio <= fecha <= periodo.fecha_fin:
            raise serializers.ValidationError({
                'fecha': (
                    f'La fecha debe estar dentro del periodo {periodo.codigo} '
                    f'({periodo.fecha_inicio} a {periodo.fecha_fin}).'
                )
            })

        # RF-04: solo en las materias habilitadas para el tutor en el periodo
        # (asignadas al docente o aprobadas al estudiante).
        if materia.id not in materias_habilitadas(docente, periodo):
            raise serializers.ValidationError({
                'materia': f'No estás habilitado en la materia {materia.nombre} en el periodo {periodo.codigo}.'
            })

        # RF-06: el tutor estudiante no pasa de cupos_semanales_tutor por semana.
        if es_tutor_estudiante(docente):
            limite = Configuracion.actual().cupos_semanales_tutor
            ocupados = cupos_de_la_semana(docente, fecha, excluir_id=bloque.pk if bloque else None)
            if ocupados + cupo_total > limite:
                raise serializers.ValidationError({
                    'cupo_total': (
                        f'Superas los {limite} cupos por semana: ya tienes {ocupados} '
                        f'publicados en la semana del {fecha:%Y-%m-%d}.'
                    )
                }, code='cupos_semanales')

        if existe_conflicto(
            docente=docente,
            fecha=fecha,
            hora_inicio=hora_inicio,
            hora_fin=hora_fin,
            excluir_id=bloque.pk if bloque else None
        ):
            raise serializers.ValidationError(
                'El horario seleccionado presenta conflicto '
                'con otra disponibilidad existente.'
            )

        return attrs

    def update(self, instance, validated_data):
        bloque = super().update(instance, validated_data)
        # Si cambia cupo_total, el estado se recalcula con el cupo ocupado.
        # Un bloque cancelado o cerrado se queda como está.
        if bloque.estado in ('DISPONIBLE', 'COMPLETO'):
            estado = 'DISPONIBLE' if bloque.cupo_ocupado < bloque.cupo_total else 'COMPLETO'
            if estado != bloque.estado:
                bloque.estado = estado
                bloque.save(update_fields=['estado'])
        return bloque
