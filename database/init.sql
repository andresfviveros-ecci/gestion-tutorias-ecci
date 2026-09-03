CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TYPE rol_usuario AS ENUM ('ESTUDIANTE', 'DOCENTE', 'COORDINADOR', 'ADMIN');

CREATE TABLE usuario (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(150) UNIQUE NOT NULL,
    email VARCHAR(254) UNIQUE NOT NULL,
    password VARCHAR(128) NOT NULL,
    nombres VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    documento VARCHAR(20) UNIQUE NOT NULL,
    telefono VARCHAR(20),
    rol rol_usuario NOT NULL,
    codigo_institucional VARCHAR(20) UNIQUE,
    foto_url VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_login TIMESTAMPTZ,
    date_joined TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_usuario_rol ON usuario (rol) WHERE is_active;

CREATE TABLE programa_academico (
    id BIGSERIAL PRIMARY KEY,
    codigo VARCHAR(20) UNIQUE NOT NULL,
    nombre VARCHAR(150) NOT NULL,
    facultad VARCHAR(100),
    activo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE periodo_academico (
    id BIGSERIAL PRIMARY KEY,
    codigo VARCHAR(10) UNIQUE NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT ck_periodo_fechas CHECK (fecha_fin > fecha_inicio)
);

CREATE UNIQUE INDEX ux_periodo_activo ON periodo_academico (activo) WHERE activo;

CREATE TABLE materia (
    id BIGSERIAL PRIMARY KEY,
    codigo VARCHAR(20) UNIQUE NOT NULL,
    nombre VARCHAR(150) NOT NULL,
    creditos SMALLINT NOT NULL DEFAULT 3,
    semestre SMALLINT,
    programa_id BIGINT NOT NULL REFERENCES programa_academico(id) ON DELETE RESTRICT,
    activa BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX idx_materia_programa ON materia (programa_id);

CREATE TABLE docente_materia (
    id BIGSERIAL PRIMARY KEY,
    docente_id BIGINT NOT NULL REFERENCES usuario (id) ON DELETE CASCADE,
    materia_id BIGINT NOT NULL REFERENCES materia (id) ON DELETE CASCADE,
    periodo_id BIGINT NOT NULL REFERENCES periodo_academico (id) ON DELETE CASCADE,
    CONSTRAINT ux_docente_materia UNIQUE (docente_id, materia_id, periodo_id)
);

CREATE TABLE inscripcion (
    id BIGSERIAL PRIMARY KEY,
    estudiante_id BIGINT NOT NULL REFERENCES usuario (id) ON DELETE CASCADE,
    materia_id BIGINT NOT NULL REFERENCES materia (id) ON DELETE CASCADE,
    periodo_id BIGINT NOT NULL REFERENCES periodo_academico (id) ON DELETE CASCADE,
    CONSTRAINT ux_inscripcion UNIQUE (estudiante_id, materia_id, periodo_id)
);

CREATE INDEX idx_inscripcion_estudiante ON inscripcion (estudiante_id, periodo_id);

CREATE TYPE modalidad_tutoria AS ENUM ('PRESENCIAL', 'VIRTUAL');
CREATE TYPE estado_bloque AS ENUM ('DISPONIBLE', 'COMPLETO', 'CANCELADO', 'CERRADO');

CREATE TABLE bloque_disponibilidad (
    id BIGSERIAL PRIMARY KEY,
    docente_id BIGINT NOT NULL REFERENCES usuario (id) ON DELETE CASCADE,
    materia_id BIGINT REFERENCES materia (id) ON DELETE SET NULL,
    periodo_id BIGINT NOT NULL REFERENCES periodo_academico (id) ON DELETE CASCADE,
    fecha DATE NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    modalidad modalidad_tutoria NOT NULL,
    lugar VARCHAR(150),
    enlace_virtual VARCHAR(255),
    cupo_total SMALLINT NOT NULL DEFAULT 1,
    cupo_ocupado SMALLINT NOT NULL DEFAULT 0,
    estado estado_bloque NOT NULL DEFAULT 'DISPONIBLE',
    observaciones TEXT,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_bloque_horas CHECK (hora_fin > hora_inicio),
    CONSTRAINT ck_bloque_cupos CHECK (cupo_ocupado >= 0 AND cupo_ocupado <= cupo_total),
    CONSTRAINT ck_bloque_modalidad CHECK (
        (modalidad = 'PRESENCIAL' AND lugar IS NOT NULL) OR
        (modalidad = 'VIRTUAL' AND enlace_virtual IS NOT NULL)
    ),
    CONSTRAINT ex_bloque_sin_solape EXCLUDE USING gist (
        docente_id WITH =,
        fecha WITH =,
        tsrange((fecha + hora_inicio), (fecha + hora_fin)) WITH &&
    ) WHERE (estado <> 'CANCELADO')
);

CREATE INDEX idx_bloque_busqueda ON bloque_disponibilidad (fecha, estado, materia_id);
CREATE INDEX idx_bloque_docente ON bloque_disponibilidad (docente_id, fecha);

CREATE TABLE plantilla_disponibilidad (
    id BIGSERIAL PRIMARY KEY,
    docente_id BIGINT NOT NULL REFERENCES usuario (id) ON DELETE CASCADE,
    periodo_id BIGINT NOT NULL REFERENCES periodo_academico (id) ON DELETE CASCADE,
    dia_semana SMALLINT NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    modalidad modalidad_tutoria NOT NULL,
    lugar VARCHAR(150),
    enlace_virtual VARCHAR(255),
    cupo_total SMALLINT NOT NULL DEFAULT 1,
    activa BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT ck_plantilla_dia CHECK (dia_semana BETWEEN 0 AND 6),
    CONSTRAINT ck_plantilla_horas CHECK (hora_fin > hora_inicio)
);

CREATE TYPE estado_tutoria AS ENUM (
    'RESERVADA', 'CONFIRMADA', 'EN_CURSO', 'COMPLETADA',
    'CANCELADA_ESTUDIANTE', 'CANCELADA_DOCENTE', 'NO_ASISTIO'
);
CREATE TYPE estado_asistencia AS ENUM ('PENDIENTE', 'ASISTIO', 'ASISTIO_TARDE', 'NO_ASISTIO');

CREATE TABLE tutoria (
    id BIGSERIAL PRIMARY KEY,
    codigo VARCHAR(20) UNIQUE NOT NULL,
    bloque_id BIGINT NOT NULL REFERENCES bloque_disponibilidad (id) ON DELETE RESTRICT,
    estudiante_id BIGINT NOT NULL REFERENCES usuario (id) ON DELETE RESTRICT,
    tema VARCHAR(200) NOT NULL,
    descripcion TEXT,
    estado estado_tutoria NOT NULL DEFAULT 'RESERVADA',
    asistencia estado_asistencia NOT NULL DEFAULT 'PENDIENTE',
    minutos_retraso SMALLINT DEFAULT 0,
    hora_inicio_real TIMESTAMPTZ,
    hora_fin_real TIMESTAMPTZ,
    notas_docente TEXT,
    compromisos TEXT,
    reservada_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_tutoria_retraso CHECK (minutos_retraso >= 0)
);

CREATE UNIQUE INDEX ux_tutoria_activa
ON tutoria (bloque_id, estudiante_id)
WHERE estado IN ('RESERVADA', 'CONFIRMADA', 'EN_CURSO');

CREATE INDEX idx_tutoria_estudiante ON tutoria (estudiante_id, estado);
CREATE INDEX idx_tutoria_bloque ON tutoria (bloque_id);

CREATE TYPE origen_cancelacion AS ENUM ('ESTUDIANTE', 'DOCENTE', 'SISTEMA');

CREATE TABLE cancelacion (
    id BIGSERIAL PRIMARY KEY,
    tutoria_id BIGINT NOT NULL REFERENCES tutoria (id) ON DELETE CASCADE,
    cancelado_por BIGINT REFERENCES usuario (id) ON DELETE SET NULL,
    origen origen_cancelacion NOT NULL,
    motivo TEXT NOT NULL,
    horas_previas NUMERIC(5,2),
    penalizada BOOLEAN NOT NULL DEFAULT FALSE,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cancelacion_tutoria ON cancelacion (tutoria_id);

CREATE TABLE evaluacion_tutoria (
    id BIGSERIAL PRIMARY KEY,
    tutoria_id BIGINT UNIQUE NOT NULL REFERENCES tutoria (id) ON DELETE CASCADE,
    calificacion SMALLINT NOT NULL,
    comentario TEXT,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_calificacion CHECK (calificacion BETWEEN 1 AND 5)
);

CREATE TYPE tipo_notificacion AS ENUM (
    'RESERVA_CONFIRMADA', 'RECORDATORIO', 'CANCELACION',
    'CAMBIO_HORARIO', 'NUEVA_RESERVA'
);

CREATE TABLE notificacion (
    id BIGSERIAL PRIMARY KEY,
    usuario_id BIGINT NOT NULL REFERENCES usuario (id) ON DELETE CASCADE,
    tutoria_id BIGINT REFERENCES tutoria (id) ON DELETE CASCADE,
    tipo tipo_notificacion NOT NULL,
    titulo VARCHAR(150) NOT NULL,
    mensaje TEXT NOT NULL,
    leida BOOLEAN NOT NULL DEFAULT FALSE,
    enviada_email BOOLEAN NOT NULL DEFAULT FALSE,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notificacion_pendiente ON notificacion (usuario_id, leida) WHERE NOT leida;

CREATE TABLE auditoria (
    id BIGSERIAL PRIMARY KEY,
    usuario_id BIGINT REFERENCES usuario (id) ON DELETE SET NULL,
    entidad VARCHAR(50) NOT NULL,
    entidad_id BIGINT,
    accion VARCHAR(30) NOT NULL,
    datos_antes JSONB,
    datos_despues JSONB,
    ip INET,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_auditoria_entidad ON auditoria (entidad, entidad_id);
