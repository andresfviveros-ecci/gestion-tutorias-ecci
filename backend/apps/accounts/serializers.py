from django.contrib.auth import authenticate
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
import secrets
from django.contrib.auth.models import Group
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken
import re
from django.core.cache import cache
from .tokens import RecoveryToken

# Intentos fallidos de PIN antes de invalidar la recuperación (BE-02).
MAX_INTENTOS_PIN = 5


def clave_pin(jti):
    return f'password_recovery_{jti}'


def clave_intentos(jti):
    return f'password_recovery_intentos_{jti}'


def cerrar_sesiones(user):
    """Pone en la lista negra los refresh del usuario: tras cambiar la clave
    un refresh robado deja de servir."""
    for token in OutstandingToken.objects.filter(user=user):
        BlacklistedToken.objects.get_or_create(token=token)


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
            # RecoveryToken valida firma, expiración y token_type.
            token = RecoveryToken(attrs['token'])
            jti = token['jti']
            # El usuario va en la caché junto al PIN, no en el token (BE-24).
            guardado = cache.get(clave_pin(jti))
            if not guardado or not secrets.compare_digest(guardado['pin'].encode(), attrs['pin'].encode()):
                if guardado:
                    self._registrar_intento_fallido(jti)
                raise serializers.ValidationError(
                    'Código de recuperación incorrecto o expirado.'
                )
            user = get_user_model().objects.get(
                id=guardado['user_id'],
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
        attrs['jti'] = jti
        return attrs

    def _registrar_intento_fallido(self, jti):
        clave = clave_intentos(jti)
        cache.add(clave, 0, timeout=RecoveryToken.lifetime.total_seconds())
        if cache.incr(clave) >= MAX_INTENTOS_PIN:
            cache.delete_many([clave_pin(jti), clave])

    def save(self, **kwargs):
        user = self.validated_data['user']
        jti = self.validated_data['jti']
        user.set_password(self.validated_data['password'])
        user.save()
        cache.delete_many([clave_pin(jti), clave_intentos(jti)])
        cerrar_sesiones(user)
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
        # La respuesta es la misma exista o no el correo (BE-24): siempre se
        # entrega un token, pero solo se guarda PIN si el usuario existe. El
        # token lleva los mismos claims en los dos casos: el usuario queda en
        # la caché, con el jti como llave, y no en el JWT, que se puede leer.
        user = get_user_model().objects.filter(
            email__iexact=attrs['email'],
            is_active=True
        ).first()

        token = RecoveryToken()
        pin = None
        if user:
            pin = f'{secrets.randbelow(1_000_000):06d}'
            cache.set(
                clave_pin(token['jti']),
                {'pin': pin, 'user_id': user.id},
                timeout=RecoveryToken.lifetime.total_seconds()
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
            'id',
            'username',
            'email',
            'password',
            'first_name',
            'last_name',
            'documento',
            'telefono',
            'codigo_institucional',
        ]
        read_only_fields = ['id']
        extra_kwargs = {
            'username': {'required': True, 'allow_blank': False},
            'email': {'required': True},
            'password': {'required': False, 'write_only': True, 'allow_blank': False},
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
            'id',
            'username',
            'email',
            'password',
            'first_name',
            'last_name',
            'documento',
            'telefono',
        ]
        read_only_fields = ['id']
        extra_kwargs = {
            'username': {'required': True, 'allow_blank': False},
            'email': {'required': True},
            'password': {'required': False, 'write_only': True, 'allow_blank': False},
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
            'id',
            'username',
            'email',
            'password',
            'first_name',
            'last_name',
            'documento',
            'telefono',
        ]
        read_only_fields = ['id']
        extra_kwargs = {
            'username': {'required': True, 'allow_blank': False},
            'email': {'required': True},
            'password': {'required': False, 'write_only': True, 'allow_blank': False},
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