from django.contrib import admin
from import_export.admin import ImportExportModelAdmin
from django.contrib.auth.models import Group
from .models import User


@admin.register(User)
class UserAdmin(ImportExportModelAdmin):
    list_display = [
        'username','first_name','last_name','email','documento','is_active',
    ]
    list_filter = [
        'is_active','groups',
    ]
    search_fields = [
        'username','first_name','last_name','documento','email',
    ]

    filter_horizontal = ['groups']

    def rol(self, obj):
        return ', '.join(obj.groups.values_list('name', flat=True))
    rol.short_description = 'Rol'
   