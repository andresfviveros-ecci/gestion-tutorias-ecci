from rest_framework.permissions import SAFE_METHODS, BasePermission

""" PERMISOS POR GRUPO
Reemplazan los if not request.user.groups.filter(...) de cada método.
Las clases Lectura* dejan pasar GET/HEAD/OPTIONS a cualquier usuario
autenticado y exigen el grupo para escribir. """
class EnGrupos(BasePermission):
    grupos = ()
    lectura_libre = False
    message = 'No tienes permisos para realizar esta operación.'

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False
        if self.lectura_libre and request.method in SAFE_METHODS:
            return True
        if user.is_superuser:
            return True
        return user.groups.filter(name__in=self.grupos).exists()


class EsCoordinador(EnGrupos):
    grupos = ('Coordinador',)


class EsDocente(EnGrupos):
    grupos = ('Docente',)


class EsEstudiante(EnGrupos):
    grupos = ('Estudiante',)


class EsCoordinadorOEstudiante(EnGrupos):
    grupos = ('Coordinador', 'Estudiante')


class LecturaOCoordinador(EsCoordinador):
    lectura_libre = True


class LecturaODocente(EsDocente):
    lectura_libre = True


class LecturaOEstudiante(EsEstudiante):
    lectura_libre = True
