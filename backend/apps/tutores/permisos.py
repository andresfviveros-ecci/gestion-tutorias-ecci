from rest_framework.permissions import SAFE_METHODS, BasePermission

from .services import es_tutor, puede_publicar


class LecturaOTutor(BasePermission):
    """RF-01: cualquiera autenticado lee; publica y edita bloques quien puede
    publicar (docente o estudiante habilitado en el periodo activo)."""
    message = 'Solo los docentes y los estudiantes habilitados como tutores publican disponibilidad.'

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False
        return request.method in SAFE_METHODS or puede_publicar(user)


class EsTutor(BasePermission):
    message = 'Solo los tutores ven las tutorías de sus bloques.'

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and es_tutor(request.user))
