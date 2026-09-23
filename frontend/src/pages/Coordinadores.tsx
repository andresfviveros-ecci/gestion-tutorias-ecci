import React, { useState, useEffect } from 'react';
import { Loader } from '../components/Loader';

interface Coordinador {
  nombre: string;
  id: string;
  facultad: string;
  correo: string;
}

export const Coordinadores: React.FC = () => {
  const [loading, setLoading] = useState(true);

  const [nombre, setNombre] = useState('');
  const [identificacion, setIdentificacion] = useState('');
  const [facultad, setFacultad] = useState('');
  const [correo, setCorreo] = useState('');

  const [errors, setErrors] = useState({
    nombre: false,
    identificacion: false,
    facultad: false,
    correo: false,
  });

  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [coordinadores, setCoordinadores] = useState<Coordinador[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1400);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors = {
      nombre: !nombre.trim(),
      identificacion: !identificacion.trim(),
      facultad: !facultad.trim(),
      correo: !correo.trim(),
    };

    setErrors(newErrors);

    if (newErrors.nombre || newErrors.identificacion || newErrors.facultad || newErrors.correo) {
      setAlertMessage('Por favor, completa todos los campos requeridos (*).');
      return;
    }

    const duplicado = coordinadores.some(
      (c) => c.id === identificacion.trim() || c.correo.toLowerCase() === correo.trim().toLowerCase()
    );

    if (duplicado) {
      setAlertMessage('Ya existe un coordinador registrado con ese correo o número de identificación.');
      return;
    }

    setAlertMessage(null);
    setCoordinadores([
      ...coordinadores,
      {
        nombre: nombre.trim(),
        id: identificacion.trim(),
        facultad: facultad.trim(),
        correo: correo.trim(),
      },
    ]);

    limpiarFormulario();
  };

  const limpiarFormulario = () => {
    setNombre('');
    setIdentificacion('');
    setFacultad('');
    setCorreo('');
    setErrors({ nombre: false, identificacion: false, facultad: false, correo: false });
    setAlertMessage(null);
  };

  return (
    <div className="w-full flex flex-col bg-[#f7f5ed] min-h-full">
      <Loader hidden={!loading} />

      {/* HEADER SUPERIOR BLANCO PEGADO AL BORDE */}
      <header className="w-full h-[60px] bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0">
        <div className="text-[0.82rem] text-slate-500">
          Usuarios / <span className="font-semibold text-[#0d1b2a]">Registrar coordinador</span>
        </div>
        <div className="text-xs font-semibold text-slate-600">
          Administrador
        </div>
      </header>

      {/* ÁREA DE CONTENIDO CON PADDING */}
      <main className="p-8 w-full max-w-[1400px] space-y-6">
        <div>
          <h1 className="font-display italic text-3xl font-semibold text-[#0d1b2a] mb-1">
            Registrar coordinador
          </h1>
          <p className="text-[0.83rem] text-slate-500">
            Completa los datos del coordinador. Este rol podrá administrar materias, asignar tutores y consultar reportes.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">
          {/* FORMULARIO DE REGISTRO */}
          <div className="lg:col-span-5 bg-white rounded-xl p-7 border border-slate-200 shadow-sm">
            {alertMessage && (
              <div className="mb-5 p-3.5 bg-rose-100 border border-rose-300 text-rose-800 rounded-lg text-xs leading-relaxed flex items-start gap-2">
                <i className="fa-solid fa-triangle-exclamation mt-0.5"></i>
                <div>{alertMessage}</div>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Nombre completo <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  className={`w-full h-[44px] px-3.5 text-[0.83rem] bg-white border rounded-md outline-none transition-all ${
                    errors.nombre
                      ? 'border-rose-500 ring-2 ring-rose-500/15'
                      : 'border-slate-200 focus:border-[#0d1b2a] focus:ring-2 focus:ring-[#0d1b2a]/10'
                  }`}
                  value={nombre}
                  onChange={(e) => {
                    setNombre(e.target.value);
                    if (e.target.value.trim()) setErrors((prev) => ({ ...prev, nombre: false }));
                  }}
                />
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    N.º de identificación <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    className={`w-full h-[44px] px-3.5 text-[0.83rem] bg-white border rounded-md outline-none transition-all ${
                      errors.identificacion
                        ? 'border-rose-500 ring-2 ring-rose-500/15'
                        : 'border-slate-200 focus:border-[#0d1b2a] focus:ring-2 focus:ring-[#0d1b2a]/10'
                    }`}
                    value={identificacion}
                    onChange={(e) => {
                      setIdentificacion(e.target.value);
                      if (e.target.value.trim()) setErrors((prev) => ({ ...prev, identificacion: false }));
                    }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Facultad a cargo <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    className={`w-full h-[44px] px-3.5 text-[0.83rem] bg-white border rounded-md outline-none transition-all ${
                      errors.facultad
                        ? 'border-rose-500 ring-2 ring-rose-500/15'
                        : 'border-slate-200 focus:border-[#0d1b2a] focus:ring-2 focus:ring-[#0d1b2a]/10'
                    }`}
                    value={facultad}
                    onChange={(e) => {
                      setFacultad(e.target.value);
                      if (e.target.value.trim()) setErrors((prev) => ({ ...prev, facultad: false }));
                    }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Correo institucional <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  className={`w-full h-[44px] px-3.5 text-[0.83rem] bg-white border rounded-md outline-none transition-all ${
                    errors.correo
                      ? 'border-rose-500 ring-2 ring-rose-500/15'
                      : 'border-slate-200 focus:border-[#0d1b2a] focus:ring-2 focus:ring-[#0d1b2a]/10'
                  }`}
                  value={correo}
                  onChange={(e) => {
                    setCorreo(e.target.value);
                    if (e.target.value.trim()) setErrors((prev) => ({ ...prev, correo: false }));
                  }}
                />
              </div>

              <div className="bg-slate-300/80 rounded-lg p-3.5 flex items-center gap-3 my-6">
                <span className="bg-[#0d1b2a] text-white text-[0.72rem] font-semibold px-3.5 py-1 rounded-full">
                  Coordinador
                </span>
                <span className="text-xs text-slate-700 font-medium">
                  Rol asignado automáticamente
                </span>
              </div>

              <div className="flex gap-3.5 pt-1">
                <button
                  type="submit"
                  className="flex-[1.2] h-[42px] bg-[#0d1b2a] hover:bg-[#1e2d4a] text-white font-semibold text-xs rounded-md transition-colors"
                >
                  Registrar coordinador
                </button>
                <button
                  type="button"
                  onClick={limpiarFormulario}
                  className="flex-[0.8] h-[42px] bg-transparent hover:bg-slate-50 text-[#0d1b2a] border border-slate-200 font-semibold text-xs rounded-md transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>

          {/* TABLA DE REGISTROS */}
          <div className="lg:col-span-7 bg-white rounded-xl p-7 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[0.88rem] font-bold text-[#0d1b2a] uppercase tracking-wider">
                Coordinadores registrados
              </h3>
              <span className="text-xs text-slate-500">
                {coordinadores.length} registro{coordinadores.length !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 uppercase text-[0.7rem] tracking-wider font-bold">
                    <th className="pb-3 px-2">Coordinador</th>
                    <th className="pb-3 px-2">Identificación</th>
                    <th className="pb-3 px-2">Correo</th>
                    <th className="pb-3 px-2">Facultad</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {coordinadores.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-slate-400 font-medium text-xs">
                        No hay coordinadores registrados aún.
                      </td>
                    </tr>
                  ) : (
                    coordinadores.map((c, index) => (
                      <tr key={index} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-2 font-semibold text-[#0d1b2a]">{c.nombre}</td>
                        <td className="py-3 px-2">{c.id}</td>
                        <td className="py-3 px-2">{c.correo}</td>
                        <td className="py-3 px-2">{c.facultad}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};