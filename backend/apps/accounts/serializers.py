import re
import secrets

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core.cache import cache
from rest_framework import serializers
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.token_blacklist.models import (
    BlacklistedToken,
    OutstandingToken,
)
from rest_framework_simplejwt.tokens import RefreshToken

from .tokens import RecoveryToken

# Intentos fallidos de PIN antes de invalidar la recuperación (BE-02), y
# cuánto dura el bloqueo de la cuenta después del último fallo.
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
    # Por token y no por usuario: si no, cualquiera que conozca un correo le
    # bloquea la recuperación a esa persona fallando el PIN a propósito.
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
            email__iexact=email
        ).first()
        # BE-23: authenticate() descarta a los inactivos y el mensaje nunca
        # llegaba. Se revisa la clave primero para no revelar cuentas.
        if not user:
            # Se calcula un hash igual, para que el tiempo de respuesta no
            # delate qué correos tienen cuenta.
            get_user_model()().set_password(password)
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
        try:
            validar_clave(password)
        except serializers.ValidationError as error:
            raise serializers.ValidationError({'password': error.detail})
        attrs['user'] = user
        attrs['jti'] = jti
        return attrs

    def _registrar_intento_fallido(self, jti):
        clave = clave_intentos(jti)
        intentos = cache.get(clave, 0) + 1
        if intentos >= MAX_INTENTOS_PIN:
            cache.delete_many([clave_pin(jti), clave])
        else:
            # cache.set y no cache.incr: incr vuelve al TTL por defecto (300 s).
            cache.set(clave, intentos, timeout=RecoveryToken.lifetime.total_seconds())

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
        if not correo_permitido(value):
            raise serializers.ValidationError(mensaje_dominios())
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


""" SERIALIZER DEL USUARIO EN SESION
El frontend lo usa para conocer su id, su nombre y sus grupos. """
class MeSerializer(serializers.ModelSerializer):
    nombre = serializers.CharField(source='get_full_name', read_only=True)
    grupos = serializers.SerializerMethodField()

    class Meta:
        model = get_user_model()
        fields = [
            'id',
            'username',
            'email',
            'first_name',
            'last_name',
            'nombre',
            'rol',
            'semestre',
            'grupos',
        ]
        read_only_fields = fields

    def get_grupos(self, user) -> list[str]:
        return list(user.groups.values_list('name', flat=True))


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

    def validate_is_active(self, value):
        request = self.context.get('request')
        if not value and request and self.instance is not None and self.instance.pk == request.user.pk:
            raise serializers.ValidationError('No puedes desactivar tu propia cuenta.')
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
        fields = UsuarioSerializer.Meta.fields + ['codigo_institucional', 'semestre']

    def validate_codigo_institucional(self, value):
        # Vacío se guarda como nulo: la columna es única y admite varios nulos.
        return (value or '').strip() or None


""" SERIALIZERS PARA REGISTRAR TUTORES/DOCENTE"""
class TutorRegisterSerializer(UsuarioSerializer):
    grupo = 'Docente'


"""" SERIALIZERS PARA REGISTRAR COORDINADORES"""
class CoordinatorSerializer(UsuarioSerializer):
    grupo = 'Coordinador'
