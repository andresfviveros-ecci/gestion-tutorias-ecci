/**
 * Utilidades de fecha y hora en español usadas por el panel.
 * Se centralizan acá para poder reutilizarlas en otras pantallas.
 */

export const capitalizar = (texto: string): string =>
  texto ? texto.charAt(0).toUpperCase() + texto.slice(1) : texto;

/** Date -> 'YYYY-MM-DD' en hora local (evita el desfase de toISOString). */
export const aISOFecha = (fecha: Date): string => {
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, '0');
  const d = String(fecha.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/** 'YYYY-MM-DD' -> Date al mediodía, para que la zona horaria no mueva el día. */
export const parseFecha = (iso: string): Date => new Date(`${iso}T12:00:00`);

export const hoyISO = (): string => aISOFecha(new Date());

/** Hora actual en 'HH:MM', para comparar con hora_inicio y hora_fin. */
export const horaActual = (): string => {
  const ahora = new Date();
  return `${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}`;
};

/** 'HH:MM:SS' -> 'HH:MM' */
export const horaCorta = (hora?: string | null): string => (hora || '').slice(0, 5);

/** 'Jueves 29 de octubre' */
export const fechaLarga = (fecha: Date): string =>
  capitalizar(
    fecha.toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }),
  );

export const diaSemana = (iso: string): string =>
  capitalizar(parseFecha(iso).toLocaleDateString('es-ES', { weekday: 'long' }));

/** 'LUN', 'MAR'... */
export const diaSemanaCorto = (iso: string): string =>
  parseFecha(iso)
    .toLocaleDateString('es-ES', { weekday: 'short' })
    .replace('.', '')
    .toUpperCase();

/** 'Jueves 29' */
export const diaYNumero = (iso: string): string =>
  `${diaSemana(iso)} ${parseFecha(iso).getDate()}`;

/** 'Hoy', 'Mañana' o 'Jueves 29' */
export const etiquetaRelativa = (iso: string): string => {
  const hoy = new Date();
  hoy.setHours(12, 0, 0, 0);
  const objetivo = parseFecha(iso);
  const dias = Math.round((objetivo.getTime() - hoy.getTime()) / 86_400_000);
  if (dias === 0) return 'Hoy';
  if (dias === 1) return 'Mañana';
  return `${diaSemana(iso)} ${objetivo.getDate()}`;
};

/** Devuelve los 7 días de la semana actual, de lunes a domingo. */
export const diasDeLaSemana = (referencia = new Date()): Date[] => {
  const base = new Date(referencia);
  base.setHours(12, 0, 0, 0);
  const lunes = new Date(base);
  lunes.setDate(base.getDate() - ((base.getDay() + 6) % 7));

  return Array.from({ length: 7 }, (_, indice) => {
    const dia = new Date(lunes);
    dia.setDate(lunes.getDate() + indice);
    return dia;
  });
};

/** Los 7 días de la semana que contiene la fecha ISO, de lunes a domingo. */
export const diasDeLaSemanaDe = (iso: string): Date[] =>
  diasDeLaSemana(parseFecha(iso));

/** 'Martes · 29 de oct de 2026' */
export const fechaConAnio = (iso: string): string => {
  const fecha = parseFecha(iso);
  const mes = fecha
    .toLocaleDateString('es-ES', { month: 'short' })
    .replace('.', '');
  return `${diaSemana(iso)} · ${fecha.getDate()} de ${mes} de ${fecha.getFullYear()}`;
};

/** '14:00' -> '2:00 p. m.' */
export const hora12 = (hora?: string | null): string => {
  if (!hora) return '';
  const [horas, minutos] = hora.split(':').map(Number);
  if (Number.isNaN(horas) || Number.isNaN(minutos)) return hora;
  const sufijo = horas >= 12 ? 'p. m.' : 'a. m.';
  const horas12 = horas % 12 || 12;
  return `${horas12}:${String(minutos).padStart(2, '0')} ${sufijo}`;
};

/** 120 -> '2 horas'; 90 -> '1 hora 30 min'; 45 -> '45 min'. */
export const duracionLegible = (minutos: number): string => {
  if (!Number.isFinite(minutos) || minutos <= 0) return '';
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  if (horas === 0) return `${resto} min`;
  const textoHoras = `${horas} ${horas === 1 ? 'hora' : 'horas'}`;
  return resto === 0 ? textoHoras : `${textoHoras} ${resto} min`;
};
