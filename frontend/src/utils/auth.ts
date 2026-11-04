/**
 * Utilidades para leer datos del JWT sin validar la firma.
 * La firma la valida el backend; aquí solo se usa para saber quién es el
 * usuario en sesión (por ejemplo, el id numérico del docente).
 */

interface JwtBase {
  user_id?: number | string;
  exp?: number;
  [clave: string]: unknown;
}

const base64UrlATexto = (segmento: string): string => {
  const normalizado = segmento.replace(/-/g, '+').replace(/_/g, '/');
  const relleno = normalizado.padEnd(
    normalizado.length + ((4 - (normalizado.length % 4)) % 4),
    '=',
  );
  const binario = atob(relleno);
  const bytes = Uint8Array.from(binario, (caracter) => caracter.charCodeAt(0));
  return new TextDecoder().decode(bytes);
};

/** Devuelve el payload del JWT o `null` si el token no tiene el formato esperado. */
export const decodificarJwt = <T = JwtBase>(token?: string | null): T | null => {
  if (!token) return null;

  const partes = token.split('.');
  if (partes.length < 2) return null;

  try {
    return JSON.parse(base64UrlATexto(partes[1])) as T;
  } catch {
    return null;
  }
};

/** Id numérico del usuario autenticado (`user_id` del access token). */
export const idUsuarioDesdeToken = (token?: string | null): number | null => {
  const payload = decodificarJwt<JwtBase>(token);
  const id = Number(payload?.user_id);
  return Number.isFinite(id) && id > 0 ? id : null;
};
