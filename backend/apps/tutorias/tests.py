from datetime import date, datetime, time, timedelta
from decimal import Decimal

from django.core import mail
from django.test import TestCase, override_settings
from rest_framework.test import APITestCase

from apps.accounts.pruebas import (
    crear_bloque,
    crear_catalogo,
    crear_tutoria,
    crear_usuario,
)
from apps.catalogo.models import Configuracion
from apps.notificaciones.models import Notificacion

from .estados import puede_pasar
from .models import Cancelacion, Tutoria
from .services import calcular_horas_previas, cancelar_tutoria

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


@override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
class RevisionTutoriasTests(APITestCase):
    """Pendientes de la revisión de #51 y de la auditoría en tutorías."""

    @classmethod
    def setUpTestData(cls):
        cls.docente = crear_usuario('Docente')
        cls.estudiante = crear_usuario('Estudiante')
        _, cls.periodo, cls.materia = crear_catalogo()

    def setUp(self):
        self.client.force_authenticate(self.estudiante)
        self.bloque = crear_bloque(self.docente, self.periodo, self.materia, cupo_total=1)

    def reservar(self):
        return self.client.post(URL, {'bloque_id': self.bloque.id, 'tema': 'Derivadas'}, format='json')

    def cancelar(self, tutoria_id):
        with self.captureOnCommitCallbacks(execute=True):
            return self.client.delete(f'{URL}{tutoria_id}/', {'motivo': 'Enfermedad'}, format='json')

    def test_reservar_crea_notificaciones(self):
        response = self.reservar()
        self.assertEqual(response.status_code, 201, response.data)
        tipos = dict(Notificacion.objects.values_list('usuario_id', 'tipo'))
        self.assertEqual(tipos, {self.docente.id: 'NUEVA_RESERVA', self.estudiante.id: 'RESERVA_CONFIRMADA'})

    def test_cancelar_avisa_al_docente(self):
        tutoria_id = self.reservar().data['tutoria']['id']
        self.assertEqual(self.cancelar(tutoria_id).status_code, 200)
        aviso = Notificacion.objects.get(tipo='CANCELACION')
        self.assertEqual(aviso.usuario, self.docente)
        self.assertTrue(aviso.enviada_email)
        self.assertEqual([m.to for m in mail.outbox], [[self.docente.email]])

    def test_reservar_cancelar_y_volver_a_reservar(self):
        # BE-08: era el caso que repetía el código.
        primera = self.reservar().data['tutoria']
        self.assertEqual(self.cancelar(primera['id']).status_code, 200)
        response = self.reservar()
        self.assertEqual(response.status_code, 201, response.data)
        self.assertNotEqual(response.data['tutoria']['codigo'], primera['codigo'])
        self.bloque.refresh_from_db()
        self.assertEqual((self.bloque.cupo_ocupado, self.bloque.estado), (1, 'COMPLETO'))


class EstadosTests(TestCase):
    """RF-10: tabla de transiciones."""

    def test_activos_y_finales(self):
        self.assertTrue(puede_pasar('RESERVADA', 'CONFIRMADA'))
        self.assertTrue(puede_pasar('CONFIRMADA', 'COMPLETADA'))
        self.assertTrue(puede_pasar('RESERVADA', 'ANULADA'))
        self.assertFalse(puede_pasar('CONFIRMADA', 'RESERVADA'))
        for final in ('COMPLETADA', 'NO_ASISTIO', 'CANCELADA_ESTUDIANTE', 'CANCELADA_DOCENTE', 'ANULADA'):
            with self.subTest(final=final):
                self.assertFalse(puede_pasar(final, 'CONFIRMADA'))
                self.assertFalse(puede_pasar(final, 'CANCELADA_ESTUDIANTE'))


@override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
class PlazosTests(APITestCase):
    """RF-08: plazos de reserva y cancelación desde Configuracion."""

    @classmethod
    def setUpTestData(cls):
        cls.docente = crear_usuario('Docente')
        cls.estudiante = crear_usuario('Estudiante')
        _, cls.periodo, cls.materia = crear_catalogo()

    def setUp(self):
        self.client.force_authenticate(self.estudiante)
        self.bloque = crear_bloque(self.docente, self.periodo, self.materia)  # en 7 días
        self.config = Configuracion.actual()

    def configurar(self, **valores):
        Configuracion.objects.filter(pk=1).update(**valores)

    def test_reserva_fuera_de_plazo(self):
        # Con 48 horas de anticipación, un bloque de mañana ya no se reserva.
        self.configurar(horas_anticipacion_reservar=48)
        manana = crear_bloque(self.docente, self.periodo, self.materia, fecha=date.today() + timedelta(days=1))
        response = self.client.post(URL, {'bloque_id': manana.id, 'tema': 'Límites'}, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data['code'], 'plazo_vencido')
        self.assertIn('bloque_id', response.data['errors'])

    def test_cancelacion_fuera_de_plazo(self):
        self.configurar(horas_anticipacion_cancelar=24 * 8)
        tutoria = crear_tutoria(self.bloque, self.estudiante)

        datos = self.client.get(f'{URL}{tutoria.id}/').data
        self.assertFalse(datos['puede_cancelar'])
        inicio = datetime.combine(self.bloque.fecha, self.bloque.hora_inicio)
        self.assertEqual(datos['limite_cancelacion'], inicio - timedelta(hours=24 * 8))

        response = self.client.delete(f'{URL}{tutoria.id}/', {'motivo': 'Viaje'}, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data['code'], 'plazo_vencido')

    def test_el_tutor_cancela_hasta_el_inicio_y_avisa_por_correo(self):
        self.configurar(horas_anticipacion_cancelar=24 * 8)
        tutoria = crear_tutoria(self.bloque, self.estudiante)
        with self.captureOnCommitCallbacks(execute=True):
            cancelar_tutoria(tutoria, self.docente, 'Calamidad')
        tutoria.refresh_from_db()
        self.assertEqual(tutoria.estado, 'CANCELADA_DOCENTE')
        self.assertEqual([m.to for m in mail.outbox], [[self.estudiante.email]])

    def test_anular(self):
        tutoria = crear_tutoria(self.bloque, self.estudiante, estado='CONFIRMADA')
        cancelar_tutoria(tutoria, self.docente, 'Se revocó la habilitación del tutor.', anular=True)
        tutoria.refresh_from_db()
        self.assertEqual(tutoria.estado, 'ANULADA')
        self.assertEqual(Cancelacion.objects.get(tutoria=tutoria).origen, 'SISTEMA')

    def test_reservar_avisa_por_correo(self):
        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.post(URL, {'bloque_id': self.bloque.id, 'tema': 'Límites'}, format='json')
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(
            sorted(m.to[0] for m in mail.outbox), sorted([self.docente.email, self.estudiante.email])
        )


@override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
class TutoriasRecibidasTests(APITestCase):
    """Listado del tutor y cambio de estado (RF-10)."""

    @classmethod
    def setUpTestData(cls):
        cls.docente = crear_usuario('Docente')
        cls.estudiante = crear_usuario('Estudiante')
        _, cls.periodo, cls.materia = crear_catalogo()

    def setUp(self):
        self.client.force_authenticate(self.docente)
        self.futuro = crear_bloque(self.docente, self.periodo, self.materia)
        self.pasado = crear_bloque(self.docente, self.periodo, self.materia, fecha=date.today() - timedelta(days=1))

    def cambiar(self, tutoria, **datos):
        with self.captureOnCommitCallbacks(execute=True):
            return self.client.patch(f'/api/tutorias/recibidas/{tutoria.id}/', datos, format='json')

    def test_confirmar_antes_del_inicio(self):
        tutoria = crear_tutoria(self.futuro, self.estudiante)
        self.assertEqual(
            self.client.get('/api/tutorias/recibidas/').data[0]['estados_siguientes'],
            ['CONFIRMADA', 'CANCELADA_DOCENTE'],
        )
        response = self.cambiar(tutoria, estado='CONFIRMADA')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['estado'], 'CONFIRMADA')
        self.assertTrue(Notificacion.objects.filter(usuario=self.estudiante, tutoria=tutoria).exists())

    def test_completar_desde_el_inicio(self):
        tutoria = crear_tutoria(self.pasado, self.estudiante, estado='CONFIRMADA')
        response = self.cambiar(tutoria, estado='COMPLETADA', minutos_retraso=10, notas_docente='Se repasó.')
        self.assertEqual(response.status_code, 200, response.data)
        tutoria.refresh_from_db()
        self.assertEqual((tutoria.estado, tutoria.asistencia, tutoria.minutos_retraso), ('COMPLETADA', 'ASISTIO_TARDE', 10))
        self.assertEqual(response.data['estados_siguientes'], [])

    def test_no_asistio(self):
        tutoria = crear_tutoria(self.pasado, self.estudiante)
        self.assertEqual(self.cambiar(tutoria, estado='NO_ASISTIO').status_code, 200)
        tutoria.refresh_from_db()
        self.assertEqual(tutoria.asistencia, 'NO_ASISTIO')

    def test_no_completa_antes_del_inicio(self):
        tutoria = crear_tutoria(self.futuro, self.estudiante)
        self.assertEqual(self.cambiar(tutoria, estado='COMPLETADA').status_code, 400)

    def test_estado_final_no_cambia(self):
        tutoria = crear_tutoria(self.pasado, self.estudiante, estado='COMPLETADA')
        response = self.cambiar(tutoria, estado='NO_ASISTIO')
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data['code'], 'transicion_invalida')

    def test_cancelar_exige_motivo_y_avisa_por_correo(self):
        tutoria = crear_tutoria(self.futuro, self.estudiante)
        self.assertEqual(self.cambiar(tutoria, estado='CANCELADA_DOCENTE').status_code, 400)
        response = self.cambiar(tutoria, estado='CANCELADA_DOCENTE', motivo='Calamidad')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['estado'], 'CANCELADA_DOCENTE')
        self.assertEqual([m.to for m in mail.outbox], [[self.estudiante.email]])

    def test_no_toca_tutorias_de_otro_tutor(self):
        ajena = crear_tutoria(crear_bloque(crear_usuario('Docente'), self.periodo, self.materia), self.estudiante)
        self.assertEqual(self.cambiar(ajena, estado='CONFIRMADA').status_code, 404)
