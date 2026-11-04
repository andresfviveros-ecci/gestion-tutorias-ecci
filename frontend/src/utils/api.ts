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

/** Acepta una lista plana o una respuesta paginada de DRF (`{ results }`). */
export const extraerLista = <T,>(data: unknown): T[] => {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === 'object') {
    const results = (data as { results?: unknown }).results;
    if (Array.isArray(results)) return results as T[];
  }
  return [];
};
