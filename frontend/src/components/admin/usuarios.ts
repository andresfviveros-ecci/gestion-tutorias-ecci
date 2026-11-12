/** Utilidades compartidas por las pantallas de usuarios de la coordinación. */

export const claseInput =
  'h-10 w-full rounded-xl border border-faint bg-white px-3.5 text-[12px] text-tinta outline-none transition-colors placeholder:text-pebble focus:border-violeta-accion';

/** Minúsculas y sin tildes, para buscar sin importar cómo se escriba. */
export const normalizar = (texto: string): string =>
  texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

/** Si alguno de los textos contiene la consulta (ya normalizada). */
export const coincide = (consulta: string, ...textos: (string | null | undefined)[]): boolean =>
  !consulta || textos.some((texto) => normalizar(texto ?? '').includes(consulta));

/** Badge de Activo/Inactivo; si el backend no manda el dato, muestra "—". */
export const claseEstado = (activo: boolean | null): { texto: string; clase: string } => {
  if (activo === null) return { texto: '—', clase: 'text-muted' };
  return activo
    ? { texto: 'Activo', clase: 'rounded-full bg-exito/10 px-2.5 py-1 text-[10px] font-semibold text-exito' }
    : { texto: 'Inactivo', clase: 'rounded-full bg-mist px-2.5 py-1 text-[10px] font-semibold text-muted' };
};
