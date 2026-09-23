from rest_framework import status, views
from rest_framework.response import Response
from rest_framework import status, views
from django.conf import settings
from .serializers import *
from django.core.mail import send_mail
""" API PARA INICIAR SESION"""
class LoginView(views.APIView):
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
class RecoveryTokenView(views.APIView):

    def post(self, request, format=None):
        serializer = RecoveryTokenSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = serializer.validated_data['user']
        pin = serializer.validated_data['pin']

        send_mail(
            'Recuperación de contraseña',
            f'Tu código de recuperación es: {pin}',
            settings.EMAIL_HOST_USER,
            [user.email],
            fail_silently=False,
        )

        return Response(
            {'message': 'Se ha enviado el código de recuperación al correo.'},
            status=status.HTTP_200_OK
        )

""" API PARA CRUD ESTUDIANTE"""
class StudentView(views.APIView):
    def get(self, request, pk=None, format=None):
        if pk:
            user = get_user_model().objects.get(
                pk=pk,
                groups__name='Estudiante'
            )
            serializer = StudentRegisterSerializer(user)
        else:
            users = get_user_model().objects.filter(
                groups__name='Estudiante'
            )
            serializer = StudentRegisterSerializer(users, many=True)
        return Response(
            serializer.data,
            status=status.HTTP_200_OK
        )
    def post(self, request, format=None):
        serializer = StudentRegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED
        )
    def put(self, request, pk, format=None):
        user = get_user_model().objects.get(
            pk=pk,
            groups__name='Estudiante'
        )
        serializer = StudentRegisterSerializer(
            user,
            data=request.data
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(
            serializer.data,
            status=status.HTTP_200_OK
        )
    def delete(self, request, pk, format=None):
        user = get_user_model().objects.get(
            pk=pk,
            groups__name='Estudiante'
        )
        user.delete()
        return Response(
            status=status.HTTP_204_NO_CONTENT
        )

""" API PARA REGISTRAR TUTORES/DOCENTE """
class TutorView(views.APIView):
    def get(self, request, pk=None, format=None):
        if pk:
            user = get_user_model().objects.get(
                pk=pk,
                groups__name='Docente'
            )
            serializer = TutorRegisterSerializer(user)
        else:
            users = get_user_model().objects.filter(
                groups__name='Docente'
            )
            serializer = TutorRegisterSerializer(users, many=True)
        return Response(
            serializer.data,
            status=status.HTTP_200_OK
        )
    def post(self, request, format=None):
        serializer = TutorRegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED
        )
    def put(self, request, pk, format=None):
        user = get_user_model().objects.get(
            pk=pk,
            groups__name='Docente'
        )
        serializer = TutorRegisterSerializer(
            user,
            data=request.data
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(
            serializer.data,
            status=status.HTTP_200_OK
        )
    def delete(self, request, pk, format=None):
        user = get_user_model().objects.get(
            pk=pk,
            groups__name='Docente'
        )
        user.delete()
        return Response(
            status=status.HTTP_204_NO_CONTENT
        )

""" API PARA CRUD COORDINADORES"""
class CoordinatorView(views.APIView):
    def get(self, request, pk=None, format=None):
        if pk:
            user = get_user_model().objects.get(
                pk=pk,
                groups__name='Coordinador'
            )
            serializer = CoordinatorSerializer(user)
        else:
            users = get_user_model().objects.filter(
                groups__name='Coordinador'
            )
            serializer = CoordinatorSerializer(users, many=True)
        return Response(
            serializer.data,
            status=status.HTTP_200_OK
        )
    def post(self, request, format=None):
        serializer = CoordinatorSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED
        )
    def put(self, request, pk, format=None):
        user = get_user_model().objects.get(
            pk=pk,
            groups__name='Coordinador'
        )
        serializer = CoordinatorSerializer(
            user,
            data=request.data
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(
            serializer.data,
            status=status.HTTP_200_OK
        )
    def delete(self, request, pk, format=None):
        user = get_user_model().objects.get(
            pk=pk,
            groups__name='Coordinador'
        )
        user.delete()
        return Response(
            status=status.HTTP_204_NO_CONTENT
        )