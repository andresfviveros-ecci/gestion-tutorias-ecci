from django.contrib import admin
from import_export.admin import ImportExportModelAdmin
from django.contrib.auth.models import Group
from .models import User


@admin.register(User)
class UserAdmin(ImportExportModelAdmin):
    list_display = [
        'username','nombres','apellidos','email','documento','rol','is_active',
    ]
    list_filter = [
        'rol','is_active','groups',
    ]
    search_fields = [
        'username','nombres','apellidos','documento','email',
    ]

    filter_horizontal = ['groups']

    def save_related(self, request, form, formsets, change):
        super().save_related(request, form, formsets, change)

        if not change and not form.instance.groups.exists():
            estudiante = Group.objects.get(id=4)
            form.instance.groups.add(estudiante)