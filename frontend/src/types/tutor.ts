/**
 * Tipos de vista del panel del tutor (docente).
 * Reflejan el contrato de `/tutorias/recibidas/` y `/disponibilidad/`.
 */

export interface Referencia {
  id: number;
  nombre: string;
}

export interface BloqueDetalle {
  id: number;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  modalidad: string;
  lugar?: string | null;
  enlace_virtual?: string | null;
  materia: Referencia | null;
  docente: Referencia;
}

/** Tutoría vista por el docente dueño del bloque. */
export interface TutoriaRecibida {
  id: number;
  codigo?: string;
  bloque?: number | null;
  bloque_detalle?: BloqueDetalle | null;
  docente?: string;
  estudiante: number;
  estudiante_nombre?: string;
  tema?: string;
  descripcion?: string;
  estado: string;
  asistencia?: string;
  puede_cancelar?: boolean;
  puede_editar?: boolean;
  estados_siguientes?: string[];
}

/** Bloque de disponibilidad publicado por el docente. */
export interface BloqueDisponibilidad {
  id: number;
  docente: number;
  materia: number;
  periodo?: number;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  modalidad: string;
  lugar?: string | null;
  enlace_virtual?: string | null;
  cupo_total: number;
  cupo_ocupado: number;
  estado: string;
}

/** Respuesta agregada de las consultas del panel. */
export interface DatosPanelTutor {
  recibidas: TutoriaRecibida[] | null;
  disponibilidad: BloqueDisponibilidad[] | null;
  /** El endpoint de tutorías recibidas aún no está desplegado (404). */
  sinRecibidas: boolean;
  fallo: boolean;
}
