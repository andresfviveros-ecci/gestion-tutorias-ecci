from rest_framework.test import APITestCase

from apps.accounts.pruebas import crear_bloque, crear_catalogo, crear_usuario

URL = '/api/tutorias/tutorias/'


class PermisosTutoriasTests(APITestCase):
    """PR2: BE-18, solo los estudiantes reservan."""

    @classmethod
    def setUpTestData(cls):
        cls.docente = crear_usuario('Docente')
        cls.estudiante = crear_usuario('Estudiante')
        _, periodo, materia = crear_catalogo()
        cls.bloque = crear_bloque(cls.docente, periodo, materia)

    def test_docente_no_reserva(self):
        self.client.force_authenticate(self.docente)
        response = self.client.post(URL, {'bloque_id': self.bloque.id, 'tema': 'Límites'}, format='json')
        self.assertEqual(response.status_code, 403)

    def test_estudiante_reserva(self):
        self.client.force_authenticate(self.estudiante)
        response = self.client.post(URL, {'bloque_id': self.bloque.id, 'tema': 'Límites'}, format='json')
        self.assertEqual(response.status_code, 201, response.data)
