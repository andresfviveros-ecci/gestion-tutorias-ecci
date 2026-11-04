from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core import mail
from django.core.cache import cache
from django.test import override_settings
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import AccessToken

from .serializers import MAX_INTENTOS_PIN, clave_pin
from .tokens import RecoveryToken

LOGIN_URL = '/api/accounts/login/'
RECOVERY_URL = '/api/accounts/recovery/'
CHANGE_URL = '/api/accounts/recovery/change-password/'
REFRESH_URL = '/api/accounts/token/refresh/'
LOGOUT_URL = '/api/accounts/logout/'
ESTUDIANTES_URL = '/api/accounts/estudiantes/'
# Clave que usa ScopedRateThrottle para el scope 'change_password' desde el cliente de pruebas.
THROTTLE_KEY = 'throttle_change_password_127.0.0.1'

CLAVE = 'Clave2026*'
NUEVA_CLAVE = 'Nueva2026*'


@override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
class SeguridadSesionTests(APITestCase):
    """PR1: BE-01, BE-02, BE-03 y BE-24."""

    @classmethod
    def setUpTestData(cls):
        coordinador = Group.objects.get_or_create(name='Coordinador')[0]
        cls.user = get_user_model().objects.create_user(
            username='coordinador',
            email='coordinador@ecci.edu.co',
            password=CLAVE,
            rol='Coordinador',
        )
        cls.user.groups.add(coordinador)

    def setUp(self):
        cache.clear()

    def pedir_recuperacion(self, email='coordinador@ecci.edu.co'):
        # El correo sale en on_commit; en la prueba hay que ejecutarlo a mano.
        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.post(RECOVERY_URL, {'email': email}, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        return response.data['token']

    def cambiar_clave(self, token, pin, password=NUEVA_CLAVE):
        return self.client.post(CHANGE_URL, {
            'token': token,
            'pin': pin,
            'password': password,
            'password_confirm': password,
        }, format='json')

    # BE-01
    def test_token_de_recuperacion_no_sirve_como_sesion(self):
        token = self.pedir_recuperacion()
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.get(ESTUDIANTES_URL)
        self.assertEqual(response.status_code, 401)

    def test_access_token_no_sirve_como_token_de_recuperacion(self):
        login = self.client.post(LOGIN_URL, {'email': self.user.email, 'password': CLAVE}, format='json')
        response = self.cambiar_clave(login.data['access'], '000000')
        self.assertEqual(response.status_code, 400)

    def test_recuperacion_completa_cambia_la_clave(self):
        token = self.pedir_recuperacion()
        self.assertEqual(len(mail.outbox), 1)
        pin = cache.get(clave_pin(RecoveryToken(token)['jti']))['pin']
        self.assertIn(pin, mail.outbox[0].body)

        response = self.cambiar_clave(token, pin)
        self.assertEqual(response.status_code, 200, response.data)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(NUEVA_CLAVE))
        # El PIN es de un solo uso.
        self.assertEqual(self.cambiar_clave(token, pin).status_code, 400)

    # BE-02
    def test_pin_se_invalida_tras_cinco_fallos(self):
        token = self.pedir_recuperacion()
        pin = cache.get(clave_pin(RecoveryToken(token)['jti']))['pin']
        incorrecto = f'{(int(pin) + 1) % 1_000_000:06d}'
        for _ in range(MAX_INTENTOS_PIN):
            cache.delete(THROTTLE_KEY)
            self.assertEqual(self.cambiar_clave(token, incorrecto).status_code, 400)
        cache.delete(THROTTLE_KEY)

        # Ni el PIN correcto funciona después del quinto fallo.
        self.assertEqual(self.cambiar_clave(token, pin).status_code, 400)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(CLAVE))

    def test_recuperacion_limitada_por_ip(self):
        for _ in range(5):
            self.pedir_recuperacion()
        response = self.client.post(RECOVERY_URL, {'email': self.user.email}, format='json')
        self.assertEqual(response.status_code, 429)

    def test_limite_no_se_salta_con_x_forwarded_for(self):
        for i in range(5):
            self.client.post(RECOVERY_URL, {'email': self.user.email}, format='json',
                             HTTP_X_FORWARDED_FOR=f'10.0.0.{i}')
        response = self.client.post(RECOVERY_URL, {'email': self.user.email}, format='json',
                                    HTTP_X_FORWARDED_FOR='10.0.0.99')
        self.assertEqual(response.status_code, 429)

    def test_recuperacion_y_cambio_tienen_limites_separados(self):
        for _ in range(5):
            token = self.pedir_recuperacion()
        # recovery/ ya llegó al límite, pero change-password/ sigue atendiendo.
        self.assertEqual(self.cambiar_clave(token, '000000').status_code, 400)

    # BE-24
    def test_recuperacion_no_revela_si_el_correo_existe(self):
        with self.captureOnCommitCallbacks(execute=True):
            existe = self.client.post(RECOVERY_URL, {'email': self.user.email}, format='json')
            no_existe = self.client.post(RECOVERY_URL, {'email': 'nadie@ecci.edu.co'}, format='json')
        self.assertEqual(existe.status_code, no_existe.status_code)
        self.assertEqual(existe.data['message'], no_existe.data['message'])
        self.assertIn('token', no_existe.data)
        # El JWT se puede decodificar: los dos deben traer los mismos claims.
        self.assertEqual(
            set(RecoveryToken(existe.data['token']).payload),
            set(RecoveryToken(no_existe.data['token']).payload)
        )
        self.assertNotIn('email', RecoveryToken(existe.data['token']).payload)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(self.cambiar_clave(no_existe.data['token'], '123456').status_code, 400)

    def test_cambiar_la_clave_cierra_las_sesiones(self):
        login = self.client.post(LOGIN_URL, {'email': self.user.email, 'password': CLAVE}, format='json')
        token = self.pedir_recuperacion()
        pin = cache.get(clave_pin(RecoveryToken(token)['jti']))['pin']
        self.assertEqual(self.cambiar_clave(token, pin).status_code, 200)

        response = self.client.post(REFRESH_URL, {'refresh': login.data['refresh']}, format='json')
        self.assertEqual(response.status_code, 401)

    # BE-03
    def test_refresh_renueva_y_rota_el_token(self):
        login = self.client.post(LOGIN_URL, {'email': self.user.email, 'password': CLAVE}, format='json')
        refresh = login.data['refresh']

        response = self.client.post(REFRESH_URL, {'refresh': refresh}, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertIn('access', response.data)
        self.assertNotEqual(response.data['refresh'], refresh)

        # El refresh anterior queda en la lista negra tras la rotación.
        reuso = self.client.post(REFRESH_URL, {'refresh': refresh}, format='json')
        self.assertEqual(reuso.status_code, 401)

    def test_logout_invalida_el_refresh(self):
        login = self.client.post(LOGIN_URL, {'email': self.user.email, 'password': CLAVE}, format='json')
        refresh = login.data['refresh']

        self.assertEqual(self.client.post(LOGOUT_URL, {'refresh': refresh}, format='json').status_code, 200)
        self.assertEqual(self.client.post(REFRESH_URL, {'refresh': refresh}, format='json').status_code, 401)

    def test_access_token_dura_60_minutos(self):
        login = self.client.post(LOGIN_URL, {'email': self.user.email, 'password': CLAVE}, format='json')
        access = AccessToken(login.data['access'])
        self.assertEqual(access['exp'] - access['iat'], 60 * 60)
