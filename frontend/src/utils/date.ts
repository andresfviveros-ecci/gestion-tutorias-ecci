/**
 * Devuelve una fecha en formato YYYY-MM-DD usando la zona horaria local.
 *
 * `Date.toISOString()` convierte a UTC, por lo que en Colombia (UTC-5) una
 * fecha como el 1 de enero a las 20:00 termina mostrando el 2 de enero.
 */
export const fechaLocalISO = (date: Date = new Date()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/** Fecha de hoy (zona horaria local) en formato YYYY-MM-DD. */
export const hoyLocalISO = (): string => fechaLocalISO(new Date());
