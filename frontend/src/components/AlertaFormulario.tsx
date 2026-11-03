import React from 'react';
import type { TipoFallo } from '../utils/api';

export type TipoAlerta = 'exito' | TipoFallo;

interface AlertaFormularioProps {
  tipo: TipoAlerta;
  mensaje: string;
  /** Reemplaza el título por defecto del tipo (p. ej. "Horario publicado"). */
  titulo?: string;
  onCerrar?: () => void;
}

const ESTILOS: Record<TipoAlerta, { caja: string; icono: string; titulo: string }> = {
  exito: {
    caja: 'bg-emerald-50 border-emerald-300 text-emerald-900',
    icono: 'fa-circle-check text-emerald-600',
    titulo: 'Horario guardado',
  },
  conflicto: {
    caja: 'bg-amber-50 border-amber-300 text-amber-900',
    icono: 'fa-triangle-exclamation text-amber-600',
    titulo: 'Este horario se cruza con otro bloque',
  },
  validacion: {
    caja: 'bg-rose-50 border-rose-300 text-rose-900',
    icono: 'fa-circle-exclamation text-rose-600',
    titulo: 'Revisa los datos del horario',
  },
  permiso: {
    caja: 'bg-rose-50 border-rose-300 text-rose-900',
    icono: 'fa-lock text-rose-600',
    titulo: 'No tienes permiso para esta acción',
  },
  sin_conexion: {
    caja: 'bg-slate-50 border-slate-300 text-slate-800',
    icono: 'fa-wifi text-slate-500',
    titulo: 'Sin conexión con el servidor',
  },
  servidor: {
    caja: 'bg-slate-50 border-slate-300 text-slate-800',
    icono: 'fa-server text-slate-500',
    titulo: 'El servidor tuvo un problema',
  },
};

/**
 * Aviso de los formularios de disponibilidad (GT-197 y GT-201): publicación
 * exitosa, cruce de horarios y demás errores, cada uno con su color y título.
 */
export const AlertaFormulario: React.FC<AlertaFormularioProps> = ({ tipo, mensaje, titulo, onCerrar }) => {
  const estilo = ESTILOS[tipo];
  return (
    <div
      role={tipo === 'exito' ? 'status' : 'alert'}
      aria-live={tipo === 'exito' ? 'polite' : 'assertive'}
      className={`mb-3 flex items-start gap-3 rounded-lg border p-3.5 text-xs leading-relaxed shrink-0 animate-in fade-in duration-200 ${estilo.caja}`}
    >
      <i className={`fa-solid ${estilo.icono} mt-0.5 text-sm`} aria-hidden="true"></i>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{titulo ?? estilo.titulo}</p>
        <p className="mt-0.5">{mensaje}</p>
      </div>
      {onCerrar && (
        <button
          type="button"
          onClick={onCerrar}
          aria-label="Cerrar aviso"
          className="-mr-1 -mt-1 rounded p-1 opacity-60 transition-opacity hover:opacity-100"
        >
          <i className="fa-solid fa-xmark" aria-hidden="true"></i>
        </button>
      )}
    </div>
  );
};
