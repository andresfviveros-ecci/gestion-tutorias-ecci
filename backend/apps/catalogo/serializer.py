from rest_framework import serializers
from .models import ProgramaAcademico, Materia


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