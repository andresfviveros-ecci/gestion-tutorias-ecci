from django.contrib import admin
from django.contrib.auth import get_user_model
from django.db.models import Q
from import_export import fields, resources
from import_export.admin import ImportExportModelAdmin
from import_export.widgets import ForeignKeyWidget

from .models import Inscripcion, Materia, PeriodoAcademico


class EstudianteWidget(ForeignKeyWidget):
    """El estudiante se busca por código institucional o por correo (sin
    distinguir mayúsculas); al exportar sale el código, o el correo si no
    tiene código."""

    def clean(self, value, row=None, **kwargs):
        valor = str(value or '').strip()
        if not valor:
            return None
        filtro = Q(email__iexact=valor) if '@' in valor else Q(codigo_institucional=valor)
        estudiante = self.model.objects.filter(filtro).first()
        if estudiante is None:
            raise ValueError(f'No hay un estudiante con código institucional o correo «{valor}».')
        return estudiante

    def render(self, value, obj=None, **kwargs):
        return (value.codigo_institucional or value.email) if value else ''


class InscripcionResource(resources.ModelResource):
    """GT-269: la coordinación importa las notas desde Excel o CSV con las
    columnas estudiante (código institucional o correo), materia (código),
    periodo (código) y los tres cortes. Si la inscripción ya existe, se
    actualizan sus notas en lugar de duplicarla."""
    estudiante = fields.Field(
        column_name='estudiante', attribute='estudiante', widget=EstudianteWidget(get_user_model()),
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
    search_fields = ('estudiante__codigo_institucional', 'estudiante__email', 'estudiante__documento', 'estudiante__first_name', 'estudiante__last_name', 'materia__codigo')
    list_select_related = ('estudiante', 'materia', 'periodo')
