from datetime import date, time, timedelta

from django.core import mail
from rest_framework.test import APITestCase

from apps.accounts.pruebas import crear_bloque, crear_catalogo, crear_tutoria, crear_usuario
from apps.catalogo.models import PeriodoAcademico

from .models import BloqueDisponibilidad

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

    def test_bloque_sin_tutorias_se_borra(self):
        bloque = crear_bloque(self.docente, self.periodo, self.materia)
        self.client.force_authenticate(self.docente)
        response = self.client.delete(f'/api/disponibilidad/{bloque.id}/actualizar/')
        self.assertEqual(response.status_code, 204)
        self.assertFalse(BloqueDisponibilidad.objects.filter(pk=bloque.pk).exists())

    def test_docente_no_borra_bloques_ajenos(self):
        bloque = crear_bloque(crear_usuario('Docente'), self.periodo, self.materia)
        self.client.force_authenticate(self.docente)
        self.assertEqual(self.client.delete(f'/api/disponibilidad/{bloque.id}/actualizar/').status_code, 403)


class ReglasDisponibilidadTests(APITestCase):
    """PR3: BE-10, BE-11, BE-12, nombres en el bloque, ?docente=me y
    cancelación de un bloque con reservas."""

    @classmethod
    def setUpTestData(cls):
        cls.docente = crear_usuario('Docente')
        cls.estudiante = crear_usuario('Estudiante')
        _, cls.periodo, cls.materia = crear_catalogo()

    def setUp(self):
        self.client.force_authenticate(self.docente)

    def datos(self, **cambios):
        datos = {
            'materia': self.materia.id,
            'periodo': self.periodo.id,
            'fecha': str(date.today() + timedelta(days=3)),
            'hora_inicio': '10:00',
            'hora_fin': '11:00',
            'modalidad': 'VIRTUAL',
            'cupo_total': 3,
        }
        datos.update(cambios)
        return datos

    # BE-10
    def test_rechaza_fechas_pasadas(self):
        response = self.client.post(URL, self.datos(fecha=str(date.today() - timedelta(days=1))), format='json')
        self.assertEqual(response.status_code, 400)
        self.assertIn('fecha', response.data)

    def test_rechaza_fechas_fuera_del_periodo(self):
        response = self.client.post(URL, self.datos(fecha=str(self.periodo.fecha_fin + timedelta(days=1))), format='json')
        self.assertEqual(response.status_code, 400)
        self.assertIn('fecha', response.data)

    def test_rechaza_periodos_inactivos(self):
        _, periodo, _ = crear_catalogo()
        PeriodoAcademico.objects.filter(pk=periodo.pk).update(activo=False)
        response = self.client.post(URL, self.datos(periodo=periodo.id), format='json')
        self.assertEqual(response.status_code, 400)
        self.assertIn('periodo', response.data)

    # BE-11
    def test_editar_no_cambia_dueno_estado_ni_cupo_ocupado(self):
        bloque = crear_bloque(self.docente, self.periodo, self.materia)
        otro = crear_usuario('Docente')
        response = self.client.patch(
            f'/api/disponibilidad/{bloque.id}/actualizar/',
            {'docente': otro.id, 'estado': 'CERRADO', 'cupo_ocupado': 2, 'lugar': 'Aula 204'},
            format='json'
        )
        self.assertEqual(response.status_code, 200, response.data)
        bloque.refresh_from_db()
        self.assertEqual(
            (bloque.docente_id, bloque.estado, bloque.cupo_ocupado, bloque.lugar),
            (self.docente.id, 'DISPONIBLE', 0, 'Aula 204')
        )

    def test_conflicto_de_horario(self):
        crear_bloque(self.docente, self.periodo, self.materia, fecha=date.today() + timedelta(days=3),
                     hora_inicio=time(10, 30), hora_fin=time(11, 30))
        self.assertEqual(self.client.post(URL, self.datos(), format='json').status_code, 400)

    # BE-12
    def test_bloque_cancelado_no_genera_conflicto(self):
        crear_bloque(self.docente, self.periodo, self.materia, fecha=date.today() + timedelta(days=3),
                     hora_inicio=time(10, 30), hora_fin=time(11, 30), estado='CANCELADO')
        response = self.client.post(URL, self.datos(), format='json')
        self.assertEqual(response.status_code, 201, response.data)

    def test_bloque_trae_nombres_de_materia_y_docente(self):
        response = self.client.post(URL, self.datos(), format='json')
        self.assertEqual(response.data['materia_nombre'], self.materia.nombre)
        self.assertEqual(response.data['docente_nombre'], self.docente.get_full_name())

    def test_filtro_docente_me(self):
        crear_bloque(self.docente, self.periodo, self.materia)
        crear_bloque(crear_usuario('Docente'), self.periodo, self.materia)
        response = self.client.get(URL, {'docente': 'me'})
        self.assertEqual({b['docente'] for b in response.data}, {self.docente.id})

    def test_cancelar_bloque_con_reservas_cancela_tutorias_y_avisa(self):
        bloque = crear_bloque(self.docente, self.periodo, self.materia, cupo_ocupado=1)
        tutoria = crear_tutoria(bloque, self.estudiante)
        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.delete(
                f'/api/disponibilidad/{bloque.id}/actualizar/', {'motivo': 'Incapacidad médica'}, format='json'
            )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['tutorias_canceladas'], 1)

        bloque.refresh_from_db()
        tutoria.refresh_from_db()
        self.assertEqual(bloque.estado, 'CANCELADO')
        self.assertEqual(tutoria.estado, 'CANCELADA_DOCENTE')
        self.assertEqual(tutoria.cancelaciones.get().origen, 'DOCENTE')
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, [self.estudiante.email])
