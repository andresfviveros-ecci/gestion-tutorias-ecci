/**
 * Contrato de la postulación a tutor (GT-268).
 *
 * La vista consume `GET /tutores/historial-materias/` (GT-269) para pintar las
 * materias aprobadas y los tres requisitos. Mientras ese endpoint no exista, el
 * normalizador devuelve `null` y la pantalla muestra un estado vacío honesto.
 */

export type EstadoSolicitud = 'PENDIENTE' | 'APROBADA' | 'RECHAZADA' | 'REVOCADA';

export interface ConfigTutor {
  semestre_minimo_tutor: number;
  nota_minima: string;
  diferencia_semestres: number;
}

export interface RequisitoHistorial {
  cumple?: boolean;
  valor?: number | string | null;
  minimo?: number | string | null;
}

export interface RequisitosHistorial {
  semestre?: RequisitoHistorial;
  nota?: RequisitoHistorial;
  avance?: RequisitoHistorial;
}

export interface SolicitudVigente {
  id: number;
  estado: EstadoSolicitud;
  fecha?: string | null;
}

export interface MateriaHistorial {
  materia: number;
  codigo?: string;
  nombre: string;
  semestre_cursado: number | null;
  nota: string | null;
  aprobada: boolean;
  elegible: boolean;
  motivo: string | null;
  requisitos?: RequisitosHistorial;
  solicitud: SolicitudVigente | null;
}

export interface HistorialTutor {
  semestre: number | null;
  periodo_codigo?: string;
  config: Partial<ConfigTutor>;
  resumen: { materias_aprobadas: number; elegibles: number };
  materias: MateriaHistorial[];
}

/** Respuesta de `GET /tutores/solicitudes/?estudiante=me` (endpoint ya existente). */
export interface SolicitudTutorAPI {
  id: number;
  materia: number;
  materia_nombre: string;
  nota_final: string | number;
  estado: EstadoSolicitud;
  date_creation?: string;
}

const numero = (valor: unknown): number | null => {
  if (valor === null || valor === undefined || valor === '') return null;
  const n = typeof valor === 'number' ? valor : Number(valor);
  return Number.isFinite(n) ? n : null;
};

const texto = (valor: unknown): string => (typeof valor === 'string' ? valor : '');

const objeto = (valor: unknown): Record<string, unknown> | null =>
  valor && typeof valor === 'object' ? (valor as Record<string, unknown>) : null;

const estadoValido = (valor: unknown): EstadoSolicitud => {
  const estado = texto(valor).toUpperCase();
  return estado === 'APROBADA' || estado === 'RECHAZADA' || estado === 'REVOCADA'
    ? estado
    : 'PENDIENTE';
};

const normalizarRequisitos = (valor: unknown): RequisitosHistorial | undefined => {
  const registro = objeto(valor);
  if (!registro) return undefined;

  const normalizar = (clave: string): RequisitoHistorial | undefined => {
    const item = objeto(registro[clave]);
    if (!item) return undefined;
    return {
      cumple: typeof item.cumple === 'boolean' ? item.cumple : undefined,
      valor: item.valor as number | string | null | undefined,
      minimo: item.minimo as number | string | null | undefined,
    };
  };

  return {
    semestre: normalizar('semestre'),
    nota: normalizar('nota'),
    avance: normalizar('avance'),
  };
};

/**
 * Normaliza la respuesta de GT-269. Devuelve `null` si la forma no es la
 * esperada (por ejemplo, un 404 del endpoint que aún no existe).
 */
export const normalizarHistorial = (data: unknown): HistorialTutor | null => {
  const registro = objeto(data);
  if (!registro || !Array.isArray(registro.materias)) return null;

  const materias: MateriaHistorial[] = [];

  for (const cruda of registro.materias) {
    const item = objeto(cruda);
    if (!item) continue;

    const id = numero(item.materia);
    if (id === null) continue;

    const solicitudCruda = objeto(item.solicitud);
    const solicitudId = solicitudCruda ? numero(solicitudCruda.id) : null;

    materias.push({
      materia: id,
      codigo: texto(item.codigo) || undefined,
      nombre: texto(item.nombre) || `Materia ${id}`,
      semestre_cursado: numero(item.semestre_cursado),
      nota: item.nota === null || item.nota === undefined ? null : String(item.nota),
      aprobada: item.aprobada !== false,
      elegible: item.elegible === true,
      motivo: texto(item.motivo) || null,
      requisitos: normalizarRequisitos(item.requisitos),
      solicitud:
        solicitudCruda && solicitudId !== null
          ? {
              id: solicitudId,
              estado: estadoValido(solicitudCruda.estado),
              fecha: texto(solicitudCruda.fecha) || null,
            }
          : null,
    });
  }

  const configCruda = objeto(registro.config) ?? {};
  const resumenCrudo = objeto(registro.resumen) ?? {};
  const elegibles = materias.filter((materia) => materia.elegible).length;

  return {
    semestre: numero(registro.semestre),
    periodo_codigo: texto(registro.periodo_codigo) || undefined,
    config: {
      semestre_minimo_tutor: numero(configCruda.semestre_minimo_tutor) ?? undefined,
      nota_minima:
        configCruda.nota_minima === null || configCruda.nota_minima === undefined
          ? undefined
          : String(configCruda.nota_minima),
      diferencia_semestres: numero(configCruda.diferencia_semestres) ?? undefined,
    },
    resumen: {
      materias_aprobadas: numero(resumenCrudo.materias_aprobadas) ?? materias.length,
      elegibles: numero(resumenCrudo.elegibles) ?? elegibles,
    },
    materias,
  };
};

/** '4.6' -> '4.6'; '4.00' -> '4.0'. */
export const formatoNota = (nota: string | number | null | undefined): string => {
  const n = numero(nota);
  return n === null ? '—' : n.toFixed(1);
};

/** 'Hoy, 10:32 a. m.' o '9 nov, 10:32 a. m.'. */
export const fechaPostulacion = (iso?: string | null): string => {
  if (!iso) return '';
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return '';

  const hora = fecha.toLocaleTimeString('es-CO', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  if (fecha.toDateString() === new Date().toDateString()) return `Hoy, ${hora}`;

  const dia = fecha
    .toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })
    .replace('.', '');
  return `${dia}, ${hora}`;
};

export const estadoPostulacion = (estado: EstadoSolicitud): { texto: string; clase: string } => {
  switch (estado) {
    case 'APROBADA':
      return { texto: 'Aprobada', clase: 'bg-exito/10 text-exito' };
    case 'RECHAZADA':
      return { texto: 'Rechazada', clase: 'bg-peligro/10 text-peligro' };
    case 'REVOCADA':
      return { texto: 'Revocada', clase: 'bg-peligro/10 text-peligro' };
    default:
      return { texto: 'En revisión docente', clase: 'bg-advertencia/10 text-advertencia' };
  }
};
