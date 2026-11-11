import { api } from '../api/axios';

/** Parámetros generales de tutorías que afectan a estudiantes y tutores. */
export interface ConfiguracionTutorias {
  cupos_semanales_tutor: number;
  horas_anticipacion_reservar: number;
  horas_anticipacion_cancelar: number;
}

/** Valores de respaldo si la consulta falla (los mismos del backend). */
export const CONFIGURACION_POR_DEFECTO: ConfiguracionTutorias = {
  cupos_semanales_tutor: 10,
  horas_anticipacion_reservar: 2,
  horas_anticipacion_cancelar: 1,
};

const numero = (valor: unknown, porDefecto: number): number => {
  const convertido = Number(valor);
  return Number.isFinite(convertido) ? convertido : porDefecto;
};

/**
 * Lee la configuración general. El endpoint es de lectura abierta para
 * cualquier sesión, así que estudiantes y tutores también pueden consultarlo.
 */
export const consultarConfiguracion = async (): Promise<ConfiguracionTutorias> => {
  try {
    const { data } = await api.get<Partial<ConfiguracionTutorias>>('/catalogo/configuracion/');
    return {
      cupos_semanales_tutor: numero(
        data.cupos_semanales_tutor,
        CONFIGURACION_POR_DEFECTO.cupos_semanales_tutor,
      ),
      horas_anticipacion_reservar: numero(
        data.horas_anticipacion_reservar,
        CONFIGURACION_POR_DEFECTO.horas_anticipacion_reservar,
      ),
      horas_anticipacion_cancelar: numero(
        data.horas_anticipacion_cancelar,
        CONFIGURACION_POR_DEFECTO.horas_anticipacion_cancelar,
      ),
    };
  } catch {
    return CONFIGURACION_POR_DEFECTO;
  }
};

/** Momento actual en milisegundos (aislado para no leer el reloj en render). */
export const ahoraMs = (): number => Date.now();

/** Momento límite (en ms) para reservar un bloque, según las horas de aviso. */
export const limiteDeReserva = (fecha: string, horaInicio: string, horas: number): number =>
  new Date(`${fecha}T${horaInicio}`).getTime() - horas * 60 * 60 * 1000;

/** true si todavía se puede reservar: el plazo mínimo no ha vencido. */
export const dentroDelPlazo = (
  fecha: string,
  horaInicio: string,
  horas: number,
  ahora = Date.now(),
): boolean => {
  const limite = limiteDeReserva(fecha, horaInicio, horas);
  return Number.isFinite(limite) && ahora <= limite;
};

/** 'hasta el inicio' o 'con al menos 2 h de anticipación'. */
export const textoAnticipacion = (horas: number): string =>
  horas === 0 ? 'hasta el inicio' : `con al menos ${horas} h de anticipación`;
