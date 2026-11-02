from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core import mail
from django.core.cache import cache
from django.test import override_settings
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import AccessToken

from .pruebas import crear_bloque, crear_catalogo, crear_tutoria, crear_usuario
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


class PermisosUsuariosTests(APITestCase):
    """PR2: BE-13, BE-14 y BE-15 en el CRUD de usuarios."""

    @classmethod
    def setUpTestData(cls):
        cls.coordinador = crear_usuario('Coordinador')
        cls.docente = crear_usuario('Docente')
        cls.estudiante = crear_usuario('Estudiante')
        _, cls.periodo, cls.materia = crear_catalogo()

    def setUp(self):
        self.client.force_authenticate(self.coordinador)

    def test_sin_sesion_responde_401(self):
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get(ESTUDIANTES_URL).status_code, 401)

    def test_estudiante_no_lista_estudiantes(self):
        self.client.force_authenticate(self.estudiante)
        self.assertEqual(self.client.get(ESTUDIANTES_URL).status_code, 403)

    def test_listado_de_docentes_para_coordinador_y_estudiante(self):
        self.assertEqual(self.client.get('/api/accounts/tutores/').status_code, 200)
        self.client.force_authenticate(self.estudiante)
        self.assertEqual(self.client.get('/api/accounts/tutores/').status_code, 200)
        self.client.force_authenticate(self.docente)
        self.assertEqual(self.client.get('/api/accounts/tutores/').status_code, 403)

    # BE-13
    def test_detalle_inexistente_responde_404(self):
        for recurso in ('estudiantes', 'tutores', 'coordinadores'):
            with self.subTest(recurso=recurso):
                self.assertEqual(self.client.get(f'/api/accounts/{recurso}/999999/').status_code, 404)

    def test_detalle_de_otro_grupo_responde_404(self):
        response = self.client.get(f'/api/accounts/tutores/{self.estudiante.id}/')
        self.assertEqual(response.status_code, 404)

    # BE-14
    def test_estudiante_con_tutorias_se_desactiva(self):
        crear_tutoria(crear_bloque(self.docente, self.periodo, self.materia), self.estudiante)
        response = self.client.delete(f'{ESTUDIANTES_URL}{self.estudiante.id}/')
        self.assertEqual(response.status_code, 200)
        self.estudiante.refresh_from_db()
        self.assertFalse(self.estudiante.is_active)

    def test_docente_con_bloques_se_desactiva(self):
        crear_bloque(self.docente, self.periodo, self.materia)
        response = self.client.delete(f'/api/accounts/tutores/{self.docente.id}/')
        self.assertEqual(response.status_code, 200)
        self.docente.refresh_from_db()
        self.assertFalse(self.docente.is_active)

    def test_usuario_sin_historial_se_elimina(self):
        nuevo = crear_usuario('Estudiante')
        response = self.client.delete(f'{ESTUDIANTES_URL}{nuevo.id}/')
        self.assertEqual(response.status_code, 204)
        self.assertFalse(get_user_model().objects.filter(pk=nuevo.pk).exists())

    # BE-15
    def test_crud_de_coordinadores(self):
        otro = crear_usuario('Coordinador')
        url = f'/api/accounts/coordinadores/{otro.id}/'
        self.assertEqual(self.client.get(url).data['email'], otro.email)

        datos = {
            'username': otro.username, 'email': otro.email, 'first_name': 'Laura',
            'last_name': 'Gómez', 'documento': otro.documento, 'telefono': '3001234567',
        }
        response = self.client.put(url, datos, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['first_name'], 'Laura')

        self.assertEqual(self.client.delete(url).status_code, 204)

    def test_estudiante_no_gestiona_coordinadores(self):
        self.client.force_authenticate(self.estudiante)
        response = self.client.get(f'/api/accounts/coordinadores/{self.coordinador.id}/')
        self.assertEqual(response.status_code, 403)
