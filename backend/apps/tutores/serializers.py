from rest_framework import serializers

from apps.catalogo.models import Configuracion, PeriodoAcademico, calcular_nota_final

from .models import SolicitudTutor
from .services import docentes_revisores, materia_cursada


class SolicitudTutorSerializer(serializers.ModelSerializer):
    estudiante_nombre = serializers.CharField(source='estudiante.get_full_name', read_only=True)
    estudiante_semestre = serializers.IntegerField(source='estudiante.semestre', read_only=True)
    materia_nombre = serializers.CharField(source='materia.nombre', read_only=True)
    periodo_codigo = serializers.CharField(source='periodo.codigo', read_only=True)
    revisada_por_nombre = serializers.CharField(source='revisada_por.get_full_name', read_only=True, default=None)

    class Meta:
        model = SolicitudTutor
        fields = [
            'id',
            'estudiante',
            'estudiante_nombre',
            'estudiante_semestre',
            'materia',
            'materia_nombre',
            'periodo',
            'periodo_codigo',
            'nota_corte1',
            'nota_corte2',
            'nota_corte3',
            'nota_final',
            'estado',
            'motivo',
            'revisada_por',
            'revisada_por_nombre',
            'fecha_revision',
            'date_creation',
        ]
        read_only_fields = [
            'id',
            'estudiante',
            'periodo',
            'nota_final',
            'estado',
            'motivo',
            'revisada_por',
            'fecha_revision',
            'date_creation',
        ]

    def validate(self, attrs):
        """RF-02: nota mínima, semestre mínimo, materia ya cursada y un
        docente que la revise en el periodo activo."""
        estudiante = self.context['request'].user
        materia = attrs['materia']
        config = Configuracion.actual()
        periodo = PeriodoAcademico.objects.filter(activo=True).first()

        if periodo is None:
            raise serializers.ValidationError('No hay un periodo académico activo.')
        if not materia.activa:
            raise serializers.ValidationError({'materia': 'La materia no está activa.'})
        if estudiante.semestre is None:
            raise serializers.ValidationError('Tu semestre no está registrado; pídele a la coordinación que lo actualice.')
        if estudiante.semestre < config.semestre_minimo_tutor:
            raise serializers.ValidationError(
                f'Para ser tutor debes cursar al menos el semestre {config.semestre_minimo_tutor}.'
            )

        nota_final = calcular_nota_final(attrs['nota_corte1'], attrs['nota_corte2'], attrs['nota_corte3'], config)
        if nota_final < config.nota_minima:
            raise serializers.ValidationError({
                'nota_corte3': f'La nota final ({nota_final}) es menor que la mínima ({config.nota_minima}).'
            })
        if not materia_cursada(estudiante, materia, periodo):
            raise serializers.ValidationError({'materia': 'Solo puedes pedir ser tutor de una materia que ya cursaste.'})
        if not docentes_revisores(materia, periodo):
            raise serializers.ValidationError({
                'materia': f'La materia no tiene docente asignado en el periodo {periodo.codigo}.'
            })
        if SolicitudTutor.objects.filter(
            estudiante=estudiante, materia=materia, periodo=periodo, estado__in=('PENDIENTE', 'APROBADA')
        ).exists():
            raise serializers.ValidationError({
                'materia': 'Ya tienes una solicitud pendiente o aprobada en esta materia.'
            })

        attrs.update(estudiante=estudiante, periodo=periodo, nota_final=nota_final)
        return attrs


class RevisionSerializer(serializers.Serializer):
    motivo = serializers.CharField(required=False, allow_blank=True, help_text='Obligatorio en las tres decisiones.')
