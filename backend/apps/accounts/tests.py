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
# Clave que usa ScopedRateThrottle para el scope 'recovery' desde el cliente de pruebas.
THROTTLE_KEY = 'throttle_recovery_127.0.0.1'

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
        pin = cache.get(clave_pin(RecoveryToken(token)['jti']))
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
        pin = cache.get(clave_pin(RecoveryToken(token)['jti']))
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

    # BE-24
    def test_recuperacion_no_revela_si_el_correo_existe(self):
        existe = self.client.post(RECOVERY_URL, {'email': self.user.email}, format='json')
        no_existe = self.client.post(RECOVERY_URL, {'email': 'nadie@ecci.edu.co'}, format='json')
        self.assertEqual(existe.status_code, no_existe.status_code)
        self.assertEqual(existe.data['message'], no_existe.data['message'])
        self.assertIn('token', no_existe.data)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(self.cambiar_clave(no_existe.data['token'], '123456').status_code, 400)

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


@override_settings(EMAIL_DOMAINS=['ecci.edu.co'])
class UsuariosTests(APITestCase):
    """PR4: BE-16, BE-17, BE-23 y lo que el frontend necesita de usuarios."""

    @classmethod
    def setUpTestData(cls):
        cls.coordinador = crear_usuario('Coordinador')

    def setUp(self):
        self.client.force_authenticate(self.coordinador)

    def datos(self, **cambios):
        datos = {
            'username': 'jperez',
            'email': 'jperez@ecci.edu.co',
            'password': CLAVE,
            'first_name': 'Juan',
            'last_name': 'Pérez',
            'documento': '1010101010',
            'telefono': '3001112233',
            'codigo_institucional': '',
        }
        datos.update(cambios)
        return datos

    def crear(self, **cambios):
        return self.client.post(ESTUDIANTES_URL, self.datos(**cambios), format='json')

    def test_crea_estudiante_con_rol_y_grupo(self):
        response = self.crear()
        self.assertEqual(response.status_code, 201, response.data)
        user = get_user_model().objects.get(pk=response.data['id'])
        self.assertEqual(user.rol, 'Estudiante')
        self.assertTrue(user.groups.filter(name='Estudiante').exists())
        self.assertTrue(user.check_password(CLAVE))

    # BE-16
    def test_correo_unico_sin_distinguir_mayusculas(self):
        self.crear()
        response = self.crear(username='otro', documento='2020', email='JPEREZ@ecci.edu.co')
        self.assertEqual(response.status_code, 400)
        self.assertIn('email', response.data['errors'])

    def test_correo_de_dominio_no_permitido(self):
        response = self.crear(email='jperez@gmail.com')
        self.assertEqual(response.status_code, 400)
        self.assertIn('email', response.data['errors'])

    # BE-17
    def test_contrasena_obligatoria_al_crear(self):
        datos = self.datos()
        del datos['password']
        response = self.client.post(ESTUDIANTES_URL, datos, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertIn('password', response.data['errors'])

    def test_contrasena_debil(self):
        response = self.crear(password='abcdefgh')
        self.assertEqual(response.status_code, 400)
        self.assertEqual(len(response.data['errors']['password']), 2)

    def test_editar_sin_contrasena_la_conserva(self):
        user_id = self.crear().data['id']
        response = self.client.patch(f'{ESTUDIANTES_URL}{user_id}/', {'telefono': '3110000000'}, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertTrue(get_user_model().objects.get(pk=user_id).check_password(CLAVE))

    # 4.1: is_active y PATCH parcial
    def test_desactivar_con_patch(self):
        user_id = self.crear().data['id']
        response = self.client.patch(f'{ESTUDIANTES_URL}{user_id}/', {'is_active': False}, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.data['is_active'])
        self.assertFalse(get_user_model().objects.get(pk=user_id).is_active)

    # 4.1: codigo_institucional vacío como nulo
    def test_varios_estudiantes_sin_codigo(self):
        self.assertEqual(self.crear().status_code, 201)
        response = self.crear(username='otro', email='otro@ecci.edu.co', documento='2020')
        self.assertEqual(response.status_code, 201, response.data)
        self.assertIsNone(response.data['codigo_institucional'])

    # BE-23
    def test_login_de_usuario_inactivo_explica_el_motivo(self):
        user = crear_usuario('Estudiante')
        user.is_active = False
        user.save()
        self.client.force_authenticate(None)
        response = self.client.post(LOGIN_URL, {'email': user.email, 'password': CLAVE}, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertIn('inactivo', str(response.data))

        response = self.client.post(LOGIN_URL, {'email': user.email, 'password': 'Otra2026*'}, format='json')
        self.assertIn('Credenciales', str(response.data))

    def test_login_sin_distinguir_mayusculas(self):
        self.client.force_authenticate(None)
        response = self.client.post(
            LOGIN_URL, {'email': self.coordinador.email.upper(), 'password': CLAVE}, format='json'
        )
        self.assertEqual(response.status_code, 200)


class ContratoApiTests(APITestCase):
    """PR5: /me/ y formato único de error (BE-28)."""

    @classmethod
    def setUpTestData(cls):
        cls.docente = crear_usuario('Docente')

    def test_me(self):
        self.client.force_authenticate(self.docente)
        response = self.client.get('/api/accounts/me/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['id'], self.docente.id)
        self.assertEqual(response.data['email'], self.docente.email)
        self.assertEqual(response.data['grupos'], ['Docente'])

    def test_formato_de_error(self):
        sin_sesion = self.client.get('/api/accounts/me/')
        self.assertEqual(sin_sesion.status_code, 401)
        self.assertEqual(set(sin_sesion.data), {'detail', 'code', 'errors'})
        self.assertEqual(sin_sesion.data['code'], 'not_authenticated')

        self.client.force_authenticate(self.docente)
        prohibido = self.client.get(ESTUDIANTES_URL)
        self.assertEqual((prohibido.status_code, prohibido.data['code']), (403, 'permission_denied'))

        no_existe = self.client.get('/api/tutorias/tutorias/999999/')
        self.assertEqual((no_existe.status_code, no_existe.data['code']), (404, 'not_found'))

        invalido = self.client.post(LOGIN_URL, {'email': 'no-es-correo'}, format='json')
        self.assertEqual(invalido.status_code, 400)
        self.assertEqual(set(invalido.data['errors']), {'email', 'password'})
        self.assertTrue(invalido.data['detail'])
