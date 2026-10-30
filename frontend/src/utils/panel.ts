import type { Tutor } from '../types/panel';
import { capitalizar } from './fechas';

/** 'VIRTUAL' -> 'Virtual', 'PRESENCIAL' -> 'Presencial'. */
export const modalidadLegible = (modalidad?: string): string => {
  const valor = (modalidad || '').toUpperCase();
  if (valor === 'VIRTUAL') return 'Virtual';
  if (valor === 'PRESENCIAL') return 'Presencial';
  return capitalizar((modalidad || 'Sin modalidad').toLowerCase());
};

/** Nombre completo del docente con respaldos por username/email. */
export const nombreTutor = (tutor?: Tutor): string => {
  if (!tutor) return 'Docente por confirmar';
  const completo = `${tutor.first_name || ''} ${tutor.last_name || ''}`.trim();
  return completo || tutor.username || tutor.email || 'Docente por confirmar';
};
