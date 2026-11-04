from datetime import timedelta

from rest_framework_simplejwt.tokens import Token


""" TOKEN DE RECUPERACIÓN DE CONTRASEÑA
Tiene su propio token_type, así que JWTAuthentication (que solo acepta
'access') no lo reconoce como sesión. """
class RecoveryToken(Token):
    token_type = 'password_recovery'
    lifetime = timedelta(minutes=5)
