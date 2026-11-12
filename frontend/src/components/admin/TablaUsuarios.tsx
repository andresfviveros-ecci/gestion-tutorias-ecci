import type { UserAccount } from './gestionUsuarios';

interface TablaUsuariosProps {
  usuarios: UserAccount[];
  onCambiarEstado: (usuario: UserAccount) => void;
  onEditar: (usuario: UserAccount) => void;
}

const CLASE_ROL: Record<UserAccount['rol'], string> = {
  Admin: 'bg-violet-wash/40 text-violeta-tinta',
  Coordinador: 'bg-info/10 text-info',
  Tutor: 'bg-exito/10 text-exito',
  Estudiante: 'bg-arena/40 text-cacao',
};

/** Tabla de todos los usuarios con interruptor de estado y botón de edición. */
export const TablaUsuarios = ({ usuarios, onCambiarEstado, onEditar }: TablaUsuariosProps) => (
  <div className="mt-2 overflow-x-auto">
    <table className="w-full min-w-[820px] text-left text-[12px]">
      <thead>
        <tr className="border-b border-faint text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">
          <th className="px-3 pb-3">Usuario</th>
          <th className="px-3 pb-3">Correo</th>
          <th className="px-3 pb-3">Rol</th>
          <th className="px-3 pb-3">Teléfono</th>
          <th className="px-3 pb-3">Estado</th>
          <th className="px-3 pb-3 text-right">Acciones</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-faint">
        {usuarios.map((usuario) => (
          <tr key={usuario.id} className="hover:bg-mist/60">
            <td className="px-3 py-3">
              <p className="font-semibold text-tinta">{usuario.nombre}</p>
              {usuario.username && usuario.username !== usuario.correo && (
                <p className="mt-0.5 text-[10.5px] text-muted">{usuario.username}</p>
              )}
            </td>
            <td className="whitespace-nowrap px-3 py-3 text-slate-ink">{usuario.correo || '—'}</td>
            <td className="px-3 py-3">
              <span
                className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${CLASE_ROL[usuario.rol]}`}
              >
                {usuario.rol}
              </span>
            </td>
            <td className="px-3 py-3 font-mono text-[11px] text-slate-ink">{usuario.telefono || '—'}</td>
            <td className="px-3 py-3">
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  role="switch"
                  aria-checked={usuario.activo}
                  aria-label={`${usuario.activo ? 'Desactivar' : 'Activar'} a ${usuario.nombre}`}
                  title={usuario.activo ? 'Desactivar' : 'Activar'}
                  onClick={() => onCambiarEstado(usuario)}
                  className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violeta-accion ${
                    usuario.activo ? 'bg-exito' : 'bg-pebble'
                  }`}
                >
                  <span
                    className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                      usuario.activo ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
                <span
                  className={`text-[10.5px] font-semibold ${usuario.activo ? 'text-exito' : 'text-muted'}`}
                >
                  {usuario.activo ? 'Activo' : 'Inactivo'}
                </span>
              </div>
            </td>
            <td className="px-3 py-3 text-right">
              <button
                type="button"
                onClick={() => onEditar(usuario)}
                aria-label={`Editar a ${usuario.nombre}`}
                className="rounded-full border border-faint px-3 py-1.5 text-[10.5px] font-semibold text-slate-ink transition-colors hover:bg-mist"
              >
                Editar
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
