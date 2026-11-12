from rest_framework import serializers

from apps.catalogo.models import Configuracion, PeriodoAcademico

from .models import SolicitudTutor
from .services import (
    ESTADOS_VIGENTES,
    docentes_revisores,
    evaluar_postulacion,
    materias_cursadas,
)


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
        # GT-270: las notas salen del historial (la inscripción), no de lo que
        # escriba el estudiante. Basta con mandar {"materia": id}.
        read_only_fields = [
            'id',
            'estudiante',
            'periodo',
            'nota_corte1',
            'nota_corte2',
            'nota_corte3',
            'nota_final',
            'estado',
            'motivo',
            'revisada_por',
            'fecha_revision',
            'date_creation',
        ]

    def validate(self, attrs):
        """RF-02 con la misma regla del historial (evaluar_postulacion):
        materia ya cursada, semestre mínimo, nota mínima, avance, materia
        activa, docente asignado y sin otra solicitud vigente."""
        estudiante = self.context['request'].user
        materia = attrs['materia']
        config = Configuracion.actual()
        periodo = PeriodoAcademico.objects.filter(activo=True).first()
        if periodo is None:
            raise serializers.ValidationError('No hay un periodo académico activo.')

        inscripcion = next(
            (i for i in materias_cursadas(estudiante, periodo) if i.materia_id == materia.id), None
        )
        if inscripcion is None:
            raise serializers.ValidationError({'materia': 'Solo puedes pedir ser tutor de una materia que ya cursaste.'})

        evaluacion = evaluar_postulacion(
            estudiante, inscripcion, periodo, config, con_docente=bool(docentes_revisores(materia, periodo))
        )
        if evaluacion['motivo']:
            campo, mensaje = evaluacion['motivo']
            raise serializers.ValidationError(mensaje if campo == 'non_field_errors' else {campo: mensaje})
        if SolicitudTutor.objects.filter(
            estudiante=estudiante, materia=materia, periodo=periodo, estado__in=ESTADOS_VIGENTES
        ).exists():
            raise serializers.ValidationError({
                'materia': 'Ya tienes una solicitud pendiente o aprobada en esta materia.'
            })

        attrs.update(
            estudiante=estudiante,
            periodo=periodo,
            nota_corte1=inscripcion.nota_corte1,
            nota_corte2=inscripcion.nota_corte2,
            nota_corte3=inscripcion.nota_corte3,
            nota_final=evaluacion['nota'],
        )
        return attrs


class RevisionSerializer(serializers.Serializer):
    motivo = serializers.CharField(required=False, allow_blank=True, help_text='Obligatorio en las tres decisiones.')


""" RESPUESTA DE GET /tutores/historial-materias/ (GT-269)
Solo describen la forma para Swagger; los datos los arma historial_materias. """
class RequisitoSerializer(serializers.Serializer):
    cumple = serializers.BooleanField()
    valor = serializers.JSONField(allow_null=True, help_text='Número (semestre, avance) o texto (nota).')
    minimo = serializers.JSONField()


class RequisitosSerializer(serializers.Serializer):
    semestre = RequisitoSerializer()
    nota = RequisitoSerializer()
    avance = RequisitoSerializer()


class SolicitudVigenteSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    estado = serializers.CharField()
    fecha = serializers.DateTimeField()


class MateriaHistorialSerializer(serializers.Serializer):
    materia = serializers.IntegerField()
    codigo = serializers.CharField()
    nombre = serializers.CharField()
    semestre_cursado = serializers.IntegerField(allow_null=True, help_text='Semestre de la materia en el plan.')
    periodo_cursado = serializers.CharField()
    nota = serializers.CharField(allow_null=True, help_text='Nota final; null si falta algún corte.')
    aprobada = serializers.BooleanField()
    elegible = serializers.BooleanField()
    motivo = serializers.CharField(allow_null=True, help_text='Por qué no es elegible; null si lo es.')
    requisitos = RequisitosSerializer()
    solicitud = SolicitudVigenteSerializer(allow_null=True, help_text='Solicitud PENDIENTE o APROBADA, si existe.')


class ConfigPostulacionSerializer(serializers.Serializer):
    semestre_minimo_tutor = serializers.IntegerField()
    nota_minima = serializers.CharField()
    diferencia_semestres = serializers.IntegerField()
    nota_aprobatoria = serializers.CharField()


class ResumenHistorialSerializer(serializers.Serializer):
    materias_aprobadas = serializers.IntegerField()
    elegibles = serializers.IntegerField()


class HistorialMateriasSerializer(serializers.Serializer):
    estudiante = serializers.IntegerField()
    semestre = serializers.IntegerField(allow_null=True)
    periodo = serializers.IntegerField()
    periodo_codigo = serializers.CharField()
    config = ConfigPostulacionSerializer()
    resumen = ResumenHistorialSerializer()
    materias = MateriaHistorialSerializer(many=True)
