from rest_framework.test import APITestCase

from apps.accounts.pruebas import crear_usuario

from .models import Notificacion
from .services import notificar

URL = '/api/notificaciones/'


class NotificacionesTests(APITestCase):
    """Campana y lista de notificaciones: cada usuario solo ve y toca las suyas."""

    @classmethod
    def setUpTestData(cls):
        cls.usuario = crear_usuario('Estudiante')
        cls.otro = crear_usuario('Docente')
        cls.vieja = notificar(cls.usuario, 'NUEVA_RESERVA', 'Primera', 'La más vieja.')
        cls.leida = notificar(cls.usuario, 'CANCELACION', 'Leída', 'Ya la vio.')
        Notificacion.objects.filter(pk=cls.leida.pk).update(leida=True)
        cls.nueva = notificar(cls.usuario, 'RESERVA_CONFIRMADA', 'Tutoría confirmada', 'La más reciente.')
        cls.ajena = notificar(cls.otro, 'SOLICITUD_TUTOR', 'De otro', 'No es del usuario.')

    def setUp(self):
        self.client.force_authenticate(self.usuario)

    def test_lista_solo_las_propias_de_la_mas_reciente_a_la_mas_vieja(self):
        response = self.client.get(URL)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['count'], 3)
        self.assertEqual([n['id'] for n in response.data['results']], [self.nueva.id, self.leida.id, self.vieja.id])
        self.assertEqual(
            set(response.data['results'][0]), {'id', 'tipo', 'titulo', 'mensaje', 'tutoria', 'leida', 'fecha'}
        )

    def test_paginada_de_a_20(self):
        for i in range(25):
            notificar(self.usuario, 'RECORDATORIO', f'Aviso {i}', 'Relleno.')
        response = self.client.get(URL)
        self.assertEqual((response.data['count'], len(response.data['results'])), (28, 20))
        self.assertEqual(len(self.client.get(URL, {'page': 2}).data['results']), 8)

    def test_filtro_por_leida(self):
        no_leidas = self.client.get(URL, {'leida': 'false'}).data['results']
        self.assertEqual([n['id'] for n in no_leidas], [self.nueva.id, self.vieja.id])
        leidas = self.client.get(URL, {'leida': 'true'}).data['results']
        self.assertEqual([n['id'] for n in leidas], [self.leida.id])

    def test_resumen(self):
        response = self.client.get(f'{URL}resumen/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, {'no_leidas': 2})

    def test_marcar_una(self):
        response = self.client.patch(f'{URL}{self.nueva.id}/', {'leida': True}, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual((response.data['id'], response.data['leida']), (self.nueva.id, True))
        self.assertEqual(self.client.get(f'{URL}resumen/').data, {'no_leidas': 1})

    def test_solo_acepta_marcar_como_leida(self):
        response = self.client.patch(f'{URL}{self.leida.id}/', {'leida': False}, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertIn('leida', response.data['errors'])
        # Los demás campos son de solo lectura.
        response = self.client.patch(f'{URL}{self.nueva.id}/', {'leida': True, 'titulo': 'Otro'}, format='json')
        self.assertEqual(response.data['titulo'], 'Tutoría confirmada')
        self.assertEqual(self.client.put(f'{URL}{self.nueva.id}/', {'leida': True}, format='json').status_code, 405)

    def test_marcar_todas(self):
        response = self.client.post(f'{URL}marcar-todas/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, {'actualizadas': 2})
        self.assertEqual(self.client.get(f'{URL}resumen/').data, {'no_leidas': 0})
        # La del otro usuario no se toca.
        self.ajena.refresh_from_db()
        self.assertFalse(self.ajena.leida)

    def test_la_de_otro_usuario_responde_404(self):
        self.assertNotIn(self.ajena.id, [n['id'] for n in self.client.get(URL).data['results']])
        self.assertEqual(self.client.patch(f'{URL}{self.ajena.id}/', {'leida': True}, format='json').status_code, 404)
        self.ajena.refresh_from_db()
        self.assertFalse(self.ajena.leida)

    def test_requiere_sesion(self):
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get(URL).status_code, 401)
        self.assertEqual(self.client.get(f'{URL}resumen/').status_code, 401)
