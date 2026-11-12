import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminRail } from '../components/admin/AdminRail';
import { FormularioUsuario, type DatosUsuario } from '../components/admin/FormularioUsuario';
import { claseEstado, claseInput, coincide, normalizar } from '../components/admin/usuarios';
import { EmptyState } from '../components/constelacion/EmptyState';
import { ArrowIcon, SearchIcon } from '../components/constelacion/Icons';
import { Modal } from '../components/constelacion/Modal';
import { SkeletonFilas } from '../components/constelacion/Skeleton';
import { Toast } from '../components/constelacion/Toast';
import { useTutorStore } from '../store/useTutorStore';
import { api } from '../api/axios';
import { extraerLista } from '../utils/api';

interface PeriodoAPI {
  id: number;
  codigo: string;
  activo: boolean;
}

interface AsignacionAPI {
  id: number;
  docente: number;
  materia: number;
  materia_nombre?: string;
}

interface MateriasPeriodo {
  codigo: string;
  porDocente: Map<number, string[]>;
}

/**
 * GT-179 (HU-005): tutores registrados y alta de nuevos tutores.
 *
 * La lista y el POST siguen pasando por `useTutorStore`. Las materias del
 * periodo activo son un extra: si fallan, la lista se muestra igual.
 * El backend solo devuelve tutores activos (`solo_activos`).
 */
export const Tutores = () => {
  const { tutores, loading, fetchTutores, addTutor } = useTutorStore();
  const [cargado, setCargado] = useState(false);

  const [materias, setMaterias] = useState<MateriasPeriodo | null>(null);
  const [sinMaterias, setSinMaterias] = useState(false);

  const [busqueda, setBusqueda] = useState('');

  const [modalAbierto, setModalAbierto] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [errorForm, setErrorForm] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;
    void fetchTutores().finally(() => {
      if (activo) setCargado(true);
    });
    return () => {
      activo = false;
    };
  }, [fetchTutores]);

  useEffect(() => {
    let activo = true;

    const cargarMaterias = async () => {
      try {
        const { data } = await api.get('/catalogo/periodos/');
        const periodo = extraerLista<PeriodoAPI>(data).find((item) => item.activo);
        if (!periodo) {
          if (activo) setSinMaterias(true);
          return;
        }
        const respuesta = await api.get('/catalogo/docentes-materias/', {
          params: { periodo: periodo.id },
        });
        if (!activo) return;
        const porDocente = new Map<number, string[]>();
        for (const asignacion of extraerLista<AsignacionAPI>(respuesta.data)) {
          const lista = porDocente.get(asignacion.docente) ?? [];
          lista.push(asignacion.materia_nombre ?? `Materia ${asignacion.materia}`);
          porDocente.set(asignacion.docente, lista);
        }
        setMaterias({ codigo: periodo.codigo, porDocente });
      } catch {
        // Las materias son informativas: sin ellas la lista sigue funcionando.
        if (activo) setSinMaterias(true);
      }
    };

    void cargarMaterias();

    return () => {
      activo = false;
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const temporizador = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(temporizador);
  }, [toast]);

  const abrirModal = () => {
    setErrorForm(null);
    setModalAbierto(true);
  };

  const cerrarModal = useCallback(() => setModalAbierto(false), []);

  const registrar = async (datos: DatosUsuario) => {
    setEnviando(true);
    setErrorForm(null);
    // addTutor hace el POST /accounts/tutores/ y recarga la lista.
    const resultado = await addTutor(datos);
    setEnviando(false);
    if (resultado.success) {
      setModalAbierto(false);
      setToast(`${datos.first_name} ${datos.last_name} quedó registrado.`);
    } else {
      setErrorForm(resultado.error || 'No se pudo guardar el tutor.');
    }
  };

  const filtrados = useMemo(() => {
    const consulta = normalizar(busqueda);
    return tutores.filter((tutor) =>
      coincide(consulta, tutor.nombre, tutor.correo, tutor.documento, tutor.username),
    );
  }, [tutores, busqueda]);

  const cargando = loading || !cargado;

  return (
    <div className="flex min-h-screen bg-mist font-constelacion text-tinta">
      <AdminRail />

      <main className="mx-auto w-full min-w-0 max-w-[1500px] flex-1 px-5 py-6 pb-24 sm:px-7 md:pb-6 lg:px-8">
        <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11.5px] text-muted">Usuarios · Coordinación</p>
            <h1 className="mt-1 text-[30px] font-medium leading-tight tracking-[-0.02em] text-tinta sm:text-[36px]">
              Tutores
            </h1>
            <p className="mt-1 max-w-[640px] text-[13px] leading-relaxed text-muted">
              Docentes tutores activos y las materias que tienen asignadas en el periodo. Desde aquí
              puedes registrar nuevos tutores.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              to="/asignacion-materias"
              className="inline-flex h-11 items-center gap-2 rounded-full border border-faint bg-white px-5 text-[12.5px] font-semibold text-tinta transition-colors hover:bg-mist"
            >
              Asignar materias
              <ArrowIcon className="h-4 w-4" />
            </Link>
            <button
              type="button"
              onClick={abrirModal}
              className="h-11 rounded-full bg-violeta-accion px-5 text-[12.5px] font-semibold text-white transition-colors hover:bg-violeta-profundo"
            >
              Registrar tutor
            </button>
          </div>
        </header>

        <section className="rounded-[32px] bg-white p-5 sm:p-6">
          <label className="block sm:max-w-[420px]">
            <span className="mb-1.5 block text-[11px] font-medium text-slate-ink">Buscar</span>
            <span className="relative block">
              <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-pebble" />
              <input
                type="search"
                value={busqueda}
                onChange={(event) => setBusqueda(event.target.value)}
                placeholder="Nombre, correo o documento"
                className={`${claseInput} pl-10`}
              />
            </span>
          </label>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-2 px-1 text-[10.5px] text-muted">
            <span>
              {filtrados.length} {filtrados.length === 1 ? 'tutor' : 'tutores'}
            </span>
            <span>
              {materias
                ? `Materias del periodo ${materias.codigo}`
                : sinMaterias
                  ? 'No pudimos cargar las materias del periodo activo'
                  : ''}
            </span>
          </div>

          {cargando ? (
            <SkeletonFilas className="mt-2" filas={5} />
          ) : filtrados.length === 0 ? (
            <EmptyState
              titulo={tutores.length === 0 ? 'Aún no hay tutores' : 'No encontramos tutores'}
              detalle={
                tutores.length === 0
                  ? 'Registra el primer tutor con el botón de arriba.'
                  : 'Prueba con otro nombre, correo o documento.'
              }
            />
          ) : (
            <div className="mt-2 overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-[12px]">
                <thead>
                  <tr className="border-b border-faint text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">
                    <th className="px-3 pb-3">Tutor</th>
                    <th className="px-3 pb-3">Correo</th>
                    <th className="px-3 pb-3">Documento</th>
                    <th className="px-3 pb-3">Teléfono</th>
                    <th className="px-3 pb-3">Materias asignadas</th>
                    <th className="px-3 pb-3">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-faint">
                  {filtrados.map((tutor) => {
                    const estado = claseEstado(tutor.activo);
                    const asignadas = materias?.porDocente.get(Number(tutor.id)) ?? [];
                    return (
                      <tr key={tutor.id} className="align-top hover:bg-mist/60">
                        <td className="px-3 py-3">
                          <p className="font-semibold text-tinta">{tutor.nombre}</p>
                          <p className="mt-0.5 text-[10.5px] text-muted">{tutor.username || '—'}</p>
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-slate-ink">{tutor.correo || '—'}</td>
                        <td className="px-3 py-3 font-mono text-[11px] text-slate-ink">
                          {tutor.documento || '—'}
                        </td>
                        <td className="px-3 py-3 text-slate-ink">{tutor.telefono || '—'}</td>
                        <td className="px-3 py-3">
                          {!materias ? (
                            <span className="text-muted">—</span>
                          ) : asignadas.length === 0 ? (
                            <span className="text-[11px] text-muted">Sin materias</span>
                          ) : (
                            <div className="flex max-w-[280px] flex-wrap gap-1.5">
                              {asignadas.map((materia) => (
                                <span
                                  key={materia}
                                  className="rounded-full bg-violet-wash/30 px-2.5 py-1 text-[10px] font-semibold text-violeta-tinta"
                                >
                                  {materia}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <span className={estado.clase}>{estado.texto}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {modalAbierto && (
        <Modal
          onCerrar={cerrarModal}
          tituloId="tutor-form"
          eyebrow="GT-179 · Registrar tutor"
          titulo="Nuevo tutor"
          ancho="lg"
          cerrable={!enviando}
        >
          <FormularioUsuario
            rol="tutor"
            enviando={enviando}
            error={errorForm}
            onGuardar={registrar}
            onCancelar={cerrarModal}
          />
        </Modal>
      )}

      <Toast mensaje={toast} />
    </div>
  );
};

export default Tutores;
