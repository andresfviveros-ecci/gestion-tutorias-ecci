import { useState } from 'react';
import type { FormEvent } from 'react';
import { Modal } from '../constelacion/Modal';
import type { UserAccount } from './gestionUsuarios';
import { claseInput } from './usuarios';

interface EditarUsuarioModalProps {
  usuario: UserAccount;
  onCerrar: () => void;
  onGuardar: (usuario: UserAccount) => void;
}

const claseEtiqueta = 'mb-1.5 block text-[11.5px] font-semibold text-tinta';

const SEMESTRES = Array.from({ length: 10 }, (_, i) => i + 1);

/**
 * Edición de un usuario. Trabaja sobre una copia; el padre hace el PUT
 * (con el cambio optimista y la reversión si falla).
 */
export const EditarUsuarioModal = ({ usuario, onCerrar, onGuardar }: EditarUsuarioModalProps) => {
  const [borrador, setBorrador] = useState<UserAccount>({ ...usuario });

  const enviar = (event: FormEvent) => {
    event.preventDefault();
    onGuardar(borrador);
  };

  return (
    <Modal
      onCerrar={onCerrar}
      tituloId="editar-usuario"
      eyebrow={`GT-177 · ${usuario.rol}`}
      titulo="Editar usuario"
      ancho="md"
    >
      <form onSubmit={enviar} className="px-6 pb-6 pt-4 sm:px-7">
        <div className="space-y-4">
          <label className="block">
            <span className={claseEtiqueta}>Nombre completo *</span>
            <input
              type="text"
              required
              value={borrador.nombre}
              onChange={(event) => setBorrador({ ...borrador, nombre: event.target.value })}
              className={claseInput}
            />
          </label>

          <label className="block">
            {/* Este campo siempre editó `documento`; antes se rotulaba "Código institucional". */}
            <span className={claseEtiqueta}>Documento</span>
            <input
              type="text"
              value={borrador.documento}
              onChange={(event) => setBorrador({ ...borrador, documento: event.target.value })}
              className={claseInput}
            />
          </label>

          <label className="block">
            <span className={claseEtiqueta}>Teléfono de contacto</span>
            <input
              type="tel"
              value={borrador.telefono}
              onChange={(event) => setBorrador({ ...borrador, telefono: event.target.value })}
              className={claseInput}
            />
          </label>

          {borrador.endpoint === 'estudiantes' && (
            <label className="block">
              <span className={claseEtiqueta}>Semestre</span>
              <select
                value={borrador.semestre ?? ''}
                onChange={(event) =>
                  setBorrador({
                    ...borrador,
                    semestre: event.target.value ? Number(event.target.value) : null,
                  })
                }
                className={claseInput}
              >
                <option value="">Sin registrar</option>
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
          )}
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCerrar}
            className="h-11 rounded-full border border-faint bg-white px-5 text-[12.5px] font-semibold text-tinta transition-colors hover:bg-mist"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="h-11 rounded-full bg-violeta-accion px-6 text-[12.5px] font-semibold text-white transition-colors hover:bg-violeta-profundo"
          >
            Guardar cambios
          </button>
        </div>
      </form>
    </Modal>
  );
};
