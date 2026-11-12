from datetime import date, time, timedelta

from django.core import mail
from rest_framework.test import APITestCase

from apps.accounts.pruebas import (
    asignar_materia,
    crear_bloque,
    crear_catalogo,
    crear_tutoria,
    crear_usuario,
)
from apps.catalogo.models import DocenteMateria, Materia, PeriodoAcademico

from .models import BloqueDisponibilidad

URL = '/api/disponibilidad/disponibilidad/'


class PermisosDisponibilidadTests(APITestCase):
    """PR2: BE-05 y el 500 al borrar un bloque con tutorías."""

    @classmethod
    def setUpTestData(cls):
        cls.docente = crear_usuario('Docente')
        cls.estudiante = crear_usuario('Estudiante')
        _, cls.periodo, cls.materia = crear_catalogo()
        asignar_materia(cls.docente, cls.materia, cls.periodo)

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
        asignar_materia(cls.docente, cls.materia, cls.periodo)

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
        self.assertIn('fecha', response.data['errors'])

    def test_rechaza_fechas_fuera_del_periodo(self):
        response = self.client.post(URL, self.datos(fecha=str(self.periodo.fecha_fin + timedelta(days=1))), format='json')
        self.assertEqual(response.status_code, 400)
        self.assertIn('fecha', response.data['errors'])

    def test_rechaza_periodos_inactivos(self):
        _, periodo, _ = crear_catalogo()
        PeriodoAcademico.objects.filter(pk=periodo.pk).update(activo=False)
        response = self.client.post(URL, self.datos(periodo=periodo.id), format='json')
        self.assertEqual(response.status_code, 400)
        self.assertIn('periodo', response.data['errors'])

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

    def test_no_se_borra_un_bloque_que_ya_empezo(self):
        bloque = crear_bloque(self.docente, self.periodo, self.materia,
                              fecha=date.today() - timedelta(days=2), cupo_ocupado=1)
        tutoria = crear_tutoria(bloque, self.estudiante)
        response = self.client.delete(f'/api/disponibilidad/{bloque.id}/actualizar/')
        self.assertEqual(response.status_code, 400)
        self.assertIn('bloque ya inició', response.data['detail'])
        bloque.refresh_from_db()
        tutoria.refresh_from_db()
        self.assertEqual(bloque.estado, 'DISPONIBLE')
        self.assertEqual(tutoria.estado, 'RESERVADA')

    def test_subir_el_cupo_vuelve_a_dejar_disponible(self):
        bloque = crear_bloque(self.docente, self.periodo, self.materia,
                              cupo_total=1, cupo_ocupado=1, estado='COMPLETO')
        response = self.client.patch(f'/api/disponibilidad/{bloque.id}/actualizar/', {'cupo_total': 3}, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['estado'], 'DISPONIBLE')

    def test_bajar_el_cupo_hasta_el_ocupado_deja_completo(self):
        bloque = crear_bloque(self.docente, self.periodo, self.materia, cupo_total=3, cupo_ocupado=2)
        response = self.client.patch(f'/api/disponibilidad/{bloque.id}/actualizar/', {'cupo_total': 2}, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['estado'], 'COMPLETO')

class ListadoBloquesTests(APITestCase):
    """PR5: BE-27 (rango por defecto y filtros) y paginación opcional."""

    @classmethod
    def setUpTestData(cls):
        cls.docente = crear_usuario('Docente')
        _, periodo, materia = crear_catalogo()
        hoy = date.today()
        cls.pasado = crear_bloque(cls.docente, periodo, materia, fecha=hoy - timedelta(days=2))
        cls.cancelado = crear_bloque(cls.docente, periodo, materia, fecha=hoy + timedelta(days=1), estado='CANCELADO')
        cls.futuros = [
            crear_bloque(cls.docente, periodo, materia, fecha=hoy + timedelta(days=dias))
            for dias in range(1, 26)
        ]

    def setUp(self):
        self.client.force_authenticate(self.docente)

    def ids(self, response):
        datos = response.data['results'] if isinstance(response.data, dict) else response.data
        return {b['id'] for b in datos}

    def test_por_defecto_solo_futuros_y_no_cancelados(self):
        response = self.client.get(URL)
        self.assertIsInstance(response.data, list)
        self.assertEqual(self.ids(response), {b.id for b in self.futuros})

    def test_incluir_pasados_y_cancelados(self):
        ids = self.ids(self.client.get(URL, {'incluir_pasados': 1}))
        self.assertIn(self.pasado.id, ids)
        self.assertIn(self.cancelado.id, self.ids(self.client.get(URL, {'estado': 'CANCELADO'})))

    def test_rango_desde_hasta(self):
        hoy = date.today()
        response = self.client.get(URL, {'desde': hoy - timedelta(days=3), 'hasta': hoy + timedelta(days=2)})
        self.assertEqual(self.ids(response), {self.pasado.id, self.futuros[0].id, self.futuros[1].id})

    def test_paginacion_solo_con_page(self):
        response = self.client.get(URL, {'page': 1})
        self.assertEqual(response.data['count'], 25)
        self.assertEqual(len(response.data['results']), 20)
        self.assertEqual(len(self.client.get(URL, {'page': 2}).data['results']), 5)
        self.assertEqual(len(self.client.get(URL, {'page': 1, 'page_size': 500}).data['results']), 25)

    def test_filtro_docente_invalido_no_devuelve_nada(self):
        self.assertEqual(self.client.get(URL, {'docente': 'abc'}).data, [])


class RevisionDisponibilidadTests(APITestCase):
    """Pendientes de la revisión de #53 y de la auditoría en bloques."""

    @classmethod
    def setUpTestData(cls):
        cls.docente = crear_usuario('Docente')
        _, cls.periodo, cls.materia = crear_catalogo()
        asignar_materia(cls.docente, cls.materia, cls.periodo)

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

    def test_bloque_sin_materia_responde_400(self):
        datos = self.datos()
        del datos['materia']
        response = self.client.post(URL, datos, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertIn('materia', response.data['errors'])

    def test_materia_no_asignada_responde_400(self):
        otra = Materia.objects.create(programa=self.materia.programa, codigo='FIS-1', nombre='Física I', semestre=1)
        response = self.client.post(URL, self.datos(materia=otra.id), format='json')
        self.assertEqual(response.status_code, 400)
        self.assertIn('materia', response.data['errors'])

    def test_hasta_sin_desde_incluye_pasados(self):
        pasado = crear_bloque(self.docente, self.periodo, self.materia, fecha=date.today() - timedelta(days=2))
        response = self.client.get(URL, {'hasta': date.today() - timedelta(days=1)})
        self.assertEqual([b['id'] for b in response.data], [pasado.id])

    # La asignación solo se revisa si cambian la materia o el periodo.
    def test_editar_el_lugar_sin_tener_ya_la_asignacion(self):
        bloque = crear_bloque(self.docente, self.periodo, self.materia)
        DocenteMateria.objects.filter(docente=self.docente).delete()
        response = self.client.patch(f'/api/disponibilidad/{bloque.id}/actualizar/', {'lugar': 'Sala 2'}, format='json')
        self.assertEqual(response.status_code, 200, response.data)

    def test_cambiar_a_una_materia_no_asignada_responde_400(self):
        bloque = crear_bloque(self.docente, self.periodo, self.materia)
        otra = Materia.objects.create(programa=self.materia.programa, codigo='FIS-2', nombre='Física II', semestre=2)
        response = self.client.patch(f'/api/disponibilidad/{bloque.id}/actualizar/', {'materia': otra.id}, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertIn('materia', response.data['errors'])

    def test_cupo_fuera_de_rango_responde_400(self):
        response = self.client.post(URL, self.datos(cupo_total=99999), format='json')
        self.assertEqual(response.status_code, 400)


class HorarioConReservasTests(APITestCase):
    """Opción B: un horario con reservas activas no se mueve; se suspende y se publica otro."""

    @classmethod
    def setUpTestData(cls):
        cls.docente = crear_usuario('Docente')
        cls.estudiante = crear_usuario('Estudiante')
        _, cls.periodo, cls.materia = crear_catalogo()
        cls.otra_materia = Materia.objects.create(codigo='HR-2', nombre='Física', programa=cls.materia.programa)
        asignar_materia(cls.docente, cls.otra_materia, cls.periodo)

    def setUp(self):
        self.client.force_authenticate(self.docente)
        self.bloque = crear_bloque(self.docente, self.periodo, self.materia, lugar='Sala 1')

    def url(self):
        return f'/api/disponibilidad/{self.bloque.id}/actualizar/'

    def formulario(self, **cambios):
        b = self.bloque
        datos = {
            'materia': b.materia_id, 'periodo': b.periodo_id, 'fecha': str(b.fecha),
            'hora_inicio': b.hora_inicio.strftime('%H:%M'), 'hora_fin': b.hora_fin.strftime('%H:%M'),
            'modalidad': b.modalidad, 'lugar': b.lugar, 'enlace_virtual': b.enlace_virtual,
            'cupo_total': b.cupo_total, 'observaciones': b.observaciones,
        }
        datos.update(cambios)
        return datos

    def test_con_reserva_no_se_mueve(self):
        crear_tutoria(self.bloque, self.estudiante, estado='RESERVADA')
        cambios = {
            'fecha': str(self.bloque.fecha + timedelta(days=1)),
            'hora_inicio': '10:00',
            'hora_fin': '12:00',
            'materia': self.otra_materia.id,
            'modalidad': 'VIRTUAL',
        }
        for campo, valor in cambios.items():
            with self.subTest(campo=campo):
                response = self.client.patch(self.url(), {campo: valor}, format='json')
                self.assertEqual(response.status_code, 400)
                self.assertEqual(response.data['code'], 'bloque_con_reservas')
                self.assertIn(campo, response.data['errors'])
        self.bloque.refresh_from_db()
        self.assertEqual(self.bloque.materia, self.materia)

    def test_con_reserva_confirmada_tampoco(self):
        crear_tutoria(self.bloque, self.estudiante, estado='CONFIRMADA')
        response = self.client.patch(self.url(), {'hora_inicio': '07:00'}, format='json')
        self.assertEqual(response.data['code'], 'bloque_con_reservas')

    def test_con_reserva_cambia_lugar_enlace_observaciones_y_sube_cupo(self):
        crear_tutoria(self.bloque, self.estudiante, estado='RESERVADA')
        cambios = {'lugar': 'Sala 2', 'enlace_virtual': 'https://meet.example.com/x', 'observaciones': 'Traer taller',
                   'cupo_total': self.bloque.cupo_total + 2}
        response = self.client.patch(self.url(), cambios, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['lugar'], 'Sala 2')

    def test_formulario_completo_con_la_misma_fecha_y_hora(self):
        # El frontend manda todo el formulario: repetir los valores guardados no es un cambio.
        crear_tutoria(self.bloque, self.estudiante, estado='RESERVADA')
        response = self.client.put(self.url(), self.formulario(lugar='Sala 3'), format='json')
        self.assertEqual(response.status_code, 200, response.data)

    def test_sin_reservas_se_puede_mover(self):
        response = self.client.patch(self.url(), {'hora_inicio': '10:00', 'hora_fin': '11:00'}, format='json')
        self.assertEqual(response.status_code, 200, response.data)

    def test_reservas_canceladas_no_cuentan(self):
        for estado in ('CANCELADA_ESTUDIANTE', 'CANCELADA_DOCENTE', 'ANULADA'):
            crear_tutoria(self.bloque, crear_usuario('Estudiante'), estado=estado)
        response = self.client.patch(self.url(), {'fecha': str(self.bloque.fecha + timedelta(days=1))}, format='json')
        self.assertEqual(response.status_code, 200, response.data)
