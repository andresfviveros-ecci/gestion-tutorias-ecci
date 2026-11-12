from django.contrib.auth import get_user_model
from django.db import transaction
from rest_framework import serializers

from .models import (
    Configuracion,
    DocenteMateria,
    Inscripcion,
    Materia,
    PeriodoAcademico,
    ProgramaAcademico,
)


class ProgramaAcademicoSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProgramaAcademico
        fields = [
            'id',
            'codigo',
            'nombre',
            'facultad',
            'activo',
        ]
        extra_kwargs = {
            'codigo': {'required': True},
            'nombre': {'required': True},
            'facultad': {'required': False, 'allow_null': True, 'allow_blank': True},
            'activo': {'required': False},
        }

class MateriaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Materia
        fields = [
            'id',
            'codigo',
            'nombre',
            'creditos',
            'semestre',
            'programa',
            'activa',
        ]
        extra_kwargs = {
            'codigo': {'required': True},
            'nombre': {'required': True},
            'creditos': {'required': False},
            'semestre': {'required': False, 'allow_null': True},
            'programa': {'required': True},
            'activa': {'required': False},
        }

class PeriodoAcademicoSerializer(serializers.ModelSerializer):
    class Meta:
        model = PeriodoAcademico
        fields = [
            'id',
            'codigo',
            'fecha_inicio',
            'fecha_fin',
            'activo',
        ]
        extra_kwargs = {
            'codigo': {'required': True},
            'fecha_inicio': {'required': True},
            'fecha_fin': {'required': True},
            # Sin el validador de unicidad: activar uno desactiva los demás.
            'activo': {'required': False, 'validators': []},
        }

    def validate(self, attrs):
        fecha_inicio = attrs.get(
            'fecha_inicio',
            getattr(self.instance, 'fecha_inicio', None)
        )
        fecha_fin = attrs.get(
            'fecha_fin',
            getattr(self.instance, 'fecha_fin', None)
        )

        if fecha_inicio and fecha_fin and fecha_inicio > fecha_fin:
            raise serializers.ValidationError({
                'fecha_fin': 'La fecha final debe ser posterior o igual a la fecha inicial.'
            })

        return attrs

    # BE-25: al activar un periodo se desactivan los demás en la misma transacción.
    def _desactivar_otros(self, validated_data):
        if validated_data.get('activo'):
            otros = PeriodoAcademico.objects.filter(activo=True)
            if self.instance is not None:
                otros = otros.exclude(pk=self.instance.pk)
            otros.update(activo=False)

    @transaction.atomic
    def create(self, validated_data):
        self._desactivar_otros(validated_data)
        return super().create(validated_data)

    @transaction.atomic
    def update(self, instance, validated_data):
        self._desactivar_otros(validated_data)
        return super().update(instance, validated_data)


class DocenteMateriaSerializer(serializers.ModelSerializer):
    docente_nombre = serializers.CharField(source='docente.get_full_name', read_only=True)
    materia_nombre = serializers.CharField(source='materia.nombre', read_only=True)
    periodo_codigo = serializers.CharField(source='periodo.codigo', read_only=True)

    class Meta:
        model = DocenteMateria
        fields = [
            'id',
            'docente',
            'docente_nombre',
            'materia',
            'materia_nombre',
            'periodo',
            'periodo_codigo',
        ]

    def validate_docente(self, value):
        return validar_docente(value)


def validar_docente(usuario):
    """Una sola regla para asignar una materia o varias a la vez."""
    if not usuario.groups.filter(name='Docente').exists():
        raise serializers.ValidationError('El usuario no es docente.')
    return usuario


class AsignacionMateriasSerializer(serializers.Serializer):
    """GT-251: varias materias a un docente en una sola petición. Si alguna
    ya está asignada en el periodo o viene repetida, no se crea ninguna."""
    docente = serializers.PrimaryKeyRelatedField(queryset=get_user_model().objects.all())
    materias = serializers.ListField(
        child=serializers.PrimaryKeyRelatedField(queryset=Materia.objects.all()),
        allow_empty=False,
        max_length=50,
    )
    periodo = serializers.PrimaryKeyRelatedField(
        queryset=PeriodoAcademico.objects.all(),
        required=False,
        help_text='Por defecto, el periodo activo.',
    )

    def validate_docente(self, value):
        return validar_docente(value)

    def validate(self, attrs):
        materias = attrs['materias']
        periodo = attrs.get('periodo') or PeriodoAcademico.objects.filter(activo=True).first()
        if periodo is None:
            raise serializers.ValidationError({'periodo': 'No hay un periodo activo; indica el periodo.'})

        if len({materia.pk for materia in materias}) != len(materias):
            raise serializers.ValidationError({'materias': 'Hay materias repetidas en la lista.'})

        # GT-252: si la relación ya existe se rechaza la petición completa.
        ya_asignadas = DocenteMateria.objects.filter(
            docente=attrs['docente'], periodo=periodo, materia__in=materias
        ).select_related('materia')
        if ya_asignadas:
            raise serializers.ValidationError({'materias': [
                f'El docente ya tiene asignada {asignacion.materia.nombre} en {periodo.codigo}.'
                for asignacion in ya_asignadas
            ]})

        attrs['periodo'] = periodo
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        return DocenteMateria.objects.bulk_create([
            DocenteMateria(docente=validated_data['docente'], materia=materia, periodo=validated_data['periodo'])
            for materia in validated_data['materias']
        ])


class InscripcionSerializer(serializers.ModelSerializer):
    estudiante_nombre = serializers.CharField(source='estudiante.get_full_name', read_only=True)
    materia_nombre = serializers.CharField(source='materia.nombre', read_only=True)
    periodo_codigo = serializers.CharField(source='periodo.codigo', read_only=True)
    nota_final = serializers.SerializerMethodField()

    class Meta:
        model = Inscripcion
        fields = [
            'id',
            'estudiante',
            'estudiante_nombre',
            'materia',
            'materia_nombre',
            'periodo',
            'periodo_codigo',
            'nota_corte1',
            'nota_corte2',
            'nota_corte3',
            'nota_final',
        ]

    def get_nota_final(self, inscripcion) -> str | None:
        """Ponderada con los pesos de Configuracion; null si falta algún corte.
        Va como texto ("4.50"), igual que los cortes."""
        if 'config' not in self.context:
            self.context['config'] = Configuracion.actual()
        nota = inscripcion.nota_final(self.context['config'])
        return None if nota is None else str(nota)

    def validate_estudiante(self, value):
        if not value.groups.filter(name='Estudiante').exists():
            raise serializers.ValidationError('El usuario no es estudiante.')
        return value

class ConfiguracionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Configuracion
        fields = [
            'nota_minima',
            'nota_aprobatoria',
            'peso_corte1',
            'peso_corte2',
            'peso_corte3',
            'semestre_minimo_tutor',
            'diferencia_semestres',
            'cupos_semanales_tutor',
            'horas_anticipacion_cancelar',
            'horas_anticipacion_reservar',
            'calificacion_minima',
            'calificacion_maxima',
        ]

    def validate(self, attrs):
        datos = {campo: attrs.get(campo, getattr(self.instance, campo)) for campo in self.Meta.fields}
        if datos['peso_corte1'] + datos['peso_corte2'] + datos['peso_corte3'] != 100:
            raise serializers.ValidationError({'peso_corte3': 'Los pesos de los tres cortes deben sumar 100.'})
        if datos['nota_aprobatoria'] > datos['nota_minima']:
            raise serializers.ValidationError({
                'nota_aprobatoria': 'No puede ser mayor que la nota mínima para ser tutor.'
            })
        if datos['calificacion_minima'] >= datos['calificacion_maxima']:
            raise serializers.ValidationError({
                'calificacion_maxima': 'La calificación máxima debe ser mayor que la mínima.'
            })
        return attrs
