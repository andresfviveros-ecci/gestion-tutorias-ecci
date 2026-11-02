from rest_framework.response import Response
from rest_framework import status, views
from django.conf import settings
from django.contrib.auth import get_user_model
from .serializers import *
from django.core.mail import send_mail
from django.db import transaction
from drf_spectacular.utils import extend_schema
from rest_framework.permissions import AllowAny, IsAuthenticated
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

""" API PARA CRUD ESTUDIANTE"""
@extend_schema(tags=['Estudiantes'])
class StudentView(views.APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, format=None):
        if not request.user.groups.filter(name='Coordinador').exists():
            return Response({'detail': 'No tienes permisos para realizar esta operación.'}, status=status.HTTP_403_FORBIDDEN)
        users = get_user_model().objects.filter(groups__name='Estudiante')
        serializer = StudentRegisterSerializer(users, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(request=StudentRegisterSerializer)
    def post(self, request, format=None):
        if not request.user.groups.filter(name='Coordinador').exists():
            return Response({'detail': 'No tienes permisos para realizar esta operación.'}, status=status.HTTP_403_FORBIDDEN)
        serializer = StudentRegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)


@extend_schema(tags=['Estudiantes'])
class StudentDetailView(views.APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk, format=None):
        if not request.user.groups.filter(name='Coordinador').exists():
            return Response({'detail': 'No tienes permisos para realizar esta operación.'}, status=status.HTTP_403_FORBIDDEN)
        user = get_user_model().objects.get(pk=pk, groups__name='Estudiante')
        serializer = StudentRegisterSerializer(user)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def put(self, request, pk, format=None):
        if not request.user.groups.filter(name='Coordinador').exists():
            return Response({'detail': 'No tienes permisos para realizar esta operación.'}, status=status.HTTP_403_FORBIDDEN)
        user = get_user_model().objects.get(pk=pk, groups__name='Estudiante')
        serializer = StudentRegisterSerializer(user, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)

    def delete(self, request, pk, format=None):
        if not request.user.groups.filter(name='Coordinador').exists():
            return Response({'detail': 'No tienes permisos para realizar esta operación.'}, status=status.HTTP_403_FORBIDDEN)
        user = get_user_model().objects.get(pk=pk, groups__name='Estudiante')
        user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


""" API PARA REGISTRAR TUTORES/DOCENTE """
@extend_schema(tags=['Docentes'])
class TutorView(views.APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, format=None):
        if not request.user.groups.filter(name__in=['Coordinador', 'Estudiante']).exists():
            return Response({'detail': 'No tienes permisos para realizar esta operación.'}, status=status.HTTP_403_FORBIDDEN)
        users = get_user_model().objects.filter(groups__name='Docente', is_active=True).distinct()
        serializer = TutorRegisterSerializer(users, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    @extend_schema(request=TutorRegisterSerializer)
    def post(self, request, format=None):
        if not request.user.groups.filter(name='Coordinador').exists():
            return Response({'detail': 'No tienes permisos para realizar esta operación.'}, status=status.HTTP_403_FORBIDDEN)
        serializer = TutorRegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)


@extend_schema(tags=['Docentes'])
class TutorDetailView(views.APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk, format=None):
        if not request.user.groups.filter(name='Coordinador').exists():
            return Response({'detail': 'No tienes permisos para realizar esta operación.'}, status=status.HTTP_403_FORBIDDEN)
        user = get_user_model().objects.get(pk=pk, groups__name='Docente')
        serializer = TutorRegisterSerializer(user)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def put(self, request, pk, format=None):
        if not request.user.groups.filter(name='Coordinador').exists():
            return Response({'detail': 'No tienes permisos para realizar esta operación.'}, status=status.HTTP_403_FORBIDDEN)
        user = get_user_model().objects.get(pk=pk, groups__name='Docente')
        serializer = TutorRegisterSerializer(user, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)

    def delete(self, request, pk, format=None):
        if not request.user.groups.filter(name='Coordinador').exists():
            return Response({'detail': 'No tienes permisos para realizar esta operación.'}, status=status.HTTP_403_FORBIDDEN)
        user = get_user_model().objects.get(pk=pk, groups__name='Docente')
        user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


""" API PARA CRUD COORDINADORES"""
@extend_schema(tags=['Coordinadores'])
class CoordinatorView(views.APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, format=None):
        if not request.user.groups.filter(name='Coordinador').exists():
            return Response({'detail': 'No tienes permisos para realizar esta operación.'}, status=status.HTTP_403_FORBIDDEN)
        users = get_user_model().objects.filter(groups__name='Coordinador', is_active=True).distinct()
        serializer = CoordinatorSerializer(users, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(request=CoordinatorSerializer)
    def post(self, request, format=None):
        if not request.user.groups.filter(name='Coordinador').exists():
            return Response(
                {'detail': 'No tienes permisos para realizar esta operación.'},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = CoordinatorSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(serializer.data, status=status.HTTP_201_CREATED)


@extend_schema(tags=['Coordinadores'])
class CoordinatorDetailView(views.APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk, format=None):
        return Response({'detail': 'No tienes permisos para realizar esta operación.'}, status=status.HTTP_403_FORBIDDEN)

    def put(self, request, pk, format=None):
        return Response({'detail': 'No tienes permisos para realizar esta operación.'}, status=status.HTTP_403_FORBIDDEN)

    def delete(self, request, pk, format=None):
        return Response({'detail': 'No tienes permisos para realizar esta operación.'}, status=status.HTTP_403_FORBIDDEN)