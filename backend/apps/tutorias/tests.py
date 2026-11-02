from datetime import date, datetime, time, timedelta
from decimal import Decimal

from django.test import TestCase
from rest_framework.test import APITestCase

from apps.accounts.pruebas import (
    crear_bloque,
    crear_catalogo,
    crear_tutoria,
    crear_usuario,
)

from .models import Tutoria
from .services import calcular_horas_previas

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


class ReglasTutoriasTests(APITestCase):
    """PR3: BE-06 a BE-09 y BE-19 a BE-22."""

    @classmethod
    def setUpTestData(cls):
        cls.docente = crear_usuario('Docente')
        cls.estudiante = crear_usuario('Estudiante')
        _, cls.periodo, cls.materia = crear_catalogo()

    def setUp(self):
        self.client.force_authenticate(self.estudiante)
        self.bloque = crear_bloque(self.docente, self.periodo, self.materia)

    def reservar(self, bloque=None):
        bloque = bloque or self.bloque
        return self.client.post(URL, {'bloque_id': bloque.id, 'tema': 'Integrales'}, format='json')

    def cancelar(self, tutoria):
        return self.client.delete(f'{URL}{tutoria.id}/', {'motivo': 'Cruce de horario'}, format='json')

    # BE-08
    def test_codigo_sale_del_id(self):
        response = self.reservar()
        tutoria = response.data['tutoria']
        self.assertEqual(tutoria['codigo'], f"TUT-{tutoria['id']:06d}")

    def test_dos_reservas_del_mismo_estudiante_en_bloques_distintos(self):
        otro = crear_bloque(self.docente, self.periodo, self.materia, hora_inicio=time(14, 0), hora_fin=time(15, 0))
        self.assertEqual(self.reservar().status_code, 201)
        self.assertEqual(self.reservar(otro).status_code, 201)

    # BE-09
    def test_no_reserva_bloques_pasados(self):
        pasado = crear_bloque(self.docente, self.periodo, self.materia, fecha=date.today() - timedelta(days=1))
        self.assertEqual(self.reservar(pasado).status_code, 400)

    def test_no_edita_ni_cancela_despues_del_inicio(self):
        pasado = crear_bloque(self.docente, self.periodo, self.materia, fecha=date.today() - timedelta(days=1))
        tutoria = crear_tutoria(pasado, self.estudiante)
        self.assertEqual(self.client.patch(f'{URL}{tutoria.id}/', {'tema': 'Otro'}, format='json').status_code, 400)
        self.assertEqual(self.cancelar(tutoria).status_code, 400)

    # BE-06, BE-07 y BE-21
    def test_cancelacion_del_estudiante(self):
        tutoria = Tutoria.objects.get(pk=self.reservar().data['tutoria']['id'])
        response = self.client.delete(
            f'{URL}{tutoria.id}/', {'motivo': 'Cruce de horario', 'origen': 'SISTEMA'}, format='json'
        )
        self.assertEqual(response.status_code, 200, response.data)

        tutoria.refresh_from_db()
        self.bloque.refresh_from_db()
        cancelacion = tutoria.cancelaciones.get()
        self.assertEqual(tutoria.estado, 'CANCELADA_ESTUDIANTE')
        self.assertEqual(cancelacion.origen, 'ESTUDIANTE')
        self.assertGreater(cancelacion.horas_previas, Decimal(100))
        self.assertEqual(self.bloque.cupo_ocupado, 0)

    # BE-20
    def test_cancela_tutorias_confirmadas(self):
        tutoria = crear_tutoria(self.bloque, self.estudiante, estado='CONFIRMADA')
        self.assertEqual(self.cancelar(tutoria).status_code, 200)

    def test_no_cancela_tutorias_finalizadas(self):
        tutoria = crear_tutoria(self.bloque, self.estudiante, estado='COMPLETADA')
        self.assertEqual(self.cancelar(tutoria).status_code, 400)

    # BE-22
    def test_lectura_trae_el_bloque_y_lo_que_se_puede_hacer(self):
        crear_tutoria(self.bloque, self.estudiante)
        tutoria = self.client.get(URL).data[0]
        detalle = tutoria['bloque_detalle']
        self.assertEqual(tutoria['bloque'], self.bloque.id)
        self.assertEqual(detalle['materia'], {'id': self.materia.id, 'nombre': self.materia.nombre})
        self.assertEqual(detalle['docente'], {'id': self.docente.id, 'nombre': self.docente.get_full_name()})
        self.assertEqual(detalle['modalidad'], 'PRESENCIAL')
        self.assertTrue(tutoria['puede_cancelar'])
        self.assertTrue(tutoria['puede_editar'])

    # BE-19
    def test_docente_ve_las_tutorias_de_sus_bloques(self):
        mia = crear_tutoria(self.bloque, self.estudiante)
        ajena = crear_bloque(crear_usuario('Docente'), self.periodo, self.materia)
        crear_tutoria(ajena, self.estudiante)

        self.client.force_authenticate(self.docente)
        response = self.client.get('/api/tutorias/recibidas/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual([t['id'] for t in response.data], [mia.id])
        self.assertEqual(response.data[0]['estudiante_nombre'], self.estudiante.get_full_name())

    def test_estudiante_no_ve_tutorias_recibidas(self):
        self.assertEqual(self.client.get('/api/tutorias/recibidas/').status_code, 403)


class HorasPreviasTests(TestCase):
    """BE-21 sin HTTP: horas entre ahora y el inicio del bloque."""

    def test_horas_previas(self):
        inicio = datetime.now() + timedelta(hours=5)
        bloque = type('Bloque', (), {'fecha': inicio.date(), 'hora_inicio': inicio.time()})
        self.assertAlmostEqual(float(calcular_horas_previas(bloque)), 5, delta=0.02)

    def test_horas_previas_no_desborda_el_campo(self):
        bloque = type('Bloque', (), {'fecha': date.today() + timedelta(days=400), 'hora_inicio': time(8, 0)})
        self.assertEqual(calcular_horas_previas(bloque), Decimal('999.99'))
