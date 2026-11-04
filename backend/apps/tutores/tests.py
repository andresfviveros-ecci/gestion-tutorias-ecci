from datetime import date, timedelta
from decimal import Decimal

from django.core import mail
from django.test import SimpleTestCase, override_settings
from rest_framework.test import APITestCase

from apps.accounts.pruebas import asignar_materia, crear_catalogo, crear_usuario
from apps.catalogo.models import Configuracion, Inscripcion, Materia, PeriodoAcademico
from apps.disponibilidad.models import BloqueDisponibilidad
from apps.notificaciones.models import Notificacion
from apps.tutorias.models import Tutoria

from .models import SolicitudTutor
from .services import calcular_nota_final

URL = '/api/tutores/solicitudes/'
BLOQUES_URL = '/api/disponibilidad/disponibilidad/'
NOTAS = {'nota_corte1': '4.0', 'nota_corte2': '4.5', 'nota_corte3': '4.2'}  # final 4.23


@override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
class SolicitudesTutorTests(APITestCase):
    """RF-02 y RF-03: solicitud, aprobación, rechazo y revocación."""

    @classmethod
    def setUpTestData(cls):
        _, cls.periodo, cls.materia = crear_catalogo()
        cls.anterior = PeriodoAcademico.objects.create(
            codigo='ANT', fecha_inicio=date.today() - timedelta(days=200), fecha_fin=date.today() - timedelta(days=60)
        )
        cls.docente = crear_usuario('Docente')
        asignar_materia(cls.docente, cls.materia, cls.periodo)
        cls.estudiante = crear_usuario('Estudiante')
        cls.estudiante.semestre = 5
        cls.estudiante.save(update_fields=['semestre'])
        Inscripcion.objects.create(estudiante=cls.estudiante, materia=cls.materia, periodo=cls.anterior)

    def setUp(self):
        self.client.force_authenticate(self.estudiante)

    def solicitar(self, **cambios):
        with self.captureOnCommitCallbacks(execute=True):
            return self.client.post(URL, {'materia': self.materia.id, **NOTAS, **cambios}, format='json')

    def revisar(self, solicitud_id, accion, usuario=None, **datos):
        self.client.force_authenticate(usuario or self.docente)
        with self.captureOnCommitCallbacks(execute=True):
            return self.client.post(f'{URL}{solicitud_id}/{accion}/', datos, format='json')

    def test_solicitud_valida(self):
        response = self.solicitar()
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data['nota_final'], '4.23')
        self.assertEqual(response.data['estado'], 'PENDIENTE')
        self.assertEqual(response.data['periodo'], self.periodo.id)
        # Le llega al docente de la materia, en la aplicación y por correo.
        self.assertTrue(Notificacion.objects.filter(usuario=self.docente, tipo='SOLICITUD_TUTOR').exists())
        self.assertEqual([m.to for m in mail.outbox], [[self.docente.email]])

    def test_nota_menor_que_la_minima(self):
        response = self.solicitar(nota_corte3='3.0')  # final 3.75
        self.assertEqual(response.status_code, 400)
        self.assertIn('nota_corte3', response.data['errors'])

    def test_semestre_minimo(self):
        self.estudiante.semestre = 2
        self.estudiante.save(update_fields=['semestre'])
        self.assertEqual(self.solicitar().status_code, 400)

    def test_materia_no_cursada(self):
        Inscripcion.objects.filter(estudiante=self.estudiante).update(periodo=self.periodo)
        response = self.solicitar()
        self.assertEqual(response.status_code, 400)
        self.assertIn('materia', response.data['errors'])

    def test_materia_sin_docente(self):
        self.docente.materias_asignadas.all().delete()
        self.assertEqual(self.solicitar().status_code, 400)

    def test_una_sola_solicitud_vigente(self):
        self.assertEqual(self.solicitar().status_code, 201)
        self.assertEqual(self.solicitar().status_code, 400)

    def test_solo_estudiantes_solicitan(self):
        self.client.force_authenticate(self.docente)
        self.assertEqual(self.solicitar().status_code, 403)

    def test_aprobar_y_revocar(self):
        solicitud_id = self.solicitar().data['id']
        response = self.revisar(solicitud_id, 'aprobar')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual((response.data['estado'], response.data['revisada_por']), ('APROBADA', self.docente.id))
        self.assertTrue(Notificacion.objects.filter(usuario=self.estudiante, tipo='HABILITACION').exists())

        self.assertEqual(self.revisar(solicitud_id, 'revocar').status_code, 400)  # sin motivo
        response = self.revisar(solicitud_id, 'revocar', motivo='No se presentó a las tutorías.')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['estado'], 'REVOCADA')
        # Una revocada ya no se aprueba otra vez: se pide de nuevo.
        self.assertEqual(self.revisar(solicitud_id, 'aprobar').data['code'], 'transicion_invalida')

    def test_rechazar_pide_motivo(self):
        solicitud_id = self.solicitar().data['id']
        self.assertEqual(self.revisar(solicitud_id, 'rechazar').status_code, 400)
        response = self.revisar(solicitud_id, 'rechazar', motivo='Faltan soportes.')
        self.assertEqual(response.data['estado'], 'RECHAZADA')
        self.assertEqual(response.data['motivo'], 'Faltan soportes.')
        # Rechazada, puede volver a pedirla.
        self.client.force_authenticate(self.estudiante)
        self.assertEqual(self.solicitar().status_code, 201)

    def test_solo_el_docente_de_la_materia_revisa(self):
        solicitud_id = self.solicitar().data['id']
        otro = crear_usuario('Docente')
        # No la ve, así que responde 404; la coordinación sí puede.
        self.assertEqual(self.revisar(solicitud_id, 'aprobar', usuario=otro).status_code, 404)
        self.assertEqual(self.revisar(solicitud_id, 'aprobar', usuario=self.estudiante).status_code, 403)
        self.assertEqual(self.revisar(solicitud_id, 'aprobar', usuario=crear_usuario('Coordinador')).status_code, 200)

    def test_quien_ve_que(self):
        self.solicitar()
        otra = crear_usuario('Estudiante')
        SolicitudTutor.objects.create(
            estudiante=otra, materia=self.materia, periodo=self.periodo,
            nota_corte1=Decimal(5), nota_corte2=Decimal(5), nota_corte3=Decimal(5), nota_final=Decimal(5),
        )
        self.assertEqual(len(self.client.get(URL).data), 1)
        self.client.force_authenticate(self.docente)
        self.assertEqual(len(self.client.get(URL).data), 2)
        self.client.force_authenticate(crear_usuario('Docente'))
        self.assertEqual(len(self.client.get(URL).data), 0)


@override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
class ReglasTutorEstudianteTests(APITestCase):
    """RF-01, RF-04, RF-06 y diferencia de semestres al reservar."""

    @classmethod
    def setUpTestData(cls):
        _, cls.periodo, cls.materia = crear_catalogo()
        cls.otra_materia = Materia.objects.create(codigo='OTRA', nombre='Física', programa=cls.materia.programa)
        cls.docente = crear_usuario('Docente')
        asignar_materia(cls.docente, cls.materia, cls.periodo)
        cls.tutor = crear_usuario('Estudiante')
        cls.estudiante = crear_usuario('Estudiante')
        for usuario, semestre in ((cls.tutor, 6), (cls.estudiante, 3)):
            usuario.semestre = semestre
            usuario.save(update_fields=['semestre'])
        cls.solicitud = SolicitudTutor.objects.create(
            estudiante=cls.tutor, materia=cls.materia, periodo=cls.periodo, estado='APROBADA',
            nota_corte1=Decimal(5), nota_corte2=Decimal(5), nota_corte3=Decimal(5), nota_final=Decimal(5),
        )
        hoy = date.today()
        cls.lunes = hoy + timedelta(days=7 - hoy.weekday())  # lunes de la semana siguiente

    def setUp(self):
        self.client.force_authenticate(self.tutor)

    def publicar(self, fecha=None, materia=None, cupo=2, hora=8):
        return self.client.post(BLOQUES_URL, {
            'materia': (materia or self.materia).id, 'periodo': self.periodo.id,
            'fecha': str(fecha or self.lunes), 'hora_inicio': f'{hora:02d}:00', 'hora_fin': f'{hora + 1:02d}:00',
            'modalidad': 'PRESENCIAL', 'lugar': 'Biblioteca', 'cupo_total': cupo,
        }, format='json')

    def reservar(self, bloque_id, usuario=None):
        self.client.force_authenticate(usuario or self.estudiante)
        return self.client.post('/api/tutorias/tutorias/', {'bloque_id': bloque_id, 'tema': 'Repaso'}, format='json')

    # RF-01
    def test_tutor_estudiante_publica(self):
        response = self.publicar()
        self.assertEqual(response.status_code, 201, response.data)
        self.assertTrue(self.client.get('/api/accounts/me/').data['puede_publicar'])

    def test_estudiante_sin_habilitar_no_publica(self):
        self.client.force_authenticate(self.estudiante)
        self.assertFalse(self.client.get('/api/accounts/me/').data['puede_publicar'])
        self.assertEqual(self.publicar().status_code, 403)

    # RF-04
    def test_solo_en_materias_habilitadas(self):
        response = self.publicar(materia=self.otra_materia)
        self.assertEqual(response.status_code, 400)
        self.assertIn('materia', response.data['errors'])

    # RF-06
    def test_cupos_semanales(self):
        self.assertEqual(self.publicar(cupo=6).status_code, 201)
        response = self.publicar(fecha=self.lunes + timedelta(days=1), cupo=5)
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data['code'], 'cupos_semanales')
        self.assertEqual(self.publicar(fecha=self.lunes + timedelta(days=1), cupo=4).status_code, 201)
        # La semana siguiente empieza de cero.
        self.assertEqual(self.publicar(fecha=self.lunes + timedelta(days=7), cupo=6).status_code, 201)

    def test_los_docentes_no_tienen_tope_semanal(self):
        self.client.force_authenticate(self.docente)
        self.assertEqual(self.publicar(cupo=8).status_code, 201)
        self.assertEqual(self.publicar(fecha=self.lunes + timedelta(days=1), cupo=8).status_code, 201)

    # RF-02 al reservar
    def test_diferencia_de_semestres(self):
        bloque_id = self.publicar().data['id']
        self.assertEqual(self.reservar(bloque_id).status_code, 201)

        companero = crear_usuario('Estudiante')
        companero.semestre = 5
        companero.save(update_fields=['semestre'])
        response = self.reservar(bloque_id, companero)
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data['code'], 'diferencia_semestres')

    def test_no_reserva_sus_propios_bloques(self):
        bloque_id = self.publicar().data['id']
        self.assertEqual(self.reservar(bloque_id, self.tutor).status_code, 400)

    def test_revocar_anula_las_reservas_y_quita_el_permiso(self):
        bloque_id = self.publicar().data['id']
        tutoria_id = self.reservar(bloque_id).data['tutoria']['id']

        self.client.force_authenticate(self.docente)
        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.post(f'{URL}{self.solicitud.id}/revocar/', {'motivo': 'Faltas.'}, format='json')
        self.assertEqual(response.status_code, 200, response.data)

        self.assertEqual(BloqueDisponibilidad.objects.get(pk=bloque_id).estado, 'CANCELADO')
        self.assertEqual(Tutoria.objects.get(pk=tutoria_id).estado, 'ANULADA')
        self.assertIn([self.estudiante.email], [m.to for m in mail.outbox])

        self.client.force_authenticate(self.tutor)
        self.assertEqual(self.publicar(fecha=self.lunes + timedelta(days=2)).status_code, 403)
        # Sigue viendo el historial de sus tutorías.
        self.assertEqual(self.client.get('/api/tutorias/recibidas/').status_code, 200)

    def test_la_reserva_comprueba_la_habilitacion(self):
        bloque_id = self.publicar().data['id']
        SolicitudTutor.objects.filter(pk=self.solicitud.pk).update(estado='REVOCADA')
        self.assertEqual(self.reservar(bloque_id).status_code, 400)

    def test_editar_el_lugar_no_revisa_el_tope_semanal(self):
        bloque_id = self.publicar(cupo=6).data['id']
        Configuracion.objects.filter(pk=1).update(cupos_semanales_tutor=2)
        url = f'/api/disponibilidad/{bloque_id}/actualizar/'
        self.assertEqual(self.client.patch(url, {'lugar': 'Sala 2'}, format='json').status_code, 200)
        self.assertEqual(self.client.patch(url, {'cupo_total': 7}, format='json').status_code, 400)


class NotaFinalTests(SimpleTestCase):
    def test_redondea_la_mitad_hacia_arriba(self):
        # 4,005 con el redondeo por defecto (al par) daba 4,00.
        config = Configuracion(peso_corte1=50, peso_corte2=50, peso_corte3=0)
        self.assertEqual(calcular_nota_final(Decimal('4.01'), Decimal('4.00'), Decimal(0), config), Decimal('4.01'))
