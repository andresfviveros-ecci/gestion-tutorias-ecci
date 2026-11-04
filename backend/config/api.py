""" PIEZAS COMUNES DEL CONTRATO DE LA API
Paginación opcional, formato único de error y filtros compartidos. """
from django.core.exceptions import PermissionDenied as DjangoPermissionDenied
from django.db import IntegrityError
from django.db.models import ProtectedError
from django.http import Http404
from django_filters import rest_framework as filters
from rest_framework import exceptions, status
from rest_framework.exceptions import ValidationError
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import exception_handler


class PaginacionOpcional(PageNumberPagination):
    """Solo pagina cuando llega ?page=. Sin él la respuesta sigue siendo la
    lista completa, así el frontend migra pantalla por pantalla."""
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100

    def paginate_queryset(self, queryset, request, view=None):
        if self.page_query_param not in request.query_params:
            return None
        return super().paginate_queryset(queryset, request, view)

    def get_paginated_response_schema(self, schema):
        # Swagger documenta las dos formas: lista plana sin ?page= y la
        # respuesta paginada con ?page=.
        return {'oneOf': [schema, super().get_paginated_response_schema(schema)]}


# Restricciones de la base que el serializer ya valida; si chocan (dos
# peticiones a la vez) se responde 400 con el campo, no 500.
RESTRICCIONES = {
    'ux_user_email_ci': ('email', 'Ya existe un usuario con este correo.'),
    'ux_periodo_un_activo': ('activo', 'Ya hay otro periodo activo.'),
    'ux_docente_materia': ('materia', 'El docente ya tiene esta materia asignada en el periodo.'),
    'ux_inscripcion': ('materia', 'El estudiante ya está inscrito en esta materia en el periodo.'),
}


def _como_lista(errores):
    """{"campo": "mensaje"} → {"campo": ["mensaje"]}, para que errors tenga
    siempre la misma forma."""
    return {
        campo: mensajes if isinstance(mensajes, (list, dict)) else [mensajes]
        for campo, mensajes in errores.items()
    }


def _primero(valor):
    """Primer texto dentro de una estructura de errores (dict o lista)."""
    if isinstance(valor, dict):
        valor = next(iter(valor.values()), '')
    if isinstance(valor, list):
        valor = valor[0] if valor else ''
    if isinstance(valor, (dict, list)):
        return _primero(valor)
    return str(valor)


def manejar_excepcion(exc, context):
    """Formato único de error (BE-28):
    {"detail": "Mensaje para mostrar", "code": "codigo", "errors": {"campo": ["mensaje"]}}"""
    if isinstance(exc, IntegrityError):
        for nombre, (campo, mensaje) in RESTRICCIONES.items():
            if nombre in str(exc):
                return Response(
                    {'detail': mensaje, 'code': 'unique', 'errors': {campo: [mensaje]}},
                    status=status.HTTP_400_BAD_REQUEST
                )
        return None

    if isinstance(exc, ProtectedError):
        return Response(
            {
                'detail': 'No se puede eliminar porque otros registros dependen de este.',
                'code': 'protegido',
                'errors': {},
            },
            status=status.HTTP_409_CONFLICT
        )

    # DRF traduce estas excepciones de Django; se hace antes para tener sus códigos.
    # El mensaje de get_object_or_404 viene en inglés.
    if isinstance(exc, Http404):
        exc = exceptions.NotFound('No se encontró el recurso solicitado.')
    elif isinstance(exc, DjangoPermissionDenied):
        exc = exceptions.PermissionDenied(*exc.args)

    response = exception_handler(exc, context)
    if response is None:
        return None

    datos = response.data
    if isinstance(exc, ValidationError):
        errores = _como_lista(datos if isinstance(datos, dict) else {'non_field_errors': datos})
        response.data = {
            'detail': _primero(errores),
            'code': _primero(exc.get_codes()) or 'invalid',
            'errors': errores,
        }
    else:
        detalle = datos.get('detail', datos) if isinstance(datos, dict) else datos
        codigo = datos.get('code') if isinstance(datos, dict) else None
        response.data = {
            'detail': _primero(detalle),
            'code': str(codigo or _primero(exc.get_codes()) or 'error'),
            'errors': {},
        }
    return response


class UsuarioFilter(filters.CharFilter):
    """Filtro por id de usuario que también acepta "me" (el usuario en sesión)."""

    def filter(self, qs, value):
        if value == 'me':
            value = self.parent.request.user.id
        elif value and not str(value).isdigit():
            return qs.none()
        return super().filter(qs, value)
