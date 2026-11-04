/**
 * Tipos de vista del panel de estudiante.
 * Son la forma en la que el front consume los endpoints de disponibilidad y tutorías.
 */

export interface Bloque {
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
  observaciones?: string | null;
}

export interface Materia {
  id: number;
  nombre: string;
  codigo: string;
}

export interface Tutor {
  id: number;
  first_name?: string;
  last_name?: string;
  email?: string;
  username?: string;
}

export interface Tutoria {
  id: number;
  codigo?: string;
  bloque?: Bloque | number | string | null;
  docente?: string;
  tema?: string;
  descripcion?: string;
  estado?: string;
  fecha?: string;
  hora_inicio?: string;
  hora_fin?: string;
}

export type ModalidadFiltro = 'TODAS' | 'VIRTUAL' | 'PRESENCIAL';

/** Tutoría activa ya resuelta con su bloque y horario. */
export interface ProximaTutoria {
  tutoria: Tutoria;
  bloque: Bloque | null;
  fecha: string;
  horaInicio: string;
  horaFin: string;
}

/** Respuesta agregada de las cuatro consultas del panel. */
export interface DatosPanel {
  bloques: Bloque[] | null;
  tutorias: Tutoria[] | null;
  materias: Materia[] | null;
  tutores: Tutor[] | null;
  fallo: boolean;
}
