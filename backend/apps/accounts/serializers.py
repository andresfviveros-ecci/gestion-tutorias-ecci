from django.contrib.auth import authenticate
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from rest_framework import serializers
from rest_framework_simplejwt.tokens import AccessToken
import random
from datetime import timedelta
from django.contrib.auth.models import Group
from rest_framework_simplejwt.exceptions import TokenError
import re
from django.core.cache import cache


""" SERIALIZERS PARA VALIDAR INICIO DE SESION"""
class LoginSerializers(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    def validate(self, attrs):
        email = attrs.get('email')
        password = attrs.get('password')
        user = get_user_model().objects.filter(
            email=email
        ).first()
        if not user:
            raise serializers.ValidationError(
                'Credenciales invalidas.'
            )
        user = authenticate(
            username=user.username,
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
    
""" SERIALIZER PARA CAMBIAR CONTRASEÑA """
class ChangePasswordSerializer(serializers.Serializer):
    token = serializers.CharField()
    pin = serializers.CharField(min_length=6, max_length=6)
    password = serializers.CharField(
        write_only=True,
        allow_blank=False
    )
    password_confirm = serializers.CharField(
        write_only=True,
        allow_blank=False
    )
    def validate(self, attrs):
        try:
            token = AccessToken(attrs['token'])
            if token.get('type') != 'password_recovery':
                raise serializers.ValidationError(
                    'Token de recuperación inválido.'
                )
            pin_guardado = cache.get(
                f'password_recovery_{token["jti"]}'
            )
            if not pin_guardado or pin_guardado != attrs['pin']:
                raise serializers.ValidationError(
                    'Código de recuperación incorrecto o expirado.'
                )
            User = get_user_model()
            user = User.objects.get(
                id=token['user_id'],
                email__iexact=token['email'],
                is_active=True
            )
        except (TokenError, get_user_model().DoesNotExist, KeyError):
            raise serializers.ValidationError(
                'El código de recuperación es inválido o ha expirado.'
            )
        password = attrs['password']
        if password != attrs['password_confirm']:
            raise serializers.ValidationError({
                'password_confirm': 'Las contraseñas no coinciden.'
            })
        if len(password) < 8:
            raise serializers.ValidationError({
                'password': 'La contraseña debe tener mínimo 8 caracteres.'
            })
        if not re.search(r'\d', password):
            raise serializers.ValidationError({
                'password': 'La contraseña debe contener un número.'
            })
        if not re.search(r'[!@#$%^&*(),.?":{}|<>_/\-]', password):
            raise serializers.ValidationError({
                'password': 'La contraseña debe contener un carácter especial.'
            })
        attrs['user'] = user
        return attrs

    def save(self, **kwargs):
        user = self.validated_data['user']
        token = AccessToken(self.validated_data['token'])
        user.set_password(self.validated_data['password'])
        user.save()
        cache.delete(
            f'password_recovery_{token["jti"]}'
        )
        return user
    
""" SERIALIZER PARA RECUPERAR CONTRASEÑA """
class RecoveryTokenSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        if not value.lower().endswith('@ecci.edu.co'):
            raise serializers.ValidationError(
                'Debe ingresar un correo institucional @ecci.edu.co.'
            )
        return value.lower()

    def validate(self, attrs):
        User = get_user_model()

        try:
            user = User.objects.get(
                email__iexact=attrs['email'],
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
        token['type'] = 'password_recovery'
        token.set_exp(lifetime=timedelta(minutes=5))

        cache.set(
            f'password_recovery_{token["jti"]}',
            pin,
            timeout=300
        )

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
            'first_name',
            'last_name',
            'documento',
            'telefono',
            'codigo_institucional',
        ]
        extra_kwargs = {
            'username': {'required': True, 'allow_blank': False},
            'email': {'required': True},
            'password': {'required': True, 'write_only': True, 'allow_blank': False},
            'first_name': {'required': True, 'allow_blank': False},
            'last_name': {'required': True, 'allow_blank': False},
            'documento': {'required': True, 'allow_blank': False},
            'telefono': {'required': True, 'allow_blank': False},
        }

    def create(self, validated_data):
        User = get_user_model()
        user = User.objects.create_user(
            rol='Estudiante',
            **validated_data
        )
        estudiante = Group.objects.get(name='Estudiante')
        user.groups.add(estudiante)
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance

""" SERIALIZERS PARA REGISTRAR TUTORES/DOCENTE"""
class TutorRegisterSerializer(serializers.ModelSerializer):
    class Meta:
        model = get_user_model()
        fields = [
            'username',
            'email',
            'password',
            'first_name',
            'last_name',
            'documento',
            'telefono',
        ]
        extra_kwargs = {
            'username': {'required': True, 'allow_blank': False},
            'email': {'required': True},
            'password': {'required': True, 'write_only': True, 'allow_blank': False},
            'first_name': {'required': True, 'allow_blank': False},
            'last_name': {'required': True, 'allow_blank': False},
            'documento': {'required': True, 'allow_blank': False},
            'telefono': {'required': True, 'allow_blank': False},
        }

    def create(self, validated_data):
        User = get_user_model()
        user = User.objects.create_user(
            rol='Docente',
            **validated_data
        )
        tutor = Group.objects.get(name='Docente')
        user.groups.add(tutor)
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance

"""" SERIALIZERS PARA REGISTRAR COORDINADORES"""
class CoordinatorSerializer(serializers.ModelSerializer):
    class Meta:
        model = get_user_model()
        fields = [
            'username',
            'email',
            'password',
            'first_name',
            'last_name',
            'documento',
            'telefono',
        ]
        extra_kwargs = {
            'username': {'required': True, 'allow_blank': False},
            'email': {'required': True},
            'password': {'required': True, 'write_only': True, 'allow_blank': False},
            'first_name': {'required': True, 'allow_blank': False},
            'last_name': {'required': True, 'allow_blank': False},
            'documento': {'required': True, 'allow_blank': False},
            'telefono': {'required': True, 'allow_blank': False},
        }

    def create(self, validated_data):
        User = get_user_model()
        user = User.objects.create_user(
            rol='Coordinador',
            **validated_data
        )
        coordinador = Group.objects.get(name='Coordinador')
        user.groups.add(coordinador)
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance