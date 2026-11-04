from datetime import date, timedelta
from decimal import Decimal

from django.core import mail
from django.test import SimpleTestCase, override_settings
from rest_framework.test import APITestCase

from apps.accounts.pruebas import asignar_materia, crear_catalogo, crear_usuario
from apps.catalogo.models import Configuracion, Inscripcion, PeriodoAcademico
from apps.notificaciones.models import Notificacion

from .models import SolicitudTutor
from .services import calcular_nota_final

URL = '/api/tutores/solicitudes/'
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


class NotaFinalTests(SimpleTestCase):
    def test_redondea_la_mitad_hacia_arriba(self):
        # 4,005 con el redondeo por defecto (al par) daba 4,00.
        config = Configuracion(peso_corte1=50, peso_corte2=50, peso_corte3=0)
        self.assertEqual(calcular_nota_final(Decimal('4.01'), Decimal('4.00'), Decimal(0), config), Decimal('4.01'))
