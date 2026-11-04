from django.contrib import admin

from .models import SolicitudTutor


@admin.register(SolicitudTutor)
class SolicitudTutorAdmin(admin.ModelAdmin):
    list_display = ('estudiante', 'materia', 'periodo', 'nota_final', 'estado')
    list_filter = ('estado', 'periodo')
