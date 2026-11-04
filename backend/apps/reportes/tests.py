from datetime import date, timedelta

from rest_framework.test import APITestCase

from apps.accounts.pruebas import (
    crear_bloque,
    crear_catalogo,
    crear_tutoria,
    crear_usuario,
)

URL = '/api/accounts/dashboard-stats/'


class IndicadoresPanelTests(APITestCase):
    """PR5: indicadores del panel de coordinación."""

    @classmethod
    def setUpTestData(cls):
        cls.coordinador = crear_usuario('Coordinador')
        cls.docente = crear_usuario('Docente')
        cls.estudiante = crear_usuario('Estudiante')
        _, periodo, cls.materia = crear_catalogo()
        # Un día del mes en curso, para que la prueba no dependa de la fecha.
        hoy = date.today()
        bloque = crear_bloque(cls.docente, periodo, cls.materia, fecha=hoy.replace(day=1 if hoy.day > 1 else 2))
        crear_tutoria(bloque, cls.estudiante)
        crear_tutoria(bloque, crear_usuario('Estudiante'), estado='CANCELADA_ESTUDIANTE')
        crear_tutoria(crear_bloque(cls.docente, periodo, cls.materia, fecha=hoy + timedelta(days=62)), cls.estudiante)

    def test_indicadores(self):
        self.client.force_authenticate(self.coordinador)
        response = self.client.get(URL)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, {
            'tutorias_mes': 1,
            'estudiantes_activos': 2,
            'tutores_activos': 1,
            'materia_mas_demandada': self.materia.nombre,
            'porcentaje_demandada': '100%',
        })

    def test_solo_coordinacion(self):
        self.client.force_authenticate(self.estudiante)
        self.assertEqual(self.client.get(URL).status_code, 403)
