
// --- CATÁLOGO ---
export interface MateriaBackend {
  id: number;
  codigo: string;
  nombre: string;
  creditos: number;
  semestre?: number | null;
  programa: number; // ID del Programa Académico
  activa: boolean;
}

// --- DISPONIBILIDAD ---
export type ModalidadType = 'PRESENCIAL' | 'VIRTUAL';
export type EstadoBloqueType = 'DISPONIBLE' | 'COMPLETO' | 'CANCELADO' | 'CERRADO';

export interface BloqueDisponibilidadPayload {
  materia?: number | null;
  periodo: number;
  fecha: string;        // YYYY-MM-DD
  hora_inicio: string;  // HH:MM:SS (ej: "08:00:00")
  hora_fin: string;     // HH:MM:SS (ej: "10:00:00")
  modalidad: ModalidadType;
  lugar?: string | null;
  enlace_virtual?: string | null;
  cupo_total: number;
  observaciones?: string | null;
}

export interface BloqueDisponibilidadResponse extends BloqueDisponibilidadPayload {
  id: number;
  docente: number;
  cupo_ocupado: number;
  estado: EstadoBloqueType;
}

// --- TUTORÍAS ---
export interface TutoriaReservarPayload {
  bloque_id: number;
  tema: string;
  descripcion?: string;
}

export interface TutoriaResponse {
  id: number;
  codigo: string;
  bloque: number;
  estudiante: number;
  tema: string;
  descripcion?: string;
  estado: string;
}