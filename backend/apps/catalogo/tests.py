from contextlib import redirect_stdout
from datetime import date, timedelta
from io import StringIO

from django.db import connection
from django.db.migrations.executor import MigrationExecutor
from django.test import TransactionTestCase
from rest_framework.test import APITestCase

from apps.accounts.pruebas import (
    crear_bloque,
    crear_catalogo,
    crear_tutoria,
    crear_usuario,
)

from .models import (
    Configuracion,
    DocenteMateria,
    Inscripcion,
    Materia,
    PeriodoAcademico,
)


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

    # BE-25
    def test_activar_un_periodo_desactiva_los_demas(self):
        self.client.force_authenticate(self.coordinador)
        response = self.client.post('/api/catalogo/periodos/', {
            'codigo': '2027-1', 'fecha_inicio': '2027-01-20', 'fecha_fin': '2027-06-10', 'activo': True,
        }, format='json')
        self.assertEqual(response.status_code, 201, response.data)
        self.periodo.refresh_from_db()
        self.assertFalse(self.periodo.activo)
        self.assertEqual(PeriodoAcademico.objects.filter(activo=True).count(), 1)

        response = self.client.patch(f'/api/catalogo/periodos/{self.periodo.id}/', {'activo': True}, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(list(PeriodoAcademico.objects.filter(activo=True)), [self.periodo])

    def test_asignar_materias_a_docentes(self):
        docente = crear_usuario('Docente')
        datos = {'docente': docente.id, 'materia': self.materia.id, 'periodo': self.periodo.id}

        self.client.force_authenticate(self.estudiante)
        self.assertEqual(self.client.post('/api/catalogo/docentes-materias/', datos, format='json').status_code, 403)

        self.client.force_authenticate(self.coordinador)
        response = self.client.post('/api/catalogo/docentes-materias/', datos, format='json')
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data['materia_nombre'], self.materia.nombre)

        repetida = self.client.post('/api/catalogo/docentes-materias/', datos, format='json')
        self.assertEqual(repetida.status_code, 400)

        otro = dict(datos, docente=self.estudiante.id)
        self.assertEqual(self.client.post('/api/catalogo/docentes-materias/', otro, format='json').status_code, 400)

        self.client.force_authenticate(docente)
        response = self.client.get('/api/catalogo/docentes-materias/', {'docente': 'me'})
        self.assertEqual(len(response.data), 1)

    def test_inscribir_estudiantes(self):
        datos = {'estudiante': self.estudiante.id, 'materia': self.materia.id, 'periodo': self.periodo.id}
        self.client.force_authenticate(self.coordinador)
        response = self.client.post('/api/catalogo/inscripciones/', datos, format='json')
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(self.client.delete(f"/api/catalogo/inscripciones/{response.data['id']}/").status_code, 204)

    def test_periodo_con_tutorias_responde_409(self):
        bloque = crear_bloque(crear_usuario('Docente'), self.periodo, self.materia)
        crear_tutoria(bloque, self.estudiante)
        self.client.force_authenticate(self.coordinador)
        response = self.client.delete(f'/api/catalogo/periodos/{self.periodo.id}/')
        self.assertEqual(response.status_code, 409)


class MigracionPeriodoActivoTests(TransactionTestCase):
    """catalogo/0002 no falla si la base ya tiene varios periodos activos."""

    antes = [('catalogo', '0001_initial')]
    despues = [('catalogo', '0002_periodo_un_activo')]

    def tearDown(self):
        # Deja la base en la última migración para las demás pruebas.
        MigrationExecutor(connection).migrate(MigrationExecutor(connection).loader.graph.leaf_nodes())

    def test_deja_activo_solo_el_mas_reciente(self):
        executor = MigrationExecutor(connection)
        executor.migrate(self.antes)
        Periodo = executor.loader.project_state(self.antes).apps.get_model('catalogo', 'PeriodoAcademico')
        for codigo, inicio in (('2025-2', date(2025, 7, 1)), ('2026-1', date(2026, 1, 15)), ('2026-2', date(2026, 7, 1))):
            Periodo.objects.create(codigo=codigo, fecha_inicio=inicio, fecha_fin=inicio + timedelta(days=150), activo=True)

        executor = MigrationExecutor(connection)
        executor.loader.build_graph()
        with redirect_stdout(StringIO()):
            executor.migrate(self.despues)

        Periodo = executor.loader.project_state(self.despues).apps.get_model('catalogo', 'PeriodoAcademico')
        self.assertEqual(list(Periodo.objects.filter(activo=True).values_list('codigo', flat=True)), ['2026-2'])


class RevisionCatalogoTests(APITestCase):
    """Pendientes de la revisión de #50 y #52 en el catálogo."""

    @classmethod
    def setUpTestData(cls):
        cls.coordinador = crear_usuario('Coordinador')
        cls.estudiante = crear_usuario('Estudiante')
        cls.programa, cls.periodo, cls.materia = crear_catalogo()

    def setUp(self):
        self.client.force_authenticate(self.coordinador)

    def borrar_materia(self, materia):
        return self.client.delete(f'/api/catalogo/materias/{materia.id}/')

    def test_materia_con_bloques_responde_409(self):
        crear_bloque(crear_usuario('Docente'), self.periodo, self.materia)
        self.assertEqual(self.borrar_materia(self.materia).status_code, 409)
        self.assertTrue(Materia.objects.filter(pk=self.materia.pk).exists())

    def test_materia_con_inscripciones_responde_409(self):
        Inscripcion.objects.create(estudiante=self.estudiante, materia=self.materia, periodo=self.periodo)
        self.assertEqual(self.borrar_materia(self.materia).status_code, 409)

    def test_materia_sin_dependencias_se_borra(self):
        nueva = Materia.objects.create(programa=self.programa, codigo='NUEVA1', nombre='Nueva', semestre=1)
        self.assertEqual(self.borrar_materia(nueva).status_code, 204)

    def test_estudiante_ve_solo_sus_inscripciones(self):
        otro = crear_usuario('Estudiante')
        Inscripcion.objects.create(estudiante=self.estudiante, materia=self.materia, periodo=self.periodo)
        ajena = Inscripcion.objects.create(estudiante=otro, materia=self.materia, periodo=self.periodo)

        self.client.force_authenticate(self.estudiante)
        datos = self.client.get('/api/catalogo/inscripciones/').data
        self.assertEqual([i['estudiante'] for i in datos], [self.estudiante.id])
        self.assertEqual(self.client.get(f'/api/catalogo/inscripciones/{ajena.id}/').status_code, 404)

    def test_filtros_con_texto_responden_400(self):
        for url in ('/api/catalogo/docentes-materias/', '/api/catalogo/inscripciones/'):
            with self.subTest(url=url):
                self.assertEqual(self.client.get(url, {'materia': 'abc'}).status_code, 400)


class ConfiguracionTests(APITestCase):
    """Sección 7.1: parámetros de las reglas en una sola fila editable."""
    URL = '/api/catalogo/configuracion/'

    def test_valores_por_defecto(self):
        self.client.force_authenticate(crear_usuario('Estudiante'))
        response = self.client.get(self.URL)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['nota_minima'], '4.00')
        self.assertEqual(response.data['cupos_semanales_tutor'], 10)
        self.assertEqual(response.data['calificacion_maxima'], 10)

    def test_solo_coordinacion_y_administrador_editan(self):
        self.client.force_authenticate(crear_usuario('Estudiante'))
        self.assertEqual(self.client.patch(self.URL, {'cupos_semanales_tutor': 8}, format='json').status_code, 403)

        for grupo in ('Coordinador', 'Administrador'):
            with self.subTest(grupo=grupo):
                self.client.force_authenticate(crear_usuario(grupo))
                response = self.client.patch(self.URL, {'cupos_semanales_tutor': 8}, format='json')
                self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(Configuracion.actual().cupos_semanales_tutor, 8)
        self.assertEqual(Configuracion.objects.count(), 1)

    def test_escala_no_se_sale_del_rango_de_la_base(self):
        self.client.force_authenticate(crear_usuario('Coordinador'))
        response = self.client.patch(self.URL, {'calificacion_maxima': 20}, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertIn('calificacion_maxima', response.data['errors'])

    def test_pesos_suman_100(self):
        self.client.force_authenticate(crear_usuario('Coordinador'))
        response = self.client.patch(self.URL, {'peso_corte3': 50}, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertIn('peso_corte3', response.data['errors'])


class AsignarVariasMateriasTests(APITestCase):
    """GT-251 y GT-252: varias materias a un docente en una sola petición."""
    URL = '/api/catalogo/docentes-materias/asignar/'

    @classmethod
    def setUpTestData(cls):
        cls.coordinador = crear_usuario('Coordinador')
        cls.docente = crear_usuario('Docente')
        cls.programa, cls.periodo, cls.materia = crear_catalogo()
        cls.otras = [
            Materia.objects.create(codigo=f'AV-{n}', nombre=f'Materia {n}', programa=cls.programa) for n in range(2)
        ]

    def setUp(self):
        self.client.force_authenticate(self.coordinador)

    def asignar(self, materias, **extra):
        return self.client.post(self.URL, {'docente': self.docente.id, 'materias': materias, **extra}, format='json')

    def test_asigna_varias_en_el_periodo_activo(self):
        ids = [self.materia.id] + [m.id for m in self.otras]
        response = self.asignar(ids)
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(sorted(a['materia'] for a in response.data), sorted(ids))
        self.assertEqual({a['periodo'] for a in response.data}, {self.periodo.id})
        self.assertEqual(DocenteMateria.objects.filter(docente=self.docente).count(), 3)

    def test_si_una_ya_existe_no_crea_ninguna(self):
        DocenteMateria.objects.create(docente=self.docente, materia=self.materia, periodo=self.periodo)
        response = self.asignar([self.materia.id, self.otras[0].id])
        self.assertEqual(response.status_code, 400)
        self.assertIn(self.materia.nombre, response.data['errors']['materias'][0])
        self.assertEqual(DocenteMateria.objects.filter(docente=self.docente).count(), 1)

    def test_rechaza_repetidas_vacia_o_inexistentes(self):
        self.assertEqual(self.asignar([self.materia.id, self.materia.id]).status_code, 400)
        self.assertEqual(self.asignar([]).status_code, 400)
        self.assertEqual(self.asignar([999999]).status_code, 400)
        self.assertFalse(DocenteMateria.objects.filter(docente=self.docente).exists())

    def test_solo_docentes_y_solo_coordinacion(self):
        estudiante = crear_usuario('Estudiante')
        response = self.client.post(self.URL, {'docente': estudiante.id, 'materias': [self.materia.id]}, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertIn('docente', response.data['errors'])

        self.client.force_authenticate(self.docente)
        self.assertEqual(self.asignar([self.materia.id]).status_code, 403)

    def test_periodo_explicito(self):
        anterior = PeriodoAcademico.objects.create(
            codigo='ANT', fecha_inicio=date(2020, 1, 1), fecha_fin=date(2020, 6, 1)
        )
        response = self.asignar([self.materia.id], periodo=anterior.id)
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data[0]['periodo'], anterior.id)
