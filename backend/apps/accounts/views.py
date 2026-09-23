from rest_framework import status, views
from rest_framework.response import Response
from rest_framework import status, views
from django.conf import settings
from .serializers import LoginSerializers, RecoveryTokenSerializer
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