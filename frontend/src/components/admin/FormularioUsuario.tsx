import { useId, useState } from 'react';
import type { FormEvent } from 'react';
import { EyeIcon, EyeOffIcon } from '../constelacion/Icons';
import { claseInput } from './usuarios';

export type RolFormulario = 'estudiante' | 'tutor' | 'coordinador';

/** Campos comunes que el backend exige para crear cualquier usuario. */
export interface DatosUsuarioBase {
  username: string;
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  documento: string;
  telefono: string;
}

/** Campos extra del estudiante (RF-02). */
export interface DatosEstudiante extends DatosUsuarioBase {
  codigo_institucional: string | null;
  semestre: number;
}

export type DatosUsuario = DatosUsuarioBase | DatosEstudiante;

interface FormularioUsuarioProps {
  rol: RolFormulario;
  enviando: boolean;
  /** Error del backend (ya pasado por `mensajeError`). */
  error: string | null;
  onGuardar: (datos: DatosUsuario) => Promise<void> | void;
  onCancelar: () => void;
}

const claseEtiqueta = 'mb-1.5 block text-[11.5px] font-semibold text-tinta';

const SEMESTRES = Array.from({ length: 10 }, (_, i) => i + 1);

const TEXTO_BOTON: Record<RolFormulario, string> = {
  estudiante: 'Registrar estudiante',
  tutor: 'Registrar tutor',
  coordinador: 'Registrar coordinador',
};

/**
 * Formulario de alta compartido por Estudiantes, Tutores y Coordinadores
 * (GT-180, GT-179, GT-178). Va dentro de un `Modal`; el padre hace el POST.
 */
export const FormularioUsuario = ({
  rol,
  enviando,
  error,
  onGuardar,
  onCancelar,
}: FormularioUsuarioProps) => {
  const idClave = useId();
  const esEstudiante = rol === 'estudiante';

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [documento, setDocumento] = useState('');
  const [telefono, setTelefono] = useState('');
  const [codigoInstitucional, setCodigoInstitucional] = useState('');
  const [semestre, setSemestre] = useState('');
  const [password, setPassword] = useState('');
  const [verClave, setVerClave] = useState(false);
  const [errorLocal, setErrorLocal] = useState<string | null>(null);

  const incompleto =
    !firstName.trim() ||
    !lastName.trim() ||
    !username.trim() ||
    !email.trim() ||
    !documento.trim() ||
    !telefono.trim() ||
    (esEstudiante && !semestre.trim()) ||
    !password.trim();

  const enviar = async (event: FormEvent) => {
    event.preventDefault();
    setErrorLocal(null);

    if (incompleto) {
      setErrorLocal('Completa todos los campos obligatorios (*).');
      return;
    }

    const base: DatosUsuarioBase = {
      username: username.trim(),
      email: email.trim(),
      password: password.trim(),
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      documento: documento.trim(),
      telefono: telefono.trim(),
    };

    if (!esEstudiante) {
      await onGuardar(base);
      return;
    }

    const semestreNumero = Number(semestre);
    if (!Number.isInteger(semestreNumero) || semestreNumero < 1 || semestreNumero > 10) {
      setErrorLocal('El semestre debe estar entre 1 y 10.');
      return;
    }

    await onGuardar({
      ...base,
      codigo_institucional: codigoInstitucional.trim() || null,
      semestre: semestreNumero,
    });
  };

  const mensaje = errorLocal ?? error;

  return (
    <form onSubmit={enviar} noValidate className="px-6 pb-6 pt-4 sm:px-7">
      <div className="grid max-h-[62vh] grid-cols-1 gap-4 overflow-y-auto pr-1 sm:grid-cols-2">
        <label className="block">
          <span className={claseEtiqueta}>Nombres *</span>
          <input
            type="text"
            required
            autoComplete="given-name"
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            className={claseInput}
          />
        </label>

        <label className="block">
          <span className={claseEtiqueta}>Apellidos *</span>
          <input
            type="text"
            required
            autoComplete="family-name"
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
            className={claseInput}
          />
        </label>

        <label className="block">
          <span className={claseEtiqueta}>Nombre de usuario *</span>
          <input
            type="text"
            required
            autoComplete="off"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            className={claseInput}
          />
        </label>

        <label className="block">
          <span className={claseEtiqueta}>Correo electrónico *</span>
          <input
            type="email"
            required
            autoComplete="off"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={claseInput}
          />
        </label>

        <label className="block">
          <span className={claseEtiqueta}>Documento *</span>
          <input
            type="text"
            required
            value={documento}
            onChange={(event) => setDocumento(event.target.value)}
            className={claseInput}
          />
        </label>

        <label className="block">
          <span className={claseEtiqueta}>Teléfono *</span>
          <input
            type="tel"
            required
            value={telefono}
            onChange={(event) => setTelefono(event.target.value)}
            className={claseInput}
          />
        </label>

        {esEstudiante && (
          <>
            <label className="block">
              <span className={claseEtiqueta}>Código institucional</span>
              <input
                type="text"
                value={codigoInstitucional}
                onChange={(event) => setCodigoInstitucional(event.target.value)}
                className={claseInput}
              />
            </label>

            <label className="block">
              <span className={claseEtiqueta}>Semestre *</span>
              <select
                required
                value={semestre}
                onChange={(event) => setSemestre(event.target.value)}
                className={claseInput}
              >
                <option value="">Selecciona el semestre</option>
                {SEMESTRES.map((valor) => (
                  <option key={valor} value={valor}>
                    {valor}
                  </option>
                ))}
              </select>
              <span className="mt-1 block text-[10px] leading-relaxed text-muted">
                RF-02: se usa para validar la postulación como tutor.
              </span>
            </label>
          </>
        )}

        <div className="sm:col-span-2">
          <label htmlFor={idClave} className={claseEtiqueta}>
            Contraseña *
          </label>
          <div className="relative">
            <input
              id={idClave}
              type={verClave ? 'text' : 'password'}
              required
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className={`${claseInput} pr-11`}
            />
            <button
              type="button"
              onClick={() => setVerClave((valor) => !valor)}
              aria-label={verClave ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              aria-pressed={verClave}
              title={verClave ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted transition-colors hover:bg-mist hover:text-tinta focus-visible:outline focus-visible:outline-2 focus-visible:outline-violeta-accion"
            >
              {verClave ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>

      {mensaje && (
        <p
          role="alert"
          className="mt-4 rounded-2xl border border-peligro/40 bg-peligro/5 px-4 py-3 text-[11.6px] leading-relaxed text-peligro"
        >
          {mensaje}
        </p>
      )}

      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancelar}
          disabled={enviando}
          className="h-11 rounded-full border border-faint bg-white px-5 text-[12.5px] font-semibold text-tinta transition-colors hover:bg-mist disabled:opacity-60"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={enviando || incompleto}
          className="h-11 rounded-full bg-violeta-accion px-6 text-[12.5px] font-semibold text-white transition-colors hover:bg-violeta-profundo disabled:cursor-not-allowed disabled:opacity-60"
        >
          {enviando ? 'Guardando...' : TEXTO_BOTON[rol]}
        </button>
      </div>
    </form>
  );
};
