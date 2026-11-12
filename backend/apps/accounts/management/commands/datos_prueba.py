"""
Carga datos de prueba para desarrollo local.

Todos los datos son ficticios: los nombres de programas y materias siguen la
oferta típica de una universidad de ingeniería, pero códigos, personas,
documentos, teléfonos y correos son inventados. Los correos usan el dominio
reservado .test para que el sistema nunca le escriba a una persona real.

Uso:
    python manage.py datos_prueba           # carga si no hay datos de prueba
    python manage.py datos_prueba --reset   # borra los datos de prueba y los vuelve a crear
"""
import random
import unicodedata
from datetime import date, datetime, time, timedelta
from decimal import Decimal

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import make_password
from django.contrib.auth.models import Group
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from apps.catalogo.models import (
    Configuracion,
    DocenteMateria,
    Inscripcion,
    Materia,
    PeriodoAcademico,
    ProgramaAcademico,
)
from apps.disponibilidad.models import BloqueDisponibilidad
from apps.tutores.models import SolicitudTutor
from apps.tutores.services import docentes_revisores, evaluar_postulacion
from apps.tutorias.models import Cancelacion, EvaluacionTutoria, Tutoria

DOMINIO = 'aulalibre.test'
PASSWORD = 'Aula2026*'
GRUPOS = ['Estudiante', 'Docente', 'Coordinador', 'Administrador']

# (codigo, nombre, facultad, [(codigo, nombre, semestre, creditos, [temas])])
PROGRAMAS = [
    ('ISIS', 'Ingeniería de Sistemas', 'Facultad de Ingeniería', [
        ('ISIS-101', 'Programación I', 1, 3, ['Ciclos y condicionales', 'Funciones y parámetros', 'Arreglos']),
        ('ISIS-102', 'Cálculo Diferencial', 1, 4, ['Límites', 'Derivadas', 'Regla de la cadena']),
        ('ISIS-301', 'Estructuras de Datos', 3, 3, ['Listas enlazadas', 'Pilas y colas', 'Árboles binarios']),
        ('ISIS-401', 'Bases de Datos', 4, 3, ['Modelo entidad-relación', 'Normalización', 'Consultas SQL con JOIN']),
        ('ISIS-601', 'Ingeniería de Software', 6, 3, ['Historias de usuario', 'Diagramas UML', 'Pruebas unitarias']),
        ('ISIS-701', 'Redes de Computadores', 7, 3, ['Modelo OSI', 'Subredes IPv4', 'Enrutamiento estático']),
    ]),
    ('IIND', 'Ingeniería Industrial', 'Facultad de Ingeniería', [
        ('IIND-201', 'Cálculo Integral', 2, 4, ['Integración por partes', 'Fracciones parciales', 'Áreas entre curvas']),
        ('IIND-301', 'Estadística I', 3, 3, ['Medidas de tendencia central', 'Probabilidad', 'Distribución normal']),
        ('IIND-501', 'Investigación de Operaciones', 5, 3, ['Programación lineal', 'Método simplex', 'Análisis de sensibilidad']),
        ('IIND-601', 'Gestión de la Calidad', 6, 3, ['Control estadístico de procesos', 'Diagrama de Pareto', 'Norma ISO 9001']),
        ('IIND-701', 'Logística', 7, 3, ['Inventarios EOQ', 'Ruteo de vehículos', 'Cadena de suministro']),
    ]),
    ('IELE', 'Ingeniería Electrónica', 'Facultad de Ingeniería', [
        ('IELE-301', 'Física de Electricidad y Magnetismo', 3, 4, ['Ley de Coulomb', 'Campo eléctrico', 'Ley de Faraday']),
        ('IELE-302', 'Circuitos Eléctricos I', 3, 3, ['Leyes de Kirchhoff', 'Thevenin y Norton', 'Circuitos RC']),
        ('IELE-401', 'Electrónica Análoga', 4, 3, ['Diodos', 'Transistores BJT', 'Amplificadores operacionales']),
        ('IELE-402', 'Sistemas Digitales', 4, 3, ['Álgebra booleana', 'Mapas de Karnaugh', 'Flip-flops']),
    ]),
    ('IMEC', 'Ingeniería Mecánica', 'Facultad de Ingeniería', [
        ('IMEC-201', 'Física Mecánica', 2, 4, ['Cinemática', 'Leyes de Newton', 'Trabajo y energía']),
        ('IMEC-301', 'Estática', 3, 3, ['Diagramas de cuerpo libre', 'Armaduras', 'Centroides']),
        ('IMEC-501', 'Termodinámica', 5, 3, ['Primera ley', 'Ciclos de potencia', 'Entropía']),
        ('IMEC-502', 'Resistencia de Materiales', 5, 3, ['Esfuerzo y deformación', 'Torsión', 'Flexión de vigas']),
    ]),
    ('ADMI', 'Administración de Empresas', 'Facultad de Ciencias Económicas y Administrativas', [
        ('ADMI-101', 'Contabilidad General', 1, 3, ['Ecuación contable', 'Libro diario', 'Estados financieros']),
        ('ADMI-201', 'Microeconomía', 2, 3, ['Oferta y demanda', 'Elasticidad', 'Estructuras de mercado']),
        ('ADMI-301', 'Matemáticas Financieras', 3, 3, ['Interés compuesto', 'Anualidades', 'Tablas de amortización']),
        ('ADMI-401', 'Fundamentos de Mercadeo', 4, 3, ['Mezcla de mercadeo', 'Segmentación', 'Investigación de mercados']),
    ]),
    ('LENM', 'Lenguas Modernas', 'Facultad de Ciencias Sociales y Humanas', [
        ('LENM-101', 'Inglés I', 1, 3, ['Present simple', 'Vocabulario de rutinas', 'Listening básico']),
        ('LENM-201', 'Francés I', 2, 3, ['Presentarse en francés', 'Verbos être y avoir', 'Pronunciación']),
        ('LENM-202', 'Fonética', 2, 2, ['Alfabeto fonético', 'Vocales del inglés', 'Entonación']),
        ('LENM-301', 'Gramática Inglesa', 3, 3, ['Tiempos perfectos', 'Voz pasiva', 'Condicionales']),
    ]),
]

NOMBRES = [
    'Santiago', 'Valentina', 'Sebastián', 'Mariana', 'Mateo', 'Isabella', 'Nicolás', 'Daniela', 'Samuel',
    'Gabriela', 'Alejandro', 'Sara', 'Juan José', 'Laura', 'David', 'Paula', 'Felipe', 'Camila', 'Tomás',
    'Natalia', 'Andrés', 'Juliana', 'Esteban', 'Manuela', 'Diego', 'Luisa', 'Julián', 'Carolina',
]
APELLIDOS = [
    'Rodríguez', 'Gómez', 'González', 'Martínez', 'García', 'López', 'Hernández', 'Sánchez', 'Ramírez',
    'Pérez', 'Díaz', 'Moreno', 'Rojas', 'Vargas', 'Castro', 'Ortiz', 'Jiménez', 'Muñoz', 'Suárez',
    'Torres', 'Cárdenas', 'Mejía', 'Restrepo', 'Ospina', 'Quintero', 'Salazar', 'Patiño', 'Valencia',
]
HORARIOS = [(time(7, 0), time(8, 0)), (time(9, 0), time(10, 0)), (time(11, 0), time(12, 0)),
            (time(14, 0), time(15, 0)), (time(16, 0), time(17, 0)), (time(18, 30), time(19, 30))]
SALONES = ['Bloque A - Salón 204', 'Bloque B - Salón 301', 'Bloque C - Sala de tutorías', 'Biblioteca - Sala 2',
           'Bloque G - Laboratorio de cómputo 3']


def _slug(texto):
    texto = unicodedata.normalize('NFKD', texto).encode('ascii', 'ignore').decode()
    return texto.lower().replace(' ', '')


class Command(BaseCommand):
    help = 'Carga datos de prueba ficticios (usuarios, catálogo, disponibilidad y tutorías).'

    def add_arguments(self, parser):
        parser.add_argument('--reset', action='store_true', help='Borra los datos de prueba antes de cargarlos.')
        parser.add_argument('--force', action='store_true', help='Permite correrlo con DEBUG=False.')

    def handle(self, *args, **options):
        if not settings.DEBUG and not options['force']:
            raise CommandError('DEBUG está apagado. Estos datos son solo para desarrollo; usa --force si de verdad quieres cargarlos.')

        self.User = get_user_model()
        self.rng = random.Random(2026)
        self.hoy = timezone.now().date()

        with transaction.atomic():
            if options['reset']:
                self._borrar()
            elif self.User.objects.filter(email=f'estudiante@{DOMINIO}').exists():
                self.stdout.write('Los datos de prueba ya están cargados. Usa --reset para regenerarlos.')
                return

            grupos = {nombre: Group.objects.get_or_create(name=nombre)[0] for nombre in GRUPOS}
            Configuracion.actual()
            periodo, anterior = self._periodos()
            materias = self._catalogo()
            self.hash = make_password(PASSWORD)
            coordinadores, docentes, estudiantes = self._usuarios(grupos, materias)
            asignaciones = self._asignar_docentes(docentes, materias, periodo)
            inscritos = self._inscribir(estudiantes, materias, periodo)
            bloques = self._bloques(asignaciones, periodo)
            tutorias = self._tutorias(bloques, inscritos)
            solicitudes = self._solicitudes(estudiantes, materias, periodo, anterior, docentes)

        self.stdout.write(self.style.SUCCESS(
            f'Listo: {len(materias)} materias, {len(coordinadores)} coordinadores, {len(docentes)} docentes, '
            f'{len(estudiantes)} estudiantes, {len(bloques)} bloques, {tutorias} tutorías '
            f'y {solicitudes} solicitudes de tutor.'
        ))
        self.stdout.write(f'Contraseña de todos los usuarios: {PASSWORD}')
        self.stdout.write(f'Accesos rápidos: coordinador@{DOMINIO}, docente@{DOMINIO}, estudiante@{DOMINIO}')
        self.stdout.write(f'Administrador (coordinadores y /admin): admin@{DOMINIO}')

    def _borrar(self):
        usuarios = self.User.objects.filter(email__endswith=f'@{DOMINIO}')
        Tutoria.objects.filter(estudiante__in=usuarios).delete()
        Tutoria.objects.filter(bloque__docente__in=usuarios).delete()
        BloqueDisponibilidad.objects.filter(docente__in=usuarios).delete()
        usuarios.delete()
        self.stdout.write('Datos de prueba anteriores borrados.')

    def _periodos(self):
        # Semestre actual y el anterior, calculados a partir de la fecha de hoy.
        anio = self.hoy.year
        if self.hoy.month <= 6:
            actual = (f'{anio}-1', date(anio, 2, 2), date(anio, 6, 13))
            anterior = (f'{anio - 1}-2', date(anio - 1, 8, 3), date(anio - 1, 12, 5))
        else:
            actual = (f'{anio}-2', date(anio, 8, 3), date(anio, 12, 5))
            anterior = (f'{anio}-1', date(anio, 2, 2), date(anio, 6, 13))
        previo, _ = PeriodoAcademico.objects.update_or_create(
            codigo=anterior[0], defaults={'fecha_inicio': anterior[1], 'fecha_fin': anterior[2], 'activo': False})
        periodo, _ = PeriodoAcademico.objects.update_or_create(
            codigo=actual[0], defaults={'fecha_inicio': actual[1], 'fecha_fin': actual[2], 'activo': True})
        PeriodoAcademico.objects.exclude(pk=periodo.pk).filter(activo=True).update(activo=False)
        return periodo, previo

    def _catalogo(self):
        materias = []
        for codigo, nombre, facultad, lista in PROGRAMAS:
            programa, _ = ProgramaAcademico.objects.update_or_create(
                codigo=codigo, defaults={'nombre': nombre, 'facultad': facultad, 'activo': True})
            for m_codigo, m_nombre, semestre, creditos, temas in lista:
                materia, _ = Materia.objects.update_or_create(
                    codigo=m_codigo,
                    defaults={'nombre': m_nombre, 'semestre': semestre, 'creditos': creditos,
                              'programa': programa, 'activa': True})
                materia.temas = temas
                materias.append(materia)
        return materias

    def _crear_usuario(self, nombre, apellido, email, rol, grupo, documento, codigo=None, **extra):
        usuario = self.User.objects.create(
            username=email,
            email=email,
            password=self.hash,
            first_name=nombre,
            last_name=apellido,
            documento=documento,
            telefono=f'300000{documento[-4:]}',
            codigo_institucional=codigo,
            rol=rol,
            **extra,
        )
        usuario.groups.add(grupo)
        return usuario

    def _personas(self, cantidad, usados):
        personas = []
        while len(personas) < cantidad:
            nombre = self.rng.choice(NOMBRES)
            apellido = f'{self.rng.choice(APELLIDOS)} {self.rng.choice(APELLIDOS)}'
            base = f'{_slug(nombre)}.{_slug(apellido.split()[0])}'
            email, n = f'{base}@{DOMINIO}', 2
            while email in usados:
                email, n = f'{base}{n}@{DOMINIO}', n + 1
            usados.add(email)
            personas.append((nombre, apellido, email))
        return personas

    def _usuarios(self, grupos, materias):
        usados = {f'{r}@{DOMINIO}' for r in ('admin', 'coordinador', 'docente', 'estudiante')}
        doc = iter(range(9900000001, 9900001000))

        # RF-05: el administrador gestiona a los coordinadores (y entra a /admin).
        self._crear_usuario('Admin', 'Demo', f'admin@{DOMINIO}', 'Administrador', grupos['Administrador'],
                            str(next(doc)), is_staff=True, is_superuser=True)

        coordinadores = [self._crear_usuario(
            'Carolina', 'Mejía Restrepo', f'coordinador@{DOMINIO}', 'Coordinador', grupos['Coordinador'], str(next(doc)))]
        for nombre, apellido, email in self._personas(1, usados):
            coordinadores.append(self._crear_usuario(
                nombre, apellido, email, 'Coordinador', grupos['Coordinador'], str(next(doc))))

        docentes = [self._crear_usuario(
            'Andrés', 'Ospina Valencia', f'docente@{DOMINIO}', 'Docente', grupos['Docente'], str(next(doc)))]
        for nombre, apellido, email in self._personas(9, usados):
            docentes.append(self._crear_usuario(nombre, apellido, email, 'Docente', grupos['Docente'], str(next(doc))))

        programas = list(ProgramaAcademico.objects.filter(codigo__in=[p[0] for p in PROGRAMAS]).order_by('id'))
        estudiantes = []
        personas = [('Mariana', 'Torres Quintero', f'estudiante@{DOMINIO}')] + self._personas(41, usados)
        for i, (nombre, apellido, email) in enumerate(personas, start=1):
            programa = programas[0] if i == 1 else self.rng.choice(programas)
            usuario = self._crear_usuario(
                nombre, apellido, email, 'Estudiante', grupos['Estudiante'], str(next(doc)),
                codigo=f'{self.hoy.year}{programas.index(programa) + 1}{i:04d}',
                semestre=5 if i == 1 else self.rng.randint(1, 9))
            usuario.programa = programa
            estudiantes.append(usuario)
        return coordinadores, docentes, estudiantes

    def _asignar_docentes(self, docentes, materias, periodo):
        # Cada materia queda con un docente; el docente de acceso rápido toma las primeras de Sistemas.
        asignaciones = []
        for i, materia in enumerate(materias):
            docente = docentes[0] if i < 3 else docentes[1 + (i - 3) % (len(docentes) - 1)]
            asignaciones.append(DocenteMateria.objects.create(docente=docente, materia=materia, periodo=periodo))
        return asignaciones

    def _inscribir(self, estudiantes, materias, periodo):
        inscritos = {m.id: [] for m in materias}
        for estudiante in estudiantes:
            propias = [m for m in materias if m.programa_id == estudiante.programa.id]
            for materia in self.rng.sample(propias, k=min(len(propias), self.rng.randint(3, 4))):
                Inscripcion.objects.create(estudiante=estudiante, materia=materia, periodo=periodo)
                inscritos[materia.id].append(estudiante)
        return inscritos

    def _bloques(self, asignaciones, periodo):
        # Cuatro semanas hacia atrás y tres hacia adelante, para que haya historial y reservas próximas.
        desde = max(periodo.fecha_inicio, self.hoy - timedelta(days=28))
        hasta = min(periodo.fecha_fin, self.hoy + timedelta(days=21))
        bloques = []
        for asignacion in asignaciones:
            dias = self.rng.sample(range(6), k=2)
            horario = self.rng.choice(HORARIOS)
            dia = desde
            while dia <= hasta:
                if dia.weekday() in dias:
                    virtual = self.rng.random() < 0.4
                    futuro = dia >= self.hoy
                    bloques.append(BloqueDisponibilidad.objects.create(
                        docente=asignacion.docente,
                        materia=asignacion.materia,
                        periodo=periodo,
                        fecha=dia,
                        hora_inicio=horario[0],
                        hora_fin=horario[1],
                        modalidad='VIRTUAL' if virtual else 'PRESENCIAL',
                        lugar=None if virtual else self.rng.choice(SALONES),
                        enlace_virtual=f'https://meet.example.com/{asignacion.materia.codigo.lower()}' if virtual else None,
                        cupo_total=self.rng.choice([1, 2, 3, 4]),
                        estado='CANCELADO' if futuro and self.rng.random() < 0.05 else ('DISPONIBLE' if futuro else 'CERRADO'),
                        observaciones='Traer los ejercicios del taller resueltos.' if self.rng.random() < 0.2 else None,
                    ))
                dia += timedelta(days=1)
        return bloques

    def _tutorias(self, bloques, inscritos):
        total = 0
        for bloque in bloques:
            futuro = bloque.fecha >= self.hoy
            candidatos = inscritos.get(bloque.materia_id, [])
            if bloque.estado == 'CANCELADO' or not candidatos or self.rng.random() > (0.5 if futuro else 0.75):
                continue
            cupo = self.rng.randint(1, min(bloque.cupo_total, len(candidatos)))
            elegidos = self.rng.sample(candidatos, k=cupo)
            # La cuenta de acceso rápido recibe más tutorías para que la demo tenga historial.
            principal = candidatos[0] if candidatos[0].email == f'estudiante@{DOMINIO}' else None
            if principal and principal not in elegidos and self.rng.random() < 0.5:
                elegidos[0] = principal
            ocupados = 0
            for estudiante in elegidos:
                tutoria = self._tutoria(bloque, estudiante, futuro)
                total += 1
                if not tutoria.estado.startswith('CANCELADA'):
                    ocupados += 1
            bloque.cupo_ocupado = ocupados
            if futuro and ocupados >= bloque.cupo_total:
                bloque.estado = 'COMPLETO'
            bloque.save(update_fields=['cupo_ocupado', 'estado'])
        return total

    def _tutoria(self, bloque, estudiante, futuro):
        tema = self.rng.choice(bloque.materia.temas)
        r = self.rng.random()
        if futuro:
            estado = 'CANCELADA_ESTUDIANTE' if r < 0.1 else ('CONFIRMADA' if r < 0.45 else 'RESERVADA')
        else:
            estado = ('COMPLETADA' if r < 0.72 else 'NO_ASISTIO' if r < 0.86
                      else 'CANCELADA_ESTUDIANTE' if r < 0.96 else 'CANCELADA_DOCENTE')

        datos = {
            'codigo': f'TUT-{bloque.id}-{estudiante.id}',
            'bloque': bloque,
            'estudiante': estudiante,
            'tema': tema,
            'descripcion': f'Necesito repasar {tema.lower()} antes del parcial.' if self.rng.random() < 0.6 else None,
            'estado': estado,
        }
        # El proyecto usa USE_TZ = False, así que las fechas van sin zona horaria.
        inicio = datetime.combine(bloque.fecha, bloque.hora_inicio)
        fin = datetime.combine(bloque.fecha, bloque.hora_fin)
        if estado == 'COMPLETADA':
            retraso = self.rng.choice([0, 0, 0, 5, 10, 15])
            datos.update(
                asistencia='ASISTIO_TARDE' if retraso else 'ASISTIO',
                minutos_retraso=retraso,
                hora_inicio_real=inicio + timedelta(minutes=retraso),
                hora_fin_real=fin,
                notas_docente=f'Se trabajó {tema.lower()} con ejercicios guiados.',
                compromisos='Resolver los ejercicios pendientes del taller.' if self.rng.random() < 0.5 else None,
            )
        elif estado == 'NO_ASISTIO':
            datos['asistencia'] = 'NO_ASISTIO'

        tutoria = Tutoria.objects.create(**datos)

        if estado == 'COMPLETADA' and self.rng.random() < 0.7:
            # RF-09: escala de 1 a 10.
            calificacion = self.rng.choice([10, 10, 9, 9, 8, 7, 6])
            comentario = ('Muy clara la explicación.' if calificacion >= 9
                          else 'Me sirvió, aunque faltó tiempo.' if calificacion >= 7 else 'Regular, quedé con dudas.')
            EvaluacionTutoria.objects.create(tutoria=tutoria, calificacion=calificacion, comentario=comentario)
        elif estado.startswith('CANCELADA'):
            por_docente = estado == 'CANCELADA_DOCENTE'
            horas = self.rng.choice([2, 6, 12, 24, 48])
            Cancelacion.objects.create(
                tutoria=tutoria,
                cancelado_por=bloque.docente if por_docente else estudiante,
                origen='DOCENTE' if por_docente else 'ESTUDIANTE',
                motivo='Reunión de facultad.' if por_docente else 'Cruce con otra clase.',
                horas_previas=horas,
                penalizada=not por_docente and horas < 12,
            )
        return tutoria

    def _solicitudes(self, estudiantes, materias, periodo, anterior, docentes):
        """RF-02 / GT-269: los estudiantes desde tercer semestre cursaron el
        periodo anterior materias de semestres previos, con sus tres cortes
        (algunas perdidas y alguna sin la nota completa). Las solicitudes se
        crean solo donde evaluar_postulacion dice que es elegible, la misma
        regla del endpoint. La cuenta de acceso rápido queda aprobada en una
        materia y con otra elegible libre para probar el POST."""
        config = Configuracion.actual()
        total = 0
        for estudiante in estudiantes:
            if (estudiante.semestre or 0) < config.semestre_minimo_tutor:
                continue
            principal = estudiante.email == f'estudiante@{DOMINIO}'
            previas = sorted(
                (m for m in materias if m.programa_id == estudiante.programa.id
                 and m.semestre is not None and m.semestre < estudiante.semestre),
                key=lambda m: (m.semestre, m.codigo),
            )
            cursadas = previas if principal else self.rng.sample(previas, k=min(3, len(previas)))
            elegibles = []
            for i, materia in enumerate(cursadas):
                cortes = self._cortes(principal, i)
                inscripcion, _ = Inscripcion.objects.update_or_create(
                    estudiante=estudiante, materia=materia, periodo=anterior,
                    defaults=dict(zip(('nota_corte1', 'nota_corte2', 'nota_corte3'), cortes)),
                )
                revisores = docentes_revisores(materia, periodo)
                evaluacion = evaluar_postulacion(estudiante, inscripcion, periodo, config, con_docente=bool(revisores))
                if evaluacion['elegible']:
                    elegibles.append((inscripcion, evaluacion['nota'], revisores))

            if not elegibles or (not principal and self.rng.random() > 0.35):
                continue
            inscripcion, nota, revisores = elegibles[0]
            SolicitudTutor.objects.create(
                estudiante=estudiante,
                materia=inscripcion.materia,
                periodo=periodo,
                nota_corte1=inscripcion.nota_corte1,
                nota_corte2=inscripcion.nota_corte2,
                nota_corte3=inscripcion.nota_corte3,
                nota_final=nota,
                estado='APROBADA' if principal else 'PENDIENTE',
                revisada_por=revisores[0] if principal else None,
                fecha_revision=timezone.now() if principal else None,
            )
            if principal:
                self._bloques_tutor(estudiante, inscripcion.materia, periodo)
            total += 1
        return total

    def _cortes(self, principal, indice):
        """Notas de 0 a 5 de los tres cortes. La cuenta principal tiene notas
        fijas para que el historial siempre muestre lo mismo: la primera y la
        tercera materia elegibles, la segunda aprobada pero bajo la mínima."""
        if principal:
            fijas = [('4.5', '4.2', '4.8'), ('3.5', '3.2', '3.8'), ('4.0', '4.5', '4.2')]
            return [Decimal(n) for n in fijas[indice % len(fijas)]]
        tipo = self.rng.random()
        if tipo < 0.15:  # perdida
            return [Decimal(self.rng.choice(['2.0', '2.5', '2.8'])) for _ in range(3)]
        cortes = [Decimal(self.rng.choice(['3.5', '4.0', '4.3', '4.5', '4.8', '5.0'])) for _ in range(3)]
        if tipo < 0.25:  # el tercer corte aún no está registrado
            cortes[2] = None
        return cortes

    def _bloques_tutor(self, tutor, materia, periodo):
        # RF-01: la tutora estudiante publica dos horarios la semana siguiente.
        lunes = self.hoy + timedelta(days=7 - self.hoy.weekday())
        for dia, salon in ((lunes, SALONES[3]), (lunes + timedelta(days=2), SALONES[2])):
            if dia <= periodo.fecha_fin:
                BloqueDisponibilidad.objects.create(
                    docente=tutor, materia=materia, periodo=periodo, fecha=dia,
                    hora_inicio=time(12, 0), hora_fin=time(13, 0), modalidad='PRESENCIAL',
                    lugar=salon, cupo_total=2, estado='DISPONIBLE',
                )
