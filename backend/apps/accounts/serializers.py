from django.conf import settings
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
import secrets
from django.contrib.auth.models import Group
from rest_framework_simplejwt.exceptions import TokenError
import re
from django.core.cache import cache
from .tokens import RecoveryToken

# Intentos fallidos de PIN antes de invalidar la recuperación (BE-02).
MAX_INTENTOS_PIN = 5


def validar_clave(password):
    """Regla de fortaleza única para crear, editar y recuperar (BE-17)."""
    errores = []
    if len(password) < 8:
        errores.append('La contraseña debe tener mínimo 8 caracteres.')
    if not re.search(r'\d', password):
        errores.append('La contraseña debe contener un número.')
    if not re.search(r'[!@#$%^&*(),.?":{}|<>_/\-]', password):
        errores.append('La contraseña debe contener un carácter especial.')
    if errores:
        raise serializers.ValidationError(errores)


def correo_permitido(email):
    dominio = email.rsplit('@', 1)[-1].lower()
    return dominio in settings.EMAIL_DOMAINS


def mensaje_dominios():
    dominios = ', '.join(f'@{d}' for d in settings.EMAIL_DOMAINS)
    return f'Debe ingresar un correo institucional ({dominios}).'


def clave_pin(jti):
    return f'password_recovery_{jti}'


def clave_intentos(jti):
    return f'password_recovery_intentos_{jti}'


""" SERIALIZERS PARA VALIDAR INICIO DE SESION"""
class LoginSerializers(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    def validate(self, attrs):
        email = attrs.get('email')
        password = attrs.get('password')
        user = get_user_model().objects.filter(
            email__iexact=email
        ).first()
        # BE-23: authenticate() descarta a los inactivos y el mensaje nunca
        # llegaba. Se revisa la clave primero para no revelar cuentas.
        if not user or not user.check_password(password):
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
            pin_guardado = cache.get(clave_pin(jti))
            if not pin_guardado or not secrets.compare_digest(pin_guardado.encode(), attrs['pin'].encode()):
                if pin_guardado:
                    self._registrar_intento_fallido(jti)
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
        try:
            validar_clave(password)
        except serializers.ValidationError as error:
            raise serializers.ValidationError({'password': error.detail})
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
        return user
    
""" SERIALIZER PARA RECUPERAR CONTRASEÑA """
class RecoveryTokenSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        if not correo_permitido(value):
            raise serializers.ValidationError(mensaje_dominios())
        return value.lower()

    def validate(self, attrs):
        # La respuesta es la misma exista o no el correo (BE-24): siempre se
        # entrega un token, pero solo se guarda PIN si el usuario existe.
        user = get_user_model().objects.filter(
            email__iexact=attrs['email'],
            is_active=True
        ).first()

        token = RecoveryToken()
        pin = None
        if user:
            pin = f'{secrets.randbelow(1_000_000):06d}'
            token['user_id'] = user.id
            token['email'] = user.email
            cache.set(
                clave_pin(token['jti']),
                pin,
                timeout=RecoveryToken.lifetime.total_seconds()
            )

        attrs['user'] = user
        attrs['pin'] = pin
        attrs['token'] = str(token)

        return attrs


""" SERIALIZER DE USUARIOS
Uno solo para los tres grupos: cada subclase define el grupo y sus campos.
El rol se llena desde el grupo y nadie lo escribe a mano. """
class UsuarioSerializer(serializers.ModelSerializer):
    grupo = None

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
            'is_active',
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
            'is_active': {'required': False},
        }

    def validate_email(self, value):
        value = value.strip().lower()
        if not correo_permitido(value):
            raise serializers.ValidationError(mensaje_dominios())
        # BE-16: único sin distinguir mayúsculas.
        repetidos = get_user_model().objects.filter(email__iexact=value)
        if self.instance is not None:
            repetidos = repetidos.exclude(pk=self.instance.pk)
        if repetidos.exists():
            raise serializers.ValidationError('Ya existe un usuario con este correo.')
        return value

    def validate_password(self, value):
        validar_clave(value)
        return value

    def validate(self, attrs):
        # BE-17: la contraseña es obligatoria al crear.
        if self.instance is None and not attrs.get('password'):
            raise serializers.ValidationError({'password': 'La contraseña es obligatoria.'})
        return attrs

    def create(self, validated_data):
        User = get_user_model()
        user = User.objects.create_user(
            rol=self.grupo,
            **validated_data
        )
        user.groups.add(Group.objects.get_or_create(name=self.grupo)[0])
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance


""" SERIALIZERS PARA REGISTRAR ESTUDIANTE """
class StudentRegisterSerializer(UsuarioSerializer):
    grupo = 'Estudiante'

    class Meta(UsuarioSerializer.Meta):
        fields = UsuarioSerializer.Meta.fields + ['codigo_institucional']

    def validate_codigo_institucional(self, value):
        # Vacío se guarda como nulo: la columna es única y admite varios nulos.
        return (value or '').strip() or None


""" SERIALIZERS PARA REGISTRAR TUTORES/DOCENTE"""
class TutorRegisterSerializer(UsuarioSerializer):
    grupo = 'Docente'


"""" SERIALIZERS PARA REGISTRAR COORDINADORES"""
class CoordinatorSerializer(UsuarioSerializer):
    grupo = 'Coordinador'
