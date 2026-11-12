from datetime import date, timedelta
from decimal import Decimal

from django.core import mail
from django.test import SimpleTestCase, override_settings
from rest_framework.test import APITestCase

from apps.accounts.pruebas import asignar_materia, crear_catalogo, crear_usuario
from apps.catalogo.models import (
    Configuracion,
    Inscripcion,
    Materia,
    PeriodoAcademico,
    calcular_nota_final,
)
from apps.disponibilidad.models import BloqueDisponibilidad
from apps.notificaciones.models import Notificacion
from apps.tutorias.models import Tutoria

from .models import SolicitudTutor

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
        # Materia de tercer semestre: con quinto, el avance es 2.
        Materia.objects.filter(pk=cls.materia.pk).update(semestre=3)
        cls.inscripcion = Inscripcion.objects.create(
            estudiante=cls.estudiante, materia=cls.materia, periodo=cls.anterior, **NOTAS
        )

    def setUp(self):
        self.client.force_authenticate(self.estudiante)

    def solicitar(self, **cambios):
        with self.captureOnCommitCallbacks(execute=True):
            return self.client.post(URL, {'materia': self.materia.id, **cambios}, format='json')

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
        Inscripcion.objects.filter(pk=self.inscripcion.pk).update(nota_corte3=Decimal('3.0'))  # final 3.75
        response = self.solicitar()
        self.assertEqual(response.status_code, 400)
        self.assertIn('3.75', response.data['errors']['materia'][0])

    # GT-270: las notas salen del historial, no de lo que mande el estudiante.
    def test_las_notas_salen_del_historial(self):
        response = self.solicitar(nota_corte1='5.0', nota_corte2='5.0', nota_corte3='5.0')
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(
            [response.data[c] for c in ('nota_corte1', 'nota_corte2', 'nota_corte3', 'nota_final')],
            ['4.00', '4.50', '4.20', '4.23'],
        )

    def test_sin_nota_registrada(self):
        Inscripcion.objects.filter(pk=self.inscripcion.pk).update(nota_corte3=None)
        response = self.solicitar()
        self.assertEqual(response.status_code, 400)
        self.assertIn('nota final registrada', response.data['detail'])

    def test_avance_insuficiente(self):
        Materia.objects.filter(pk=self.materia.pk).update(semestre=4)
        response = self.solicitar()
        self.assertEqual(response.status_code, 400)
        self.assertIn('semestres por delante', response.data['detail'])

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
        response = self.revisar(solicitud_id, 'aprobar', motivo='Buen dominio del tema en la entrevista.')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual((response.data['estado'], response.data['revisada_por']), ('APROBADA', self.docente.id))
        self.assertEqual(response.data['motivo'], 'Buen dominio del tema en la entrevista.')
        aviso = Notificacion.objects.get(usuario=self.estudiante, tipo='HABILITACION')
        self.assertIn('Buen dominio del tema', aviso.mensaje)

        self.assertEqual(self.revisar(solicitud_id, 'revocar').status_code, 400)  # sin motivo
        response = self.revisar(solicitud_id, 'revocar', motivo='No se presentó a las tutorías.')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['estado'], 'REVOCADA')
        # Una revocada ya no se aprueba otra vez: se pide de nuevo.
        self.assertEqual(self.revisar(solicitud_id, 'aprobar').data['code'], 'transicion_invalida')

    def test_aprobar_pide_motivo(self):
        # HU-044: la decisión del docente siempre lleva motivo, también al aprobar.
        solicitud_id = self.solicitar().data['id']
        for datos in ({}, {'motivo': ''}, {'motivo': '   '}):
            response = self.revisar(solicitud_id, 'aprobar', **datos)
            self.assertEqual(response.status_code, 400)
            self.assertIn('motivo', response.data['errors'])
        self.assertEqual(SolicitudTutor.objects.get(pk=solicitud_id).estado, 'PENDIENTE')

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
        # No la ve, así que responde 404.
        self.assertEqual(self.revisar(solicitud_id, 'aprobar', usuario=otro).status_code, 404)
        self.assertEqual(self.revisar(solicitud_id, 'aprobar', usuario=self.estudiante).status_code, 403)

    def test_coordinacion_solo_revisa_si_la_materia_no_tiene_docente(self):
        solicitud_id = self.solicitar().data['id']
        coordinador = crear_usuario('Coordinador')
        self.assertEqual(self.revisar(solicitud_id, 'aprobar', usuario=coordinador).status_code, 403)

        self.docente.materias_asignadas.all().delete()
        self.assertEqual(self.revisar(solicitud_id, 'aprobar', usuario=coordinador, motivo='Sin docente asignado.').status_code, 200)

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


class HistorialMateriasTests(APITestCase):
    """GT-269: materias cursadas, su nota y si cumplen para ser tutor."""
    URL = '/api/tutores/historial-materias/'

    @classmethod
    def setUpTestData(cls):
        programa, cls.periodo, _ = crear_catalogo()
        cls.anterior = PeriodoAcademico.objects.create(
            codigo='ANT', fecha_inicio=date.today() - timedelta(days=200), fecha_fin=date.today() - timedelta(days=60)
        )
        cls.estudiante = crear_usuario('Estudiante')
        cls.estudiante.semestre = 6
        cls.estudiante.save(update_fields=['semestre'])
        cls.docente = crear_usuario('Docente')

        def materia(codigo, semestre, cortes, docente=True):
            m = Materia.objects.create(codigo=codigo, nombre=f'Materia {codigo}', semestre=semestre, programa=programa)
            if docente:
                asignar_materia(cls.docente, m, cls.periodo)
            Inscripcion.objects.create(
                estudiante=cls.estudiante, materia=m, periodo=cls.anterior,
                nota_corte1=cortes[0], nota_corte2=cortes[1], nota_corte3=cortes[2],
            )
            return m

        cls.elegible = materia('ELE', 3, ('4.5', '4.5', '4.5'))
        cls.nota_baja = materia('BAJ', 3, ('3.5', '3.5', '3.5'))
        cls.reprobada = materia('REP', 2, ('2.0', '2.0', '2.0'))
        cls.sin_nota = materia('SIN', 2, ('4.5', None, None))
        cls.poco_avance = materia('AVA', 5, ('5.0', '5.0', '5.0'))
        cls.sin_docente = materia('DOC', 1, ('5.0', '5.0', '5.0'), docente=False)
        # Una materia del periodo activo todavía no cuenta como cursada.
        Inscripcion.objects.create(estudiante=cls.estudiante, materia=cls.elegible, periodo=cls.periodo)

    def setUp(self):
        self.client.force_authenticate(self.estudiante)

    def materias(self, response=None):
        response = response or self.client.get(self.URL)
        return {m['codigo']: m for m in response.data['materias']}

    def test_forma_de_la_respuesta(self):
        response = self.client.get(self.URL)
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual((response.data['semestre'], response.data['periodo_codigo']), (6, self.periodo.codigo))
        self.assertEqual(response.data['config'], {
            'semestre_minimo_tutor': 3, 'nota_minima': '4.00', 'diferencia_semestres': 2, 'nota_aprobatoria': '3.00',
        })
        self.assertEqual(response.data['resumen'], {'materias_aprobadas': 4, 'elegibles': 1})
        self.assertEqual(len(response.data['materias']), 6)

        ele = self.materias(response)['ELE']
        self.assertEqual((ele['nota'], ele['semestre_cursado'], ele['aprobada'], ele['elegible']), ('4.50', 3, True, True))
        self.assertIsNone(ele['motivo'])
        self.assertIsNone(ele['solicitud'])
        self.assertEqual(ele['requisitos'], {
            'semestre': {'cumple': True, 'valor': 6, 'minimo': 3},
            'nota': {'cumple': True, 'valor': '4.50', 'minimo': '4.00'},
            'avance': {'cumple': True, 'valor': 3, 'minimo': 2},
        })

    def test_motivos_de_no_elegible(self):
        materias = self.materias()
        self.assertIn('menor que la mínima', materias['BAJ']['motivo'])
        self.assertTrue(materias['BAJ']['aprobada'])
        self.assertFalse(materias['REP']['aprobada'])
        self.assertIsNone(materias['SIN']['nota'])
        self.assertIn('nota final registrada', materias['SIN']['motivo'])
        self.assertFalse(materias['AVA']['requisitos']['avance']['cumple'])
        self.assertIn('semestres por delante', materias['AVA']['motivo'])
        self.assertIn('no tiene docente', materias['DOC']['motivo'])

    def test_semestre_insuficiente(self):
        self.estudiante.semestre = 2
        self.estudiante.save(update_fields=['semestre'])
        materias = self.materias()
        self.assertFalse(any(m['elegible'] for m in materias.values()))
        self.assertFalse(materias['ELE']['requisitos']['semestre']['cumple'])

    def test_muestra_la_solicitud_vigente(self):
        solicitud = SolicitudTutor.objects.create(
            estudiante=self.estudiante, materia=self.elegible, periodo=self.periodo,
            nota_corte1=Decimal('4.5'), nota_corte2=Decimal('4.5'), nota_corte3=Decimal('4.5'), nota_final=Decimal('4.5'),
        )
        self.assertEqual(self.materias()['ELE']['solicitud']['id'], solicitud.id)
        SolicitudTutor.objects.filter(pk=solicitud.pk).update(estado='RECHAZADA')
        self.assertIsNone(self.materias()['ELE']['solicitud'])

    def test_si_la_repitio_cuenta_la_ultima_vez(self):
        mas_antiguo = PeriodoAcademico.objects.create(
            codigo='VIE', fecha_inicio=date.today() - timedelta(days=500), fecha_fin=date.today() - timedelta(days=400)
        )
        Inscripcion.objects.create(
            estudiante=self.estudiante, materia=self.nota_baja, periodo=mas_antiguo,
            nota_corte1=Decimal(5), nota_corte2=Decimal(5), nota_corte3=Decimal(5),
        )
        self.assertEqual(self.materias()['BAJ']['nota'], '3.50')

    def test_solo_estudiantes_y_periodo_valido(self):
        self.assertEqual(self.client.get(self.URL, {'periodo': 'abc'}).status_code, 400)
        self.assertEqual(self.client.get(self.URL, {'periodo': 999999}).status_code, 404)
        self.client.force_authenticate(self.docente)
        self.assertEqual(self.client.get(self.URL).status_code, 403)
