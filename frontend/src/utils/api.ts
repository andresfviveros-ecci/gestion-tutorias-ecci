/**
 * Helpers compartidos para respuestas y errores de la API.
 */

const LIMITE_MENSAJE = 200;

/** Detecta respuestas que en realidad son HTML (p. ej. la página 500 de Django). */
const pareceHtml = (texto: string): boolean => /<[a-z!/][\s\S]*>/i.test(texto);

/** Devuelve el texto si es legible; descarta HTML, cadenas vacías y textos enormes. */
const textoLegible = (valor: unknown): string | null => {
  if (typeof valor !== 'string') return null;
  const limpio = valor.trim();
  if (!limpio || pareceHtml(limpio) || limpio.length > LIMITE_MENSAJE) return null;
  return limpio;
};

/** Extrae un mensaje legible de un error de axios/Django. */
export const mensajeError = (error: unknown): string => {
  const data = (error as { response?: { data?: unknown } })?.response?.data;

  const directo = textoLegible(data);
  if (directo) return directo;

  if (data && typeof data === 'object') {
    const registro = data as Record<string, unknown>;
    const detalle = textoLegible(registro.detail);
    if (detalle) return detalle;

    for (const valor of Object.values(registro)) {
      if (Array.isArray(valor)) {
        for (const item of valor) {
          const texto = textoLegible(item);
          if (texto) return texto;
        }
      }
      const texto = textoLegible(valor);
      if (texto) return texto;
    }
  }
  return 'No pudimos completar la operación. Intenta de nuevo.';
};

/** Tipo de aviso que merece un error al guardar un horario (GT-197, GT-201). */
export type TipoFallo = 'conflicto' | 'validacion' | 'permiso' | 'sin_conexion' | 'servidor';

export interface FalloApi {
  tipo: TipoFallo;
  mensaje: string;
}

/**
 * Clasifica un error de la API para mostrar el aviso correcto. El cruce de
 * horarios se reconoce por el mensaje del backend ("…presenta conflicto con
 * otra disponibilidad existente.").
 */
export const analizarError = (error: unknown): FalloApi => {
  const respuesta = (error as { response?: { status?: number } })?.response;
  if (!respuesta) {
    return { tipo: 'sin_conexion', mensaje: 'No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.' };
  }
  const status = respuesta.status ?? 0;
  if (status >= 500) {
    return { tipo: 'servidor', mensaje: 'El servidor tuvo un problema. Inténtalo de nuevo en unos minutos.' };
  }

  const mensaje = mensajeError(error);
  if (status === 403) return { tipo: 'permiso', mensaje };
  if (/conflicto|se cruza|solapa/i.test(mensaje)) return { tipo: 'conflicto', mensaje };
  return { tipo: 'validacion', mensaje };
};

/** Acepta una lista plana o una respuesta paginada de DRF (`{ results }`). */
export const extraerLista = <T,>(data: unknown): T[] => {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === 'object') {
    const results = (data as { results?: unknown }).results;
    if (Array.isArray(results)) return results as T[];
  }
  return [];
};

/**
 * Errores por campo de una respuesta 400 del backend:
 * `{ detail, code, errors: { campo: ["mensaje", ...] } }` → `{ campo: "mensaje" }`.
 * Solo toma el primer mensaje legible de cada campo.
 */
export const erroresPorCampo = (error: unknown): Record<string, string> => {
  const errors = (error as { response?: { data?: { errors?: unknown } } })?.response?.data?.errors;
  if (!errors || typeof errors !== 'object') return {};

  const resultado: Record<string, string> = {};
  for (const [campo, valor] of Object.entries(errors as Record<string, unknown>)) {
    const lista = Array.isArray(valor) ? valor : [valor];
    const mensaje = lista.map(textoLegible).find((texto): texto is string => Boolean(texto));
    if (mensaje) resultado[campo] = mensaje;
  }
  return resultado;
};
