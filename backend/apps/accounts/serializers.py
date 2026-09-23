from django.contrib.auth import authenticate
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from rest_framework import serializers
from rest_framework_simplejwt.tokens import AccessToken
import random
from datetime import timedelta
from django.contrib.auth.models import Group
""" SERIALIZERS PARA VALIDAR INICIO DE SESION"""
class LoginSerializers(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        username = attrs.get('username')
        password = attrs.get('password')

        user = authenticate(
            username=username,
            password=password
        )

        if not user:
            raise serializers.ValidationError(
                'Credenciales invalidas.'
            )
        if not user.is_active:
            raise serializers.ValidationError(
                'El usuario esta inactivo.'
            )

        refresh = RefreshToken.for_user(user)

        attrs['user'] = user
        attrs['refresh'] = str(refresh)
        attrs['access'] = str(refresh.access_token)

        return attrs
    
""" SERIALIZER PARA RECUPERAR CONTRASEÑA"""
class RecoveryTokenSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate(self, attrs):
        User = get_user_model()

        try:
            user = User.objects.get(
                email=attrs['email'],
                is_active=True
            )
        except User.DoesNotExist:
            raise serializers.ValidationError(
                'No existe un usuario activo con este correo.'
            )

        pin = f'{random.randint(0, 999999):06d}'

        token = AccessToken()
        token['user_id'] = user.id
        token['email'] = user.email
        token['pin'] = pin
        token['type'] = 'password_recovery'
        token.set_exp(lifetime=timedelta(minutes=5))

        attrs['user'] = user
        attrs['pin'] = pin
        attrs['token'] = str(token)

        return attrs

""" SERIALIZERS PARA REGISTRAR ESTUDIANTE """
class StudentRegisterSerializer(serializers.ModelSerializer):
    class Meta:
        model = get_user_model()
        fields = [
            'username',
            'email',
            'password',
            'nombres',
            'apellidos',
            'documento',
            'telefono',
            'codigo_institucional',           
        ]
        extra_kwargs = {
            'password': {'write_only': True},
        }
    def create(self, validated_data):
        User = get_user_model()
        user = User.objects.create_user(
            **validated_data
        )
        estudiante = Group.objects.get(name='Estudiante')
        user.groups.add(estudiante)
        return user
    