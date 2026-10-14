from rest_framework import serializers
from .models import ProgramaAcademico, Materia, PeriodoAcademico

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
            'activo': {'required': False},
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