from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from django.db import transaction
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import generics, serializers, status, views
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle

from .permisos import EsCoordinador, EsCoordinadorOEstudiante
from .serializers import (
    ChangePasswordSerializer,
    CoordinatorSerializer,
    LoginSerializers,
    MeSerializer,
    RecoveryTokenSerializer,
    StudentRegisterSerializer,
    TutorRegisterSerializer,
)

MensajeSerializer = inline_serializer('Mensaje', {'message': serializers.CharField()})


""" API PARA INICIAR SESION"""
@extend_schema(tags=['Autenticación'])
class LoginView(views.APIView):
    permission_classes = [AllowAny]

    @extend_schema(
        request=LoginSerializers,
        responses={200: inline_serializer('Sesion', {
            'access': serializers.CharField(),
            'refresh': serializers.CharField(),
            'groups': serializers.ListField(child=serializers.ListField()),
        })}
    )
    def post(self, request, format=None):
        serializer = LoginSerializers(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        return Response({
            'access': serializer.validated_data['access'],
            'refresh': serializer.validated_data['refresh'],
            'groups': list(user.groups.values_list('id', 'name')),
        }, status=status.HTTP_200_OK)


""" API DEL USUARIO EN SESION """
@extend_schema(tags=['Autenticación'])
class MeView(views.APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(responses={200: MeSerializer})
    def get(self, request, format=None):
        return Response(MeSerializer(request.user).data, status=status.HTTP_200_OK)


""" API PARA RECUPERAR CONTRASEÑA """
@extend_schema(tags=['Autenticación'])
class RecoveryTokenView(views.APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'recovery'

    @extend_schema(
        request=RecoveryTokenSerializer,
        responses={200: inline_serializer('RecuperacionIniciada', {
            'message': serializers.CharField(),
            'token': serializers.CharField(),
        })}
    )
    def post(self, request, format=None):
        serializer = RecoveryTokenSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = serializer.validated_data['user']
        pin = serializer.validated_data['pin']

        # Solo se envía el correo si el usuario existe, pero la respuesta es
        # igual en ambos casos para no revelar qué correos están registrados.
        # Un fallo del correo tampoco cambia la respuesta.
        if user:
            transaction.on_commit(lambda: send_mail(
                'Recuperación de contraseña',
                f'Tu código de recuperación es: {pin}',
                settings.DEFAULT_FROM_EMAIL,
                [user.email],
                fail_silently=True,
            ))

        return Response(
            {
                'message': 'Si el correo está registrado, recibirás un código de recuperación.',
                'token': serializer.validated_data['token']
            },
            status=status.HTTP_200_OK
        )

""" API PARA CAMBIAR CONTRASEÑA """
@extend_schema(tags=['Autenticación'])
class ChangePasswordView(views.APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'change_password'

    @extend_schema(request=ChangePasswordSerializer, responses={200: MensajeSerializer})
    def post(self, request, format=None):
        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(
            {'message': 'La contraseña se ha actualizado correctamente.'},
            status=status.HTTP_200_OK
        )

def proteger_usuario(request, user, borrar=False):
    """Reglas para editar o borrar cuentas desde los CRUD de usuarios:
    solo un superusuario toca a otro superusuario, nadie se borra a sí
    mismo y siempre queda al menos un coordinador activo."""
    if user.is_superuser and not request.user.is_superuser:
        raise PermissionDenied('Solo un superusuario puede editar o eliminar a otro superusuario.')
    if not borrar:
        return
    if user.pk == request.user.pk:
        raise ValidationError('No puedes eliminar tu propia cuenta.')
    if user.groups.filter(name='Coordinador').exists():
        otros = get_user_model().objects.filter(
            groups__name='Coordinador',
            is_active=True
        ).exclude(pk=user.pk)
        if not otros.exists():
            raise ValidationError('No se puede eliminar al último coordinador activo.')


def eliminar_o_desactivar(request, user):
    """Borra el usuario si no tiene historial. Si tiene tutorías o bloques
    (BE-14) lo desactiva, para no perder ese historial ni responder 500."""
    proteger_usuario(request, user, borrar=True)
    if user.tutorias.exists() or user.disponibilidades.exists():
        user.is_active = False
        user.save(update_fields=['is_active'])
        return Response(
            {'detail': 'El usuario tiene tutorías o disponibilidad registradas; se desactivó en lugar de eliminarse.'},
            status=status.HTTP_200_OK
        )
    user.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


class UsuarioListView(generics.ListCreateAPIView):
    """Listado (paginado con ?page=, filtro ?is_active=) y alta de usuarios
    de un grupo. La coordinación ve también a los inactivos, para poder
    reactivarlos; con solo_activos, los demás grupos solo ven los activos."""
    permission_classes = [EsCoordinador]
    filterset_fields = ['is_active']
    grupo = None
    solo_activos = False

    def get_queryset(self):
        users = get_user_model().objects.filter(groups__name=self.grupo)
        if self.solo_activos and not self.request.user.groups.filter(name='Coordinador').exists():
            users = users.filter(is_active=True)
        return users.distinct().order_by('id')


class UsuarioDetailView(views.APIView):
    """Detalle de un usuario de un grupo: GET, PUT, PATCH y DELETE."""
    permission_classes = [EsCoordinador]
    grupo = None
    serializer_class = None

    def get_user(self, pk):
        return get_object_or_404(get_user_model(), pk=pk, groups__name=self.grupo)

    def actualizar(self, request, pk, partial):
        user = self.get_user(pk)
        proteger_usuario(request, user)
        serializer = self.serializer_class(
            user, data=request.data, partial=partial, context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)

    def get(self, request, pk, format=None):
        serializer = self.serializer_class(self.get_user(pk))
        return Response(serializer.data, status=status.HTTP_200_OK)

    def put(self, request, pk, format=None):
        return self.actualizar(request, pk, partial=False)

    def patch(self, request, pk, format=None):
        return self.actualizar(request, pk, partial=True)

    @extend_schema(responses={200: inline_serializer('UsuarioDesactivado', {'detail': serializers.CharField()}), 204: None})
    def delete(self, request, pk, format=None):
        return eliminar_o_desactivar(request, self.get_user(pk))


""" API PARA CRUD ESTUDIANTE"""
@extend_schema(tags=['Estudiantes'])
class StudentView(UsuarioListView):
    grupo = 'Estudiante'
    serializer_class = StudentRegisterSerializer


@extend_schema(tags=['Estudiantes'])
class StudentDetailView(UsuarioDetailView):
    grupo = 'Estudiante'
    serializer_class = StudentRegisterSerializer


""" API PARA REGISTRAR TUTORES/DOCENTE """
@extend_schema(tags=['Docentes'])
class TutorView(UsuarioListView):
    grupo = 'Docente'
    solo_activos = True
    serializer_class = TutorRegisterSerializer

    def get_permissions(self):
        # Los estudiantes también listan docentes para reservar.
        if self.request.method == 'GET':
            return [EsCoordinadorOEstudiante()]
        return [EsCoordinador()]


@extend_schema(tags=['Docentes'])
class TutorDetailView(UsuarioDetailView):
    grupo = 'Docente'
    serializer_class = TutorRegisterSerializer


""" API PARA CRUD COORDINADORES"""
@extend_schema(tags=['Coordinadores'])
class CoordinatorView(UsuarioListView):
    grupo = 'Coordinador'
    solo_activos = True
    serializer_class = CoordinatorSerializer


@extend_schema(tags=['Coordinadores'])
class CoordinatorDetailView(UsuarioDetailView):
    # Con RF-05 pasa a ser solo para el grupo Administrador.
    grupo = 'Coordinador'
    serializer_class = CoordinatorSerializer
