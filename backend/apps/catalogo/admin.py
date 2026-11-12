from django.contrib import admin
from django.contrib.auth import get_user_model
from import_export import fields, resources
from import_export.admin import ImportExportModelAdmin
from import_export.widgets import ForeignKeyWidget

from .models import Inscripcion, Materia, PeriodoAcademico


class InscripcionResource(resources.ModelResource):
    """GT-269: la coordinación importa las notas desde Excel o CSV con las
    columnas documento, materia, periodo y los tres cortes. Si la inscripción
    ya existe, se actualizan sus notas."""
    estudiante = fields.Field(
        column_name='documento', attribute='estudiante',
        widget=ForeignKeyWidget(get_user_model(), field='documento'),
    )
    materia = fields.Field(column_name='materia', attribute='materia', widget=ForeignKeyWidget(Materia, field='codigo'))
    periodo = fields.Field(
        column_name='periodo', attribute='periodo', widget=ForeignKeyWidget(PeriodoAcademico, field='codigo')
    )

    class Meta:
        model = Inscripcion
        fields = ('estudiante', 'materia', 'periodo', 'nota_corte1', 'nota_corte2', 'nota_corte3')
        import_id_fields = ('estudiante', 'materia', 'periodo')
        clean_model_instances = True
        skip_unchanged = True
        report_skipped = True


@admin.register(Inscripcion)
class InscripcionAdmin(ImportExportModelAdmin):
    resource_classes = [InscripcionResource]
    list_display = ('estudiante', 'materia', 'periodo', 'nota_corte1', 'nota_corte2', 'nota_corte3')
    list_filter = ('periodo', 'materia__programa')
    search_fields = ('estudiante__documento', 'estudiante__first_name', 'estudiante__last_name', 'materia__codigo')
    list_select_related = ('estudiante', 'materia', 'periodo')
