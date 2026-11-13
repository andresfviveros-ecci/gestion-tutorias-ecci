/**
 * Contrato de `/tutores/solicitudes/` (RF-02, RF-03).
 * Un estudiante pide ser tutor de una materia que ya cursó y el docente
 * asignado a esa materia en el periodo aprueba o rechaza la solicitud.
 */

export type EstadoSolicitud = 'PENDIENTE' | 'APROBADA' | 'RECHAZADA' | 'REVOCADA';

export interface SolicitudTutor {
  id: number;
  estudiante: number;
  estudiante_nombre: string;
  estudiante_semestre: number | null;
  materia: number;
  materia_nombre: string;
  periodo: number;
  periodo_codigo: string;
  nota_corte1: string | number;
  nota_corte2: string | number;
  nota_corte3: string | number;
  nota_final: string | number;
  estado: EstadoSolicitud;
  motivo: string | null;
  revisada_por: number | null;
  revisada_por_nombre: string | null;
  /** Docentes de la materia en el periodo: quienes revisan la solicitud (vacío = la coordinación). */
  revisores?: string[];
  fecha_revision: string | null;
  date_creation: string;
}
