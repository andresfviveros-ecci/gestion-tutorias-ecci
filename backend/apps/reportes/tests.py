from datetime import date, timedelta

from rest_framework.test import APITestCase

from apps.accounts.pruebas import (
    crear_bloque,
    crear_catalogo,
    crear_tutoria,
    crear_usuario,
)
from apps.catalogo.models import PeriodoAcademico
from apps.tutorias.models import EvaluacionTutoria

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


class ReporteTutoresTests(APITestCase):
    """RF-09: reporte por tutor para la coordinación."""
    URL = '/api/reportes/tutores/'

    @classmethod
    def setUpTestData(cls):
        cls.coordinador = crear_usuario('Coordinador')
        cls.docente = crear_usuario('Docente')
        cls.otro = crear_usuario('Docente')
        _, cls.periodo, materia = crear_catalogo()
        pasado = crear_bloque(cls.docente, cls.periodo, materia, fecha=date.today() - timedelta(days=1))
        for calificacion in (8, 10):
            tutoria = crear_tutoria(pasado, crear_usuario('Estudiante'), estado='COMPLETADA')
            EvaluacionTutoria.objects.create(tutoria=tutoria, calificacion=calificacion)
        crear_tutoria(pasado, crear_usuario('Estudiante'), estado='NO_ASISTIO')
        crear_tutoria(crear_bloque(cls.otro, cls.periodo, materia), crear_usuario('Estudiante'), estado='CANCELADA_DOCENTE')

    def test_reporte(self):
        self.client.force_authenticate(self.coordinador)
        response = self.client.get(self.URL)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, [
            {
                'id': self.docente.id, 'nombre': self.docente.get_full_name(), 'tipo': 'Docente',
                'tutorias': 3, 'completadas': 2, 'no_asistio': 1, 'canceladas_por_tutor': 0,
                'evaluaciones': 2, 'promedio_calificacion': 9.0,
            },
            {
                'id': self.otro.id, 'nombre': self.otro.get_full_name(), 'tipo': 'Docente',
                'tutorias': 1, 'completadas': 0, 'no_asistio': 0, 'canceladas_por_tutor': 1,
                'evaluaciones': 0, 'promedio_calificacion': None,
            },
        ])

    def test_periodo_sin_tutorias_y_filtro_invalido(self):
        self.client.force_authenticate(self.coordinador)
        anterior = PeriodoAcademico.objects.create(codigo='ANT', fecha_inicio=date(2020, 1, 1), fecha_fin=date(2020, 6, 1))
        self.assertEqual(self.client.get(self.URL, {'periodo': anterior.id}).data, [])
        self.assertEqual(self.client.get(self.URL, {'periodo': 'abc'}).status_code, 400)

    def test_solo_coordinacion(self):
        self.client.force_authenticate(self.docente)
        self.assertEqual(self.client.get(self.URL).status_code, 403)
