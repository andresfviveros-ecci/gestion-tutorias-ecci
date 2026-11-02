from rest_framework.test import APITestCase

from apps.accounts.pruebas import crear_bloque, crear_catalogo, crear_tutoria, crear_usuario


class PermisosCatalogoTests(APITestCase):
    """PR2: BE-04 y BE-14 en el catálogo."""

    @classmethod
    def setUpTestData(cls):
        cls.coordinador = crear_usuario('Coordinador')
        cls.estudiante = crear_usuario('Estudiante')
        cls.programa, cls.periodo, cls.materia = crear_catalogo()

    # BE-04
    def test_cualquier_autenticado_lee_el_catalogo(self):
        self.client.force_authenticate(self.estudiante)
        for url in ('materias', 'programas', 'periodos'):
            with self.subTest(url=url):
                self.assertEqual(self.client.get(f'/api/catalogo/{url}/').status_code, 200)

    def test_solo_coordinacion_escribe_el_catalogo(self):
        datos = {'codigo': 'MAT-NUEVA', 'nombre': 'Física I', 'programa': self.programa.id}
        self.client.force_authenticate(self.estudiante)
        self.assertEqual(self.client.post('/api/catalogo/materias/', datos, format='json').status_code, 403)
        self.assertEqual(self.client.delete(f'/api/catalogo/materias/{self.materia.id}/').status_code, 403)

        self.client.force_authenticate(self.coordinador)
        self.assertEqual(self.client.post('/api/catalogo/materias/', datos, format='json').status_code, 201)

    # BE-14
    def test_programa_con_materias_responde_409(self):
        self.client.force_authenticate(self.coordinador)
        response = self.client.delete(f'/api/catalogo/programas/{self.programa.id}/')
        self.assertEqual(response.status_code, 409)
        self.assertIn('detail', response.data)

    def test_periodo_con_tutorias_responde_409(self):
        bloque = crear_bloque(crear_usuario('Docente'), self.periodo, self.materia)
        crear_tutoria(bloque, self.estudiante)
        self.client.force_authenticate(self.coordinador)
        response = self.client.delete(f'/api/catalogo/periodos/{self.periodo.id}/')
        self.assertEqual(response.status_code, 409)
