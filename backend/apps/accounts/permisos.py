from rest_framework.permissions import SAFE_METHODS, BasePermission

""" PERMISOS POR GRUPO
Reemplazan los if not request.user.groups.filter(...) de cada método.
Las clases Lectura* dejan pasar GET/HEAD/OPTIONS a cualquier usuario
autenticado y exigen el grupo para escribir. """

# RF-05: el Administrador hace todo lo de la coordinación y además
# gestiona a los coordinadores.
COORDINACION = ('Coordinador', 'Administrador')


def en_grupos(user, grupos):
    return user.is_superuser or user.groups.filter(name__in=grupos).exists()


def es_coordinacion(user):
    return en_grupos(user, COORDINACION)


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
        return en_grupos(user, self.grupos)


class EsAdministrador(EnGrupos):
    grupos = ('Administrador',)


class EsCoordinador(EnGrupos):
    grupos = COORDINACION


class EsDocente(EnGrupos):
    grupos = ('Docente',)


class EsEstudiante(EnGrupos):
    grupos = ('Estudiante',)


class EsCoordinadorOEstudiante(EnGrupos):
    grupos = COORDINACION + ('Estudiante',)


class LecturaOCoordinador(EsCoordinador):
    lectura_libre = True


class LecturaODocente(EsDocente):
    lectura_libre = True


class LecturaOEstudiante(EsEstudiante):
    lectura_libre = True
