from rest_framework.response import Response
from rest_framework import status, views
from django.conf import settings
from django.contrib.auth import get_user_model
from .serializers import *
from django.core.mail import send_mail
from django.db import transaction
from drf_spectacular.utils import extend_schema
from django.shortcuts import get_object_or_404
from rest_framework.permissions import AllowAny
from .permisos import EsCoordinador, EsCoordinadorOEstudiante
from rest_framework.throttling import ScopedRateThrottle


""" API PARA INICIAR SESION"""
@extend_schema(tags=['Autenticación'])
class LoginView(views.APIView):
    permission_classes = [AllowAny]

    def post(self, request, format=None):
        serializer = LoginSerializers(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        return Response({
            'access': serializer.validated_data['access'],
            'refresh': serializer.validated_data['refresh'],
            'groups': list(user.groups.values_list('id', 'name')),
        }, status=status.HTTP_200_OK)



""" API PARA RECUPERAR CONTRASEÑA """
@extend_schema(tags=['Autenticación'])
class RecoveryTokenView(views.APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'recovery'

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

    def post(self, request, format=None):
        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(
            {'message': 'La contraseña se ha actualizado correctamente.'},
            status=status.HTTP_200_OK
        )

def eliminar_o_desactivar(user):
    """Borra el usuario si no tiene historial. Si tiene tutorías o bloques
    (BE-14) lo desactiva, para no perder ese historial ni responder 500."""
    if user.tutorias.exists() or user.disponibilidades.exists():
        user.is_active = False
        user.save(update_fields=['is_active'])
        return Response(
            {'detail': 'El usuario tiene tutorías o disponibilidad registradas; se desactivó en lugar de eliminarse.'},
            status=status.HTTP_200_OK
        )
    user.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


""" API PARA CRUD ESTUDIANTE"""
@extend_schema(tags=['Estudiantes'])
class StudentView(views.APIView):
    permission_classes = [EsCoordinador]

    def get(self, request, format=None):
        users = get_user_model().objects.filter(groups__name='Estudiante')
        serializer = StudentRegisterSerializer(users, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(request=StudentRegisterSerializer)
    def post(self, request, format=None):
        serializer = StudentRegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)


@extend_schema(tags=['Estudiantes'])
class StudentDetailView(views.APIView):
    permission_classes = [EsCoordinador]

    def get_user(self, pk):
        return get_object_or_404(get_user_model(), pk=pk, groups__name='Estudiante')

    def get(self, request, pk, format=None):
        serializer = StudentRegisterSerializer(self.get_user(pk))
        return Response(serializer.data, status=status.HTTP_200_OK)

    def put(self, request, pk, format=None):
        serializer = StudentRegisterSerializer(self.get_user(pk), data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)

    def delete(self, request, pk, format=None):
        return eliminar_o_desactivar(self.get_user(pk))


""" API PARA REGISTRAR TUTORES/DOCENTE """
@extend_schema(tags=['Docentes'])
class TutorView(views.APIView):

    def get_permissions(self):
        # Los estudiantes también listan docentes para reservar.
        if self.request.method == 'GET':
            return [EsCoordinadorOEstudiante()]
        return [EsCoordinador()]

    def get(self, request, format=None):
        users = get_user_model().objects.filter(groups__name='Docente', is_active=True).distinct()
        serializer = TutorRegisterSerializer(users, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    @extend_schema(request=TutorRegisterSerializer)
    def post(self, request, format=None):
        serializer = TutorRegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)


@extend_schema(tags=['Docentes'])
class TutorDetailView(views.APIView):
    permission_classes = [EsCoordinador]

    def get_user(self, pk):
        return get_object_or_404(get_user_model(), pk=pk, groups__name='Docente')

    def get(self, request, pk, format=None):
        serializer = TutorRegisterSerializer(self.get_user(pk))
        return Response(serializer.data, status=status.HTTP_200_OK)

    def put(self, request, pk, format=None):
        serializer = TutorRegisterSerializer(self.get_user(pk), data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)

    def delete(self, request, pk, format=None):
        return eliminar_o_desactivar(self.get_user(pk))


""" API PARA CRUD COORDINADORES"""
@extend_schema(tags=['Coordinadores'])
class CoordinatorView(views.APIView):
    permission_classes = [EsCoordinador]

    def get(self, request, format=None):
        users = get_user_model().objects.filter(groups__name='Coordinador', is_active=True).distinct()
        serializer = CoordinatorSerializer(users, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(request=CoordinatorSerializer)
    def post(self, request, format=None):
        serializer = CoordinatorSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)


@extend_schema(tags=['Coordinadores'])
class CoordinatorDetailView(views.APIView):
    # Con RF-05 pasa a ser solo para el grupo Administrador.
    permission_classes = [EsCoordinador]

    def get_user(self, pk):
        return get_object_or_404(get_user_model(), pk=pk, groups__name='Coordinador')

    def get(self, request, pk, format=None):
        serializer = CoordinatorSerializer(self.get_user(pk))
        return Response(serializer.data, status=status.HTTP_200_OK)

    def put(self, request, pk, format=None):
        serializer = CoordinatorSerializer(self.get_user(pk), data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)

    def delete(self, request, pk, format=None):
        return eliminar_o_desactivar(self.get_user(pk))
