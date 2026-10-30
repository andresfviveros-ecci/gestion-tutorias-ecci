/**
 * Helpers compartidos para respuestas y errores de la API.
 */

/** Extrae un mensaje legible de un error de axios/Django. */
export const mensajeError = (error: unknown): string => {
  const data = (error as { response?: { data?: unknown } })?.response?.data;

  if (typeof data === 'string') return data;
  if (data && typeof data === 'object') {
    const registro = data as Record<string, unknown>;
    if (typeof registro.detail === 'string') return registro.detail;

    for (const valor of Object.values(registro)) {
      if (Array.isArray(valor) && valor.length > 0) return String(valor[0]);
      if (typeof valor === 'string') return valor;
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
