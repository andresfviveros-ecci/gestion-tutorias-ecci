from datetime import date, timedelta

from rest_framework.test import APITestCase

from apps.accounts.pruebas import crear_bloque, crear_catalogo, crear_tutoria, crear_usuario

URL = '/api/disponibilidad/disponibilidad/'


class PermisosDisponibilidadTests(APITestCase):
    """PR2: BE-05 y el 500 al borrar un bloque con tutorías."""

    @classmethod
    def setUpTestData(cls):
        cls.docente = crear_usuario('Docente')
        cls.estudiante = crear_usuario('Estudiante')
        _, cls.periodo, cls.materia = crear_catalogo()

    def datos_bloque(self):
        return {
            'materia': self.materia.id,
            'periodo': self.periodo.id,
            'fecha': str(date.today() + timedelta(days=3)),
            'hora_inicio': '10:00',
            'hora_fin': '11:00',
            'modalidad': 'VIRTUAL',
            'cupo_total': 3,
        }

    # BE-05
    def test_estudiante_no_crea_bloques(self):
        self.client.force_authenticate(self.estudiante)
        self.assertEqual(self.client.post(URL, self.datos_bloque(), format='json').status_code, 403)

    def test_docente_crea_bloques(self):
        self.client.force_authenticate(self.docente)
        response = self.client.post(URL, self.datos_bloque(), format='json')
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data['docente'], self.docente.id)

    def test_estudiante_lee_pero_no_borra_bloques(self):
        bloque = crear_bloque(self.docente, self.periodo, self.materia)
        self.client.force_authenticate(self.estudiante)
        self.assertEqual(self.client.get(URL).status_code, 200)
        self.assertEqual(self.client.delete(f'/api/disponibilidad/{bloque.id}/actualizar/').status_code, 403)

    def test_bloque_con_tutorias_canceladas_responde_409(self):
        bloque = crear_bloque(self.docente, self.periodo, self.materia)
        crear_tutoria(bloque, self.estudiante, estado='CANCELADA_ESTUDIANTE')
        self.client.force_authenticate(self.docente)
        response = self.client.delete(f'/api/disponibilidad/{bloque.id}/actualizar/')
        self.assertEqual(response.status_code, 409)
