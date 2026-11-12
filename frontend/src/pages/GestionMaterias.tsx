import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { AdminRail } from '../components/admin/AdminRail';
import { EmptyState } from '../components/constelacion/EmptyState';
import { Modal } from '../components/constelacion/Modal';
import { SkeletonFilas } from '../components/constelacion/Skeleton';
import { Toast } from '../components/constelacion/Toast';
import { SearchIcon } from '../components/constelacion/Icons';
import { api } from '../api/axios';
import { extraerLista, mensajeError } from '../utils/api';

interface ProgramaAPI {
  id: number;
  codigo: string;
  nombre: string;
  activo?: boolean;
}

interface MateriaAPI {
  id: number;
  codigo: string;
  nombre: string;
  creditos: number;
  semestre: number | null;
  programa: number;
  activa: boolean;
}

type FiltroEstado = 'todas' | 'activas' | 'inactivas';
type FiltroSemestre = '' | 'sin' | `${number}`;

const inputClass =
  'h-10 w-full rounded-xl border border-faint bg-white px-3.5 text-[12px] text-tinta outline-none transition-colors placeholder:text-pebble focus:border-violeta-accion';

const normalizar = (texto: string): string =>
  texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const SEMESTRES = Array.from({ length: 10 }, (_, i) => i + 1);

/**
 * Gestión de materias (GT-48, GT-49, GT-50).
 *
 * El catálogo completo vive en `/catalogo/materias/`. Una materia no se borra:
 * se desactiva con `{ activa: false }` para no perder horarios ni inscripciones.
 * El semestre es clave para la postulación como tutor (RF-02), así que la lista
 * marca las materias que todavía no lo tienen.
 */
export const GestionMaterias = () => {
  const [cargando, setCargando] = useState(true);
  const [materias, setMaterias] = useState<MateriaAPI[]>([]);
  const [programas, setProgramas] = useState<ProgramaAPI[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [busqueda, setBusqueda] = useState('');
  const [programaFiltro, setProgramaFiltro] = useState('');
  const [semestreFiltro, setSemestreFiltro] = useState<FiltroSemestre>('');
  const [estadoFiltro, setEstadoFiltro] = useState<FiltroEstado>('activas');

  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState<MateriaAPI | null>(null);
  const [materiaAConfirmar, setMateriaAConfirmar] = useState<MateriaAPI | null>(null);

  const [codigo, setCodigo] = useState('');
  const [nombre, setNombre] = useState('');
  const [creditos, setCreditos] = useState('3');
  const [semestre, setSemestre] = useState('');
  const [programa, setPrograma] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;

    const cargar = async () => {
      const [resMaterias, resProgramas] = await Promise.allSettled([
        api.get('/catalogo/materias/'),
        api.get('/catalogo/programas/'),
      ]);

      if (!activo) return;

      const listaMaterias =
        resMaterias.status === 'fulfilled' ? extraerLista<MateriaAPI>(resMaterias.value.data) : [];
      const listaProgramas =
        resProgramas.status === 'fulfilled'
          ? extraerLista<ProgramaAPI>(resProgramas.value.data)
          : [];

      setMaterias(listaMaterias);
      setProgramas(listaProgramas);

      if (resMaterias.status === 'rejected') {
        setError('No pudimos cargar las materias. Revisa tu conexión e inténtalo de nuevo.');
      } else if (resProgramas.status === 'rejected') {
        setError('No pudimos cargar los programas académicos.');
      }

      setCargando(false);
    };

    void cargar();

    return () => {
      activo = false;
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const temporizador = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(temporizador);
  }, [toast]);

  const programasPorId = useMemo(
    () => new Map(programas.map((item) => [item.id, item])),
    [programas],
  );

  const sinSemestre = useMemo(
    () => materias.filter((materia) => materia.activa && materia.semestre == null).length,
    [materias],
  );

  const filtradas = useMemo(() => {
    const consulta = normalizar(busqueda);

    return materias
      .filter((materia) => {
        const coincideBusqueda =
          !consulta || normalizar(`${materia.nombre} ${materia.codigo}`).includes(consulta);
        const coincidePrograma =
          !programaFiltro || materia.programa === Number(programaFiltro);
        const coincideSemestre =
          !semestreFiltro ||
          (semestreFiltro === 'sin'
            ? materia.semestre == null
            : materia.semestre === Number(semestreFiltro));
        const coincideEstado =
          estadoFiltro === 'todas' ||
          (estadoFiltro === 'activas' ? materia.activa : !materia.activa);

        return coincideBusqueda && coincidePrograma && coincideSemestre && coincideEstado;
      })
      .sort((a, b) => {
        const programaA = programasPorId.get(a.programa)?.nombre ?? '';
        const programaB = programasPorId.get(b.programa)?.nombre ?? '';
        return (
          programaA.localeCompare(programaB, 'es') ||
          (a.semestre ?? 99) - (b.semestre ?? 99) ||
          a.nombre.localeCompare(b.nombre, 'es')
        );
      });
  }, [materias, busqueda, programaFiltro, semestreFiltro, estadoFiltro, programasPorId]);

  const limpiarFormulario = () => {
    setCodigo('');
    setNombre('');
    setCreditos('3');
    setSemestre('');
    setPrograma(programas[0] ? String(programas[0].id) : '');
    setFormError(null);
    setEditando(null);
  };

  const abrirNueva = () => {
    limpiarFormulario();
    setModalAbierto(true);
  };

  const abrirEditar = (materia: MateriaAPI) => {
    setEditando(materia);
    setCodigo(materia.codigo);
    setNombre(materia.nombre);
    setCreditos(String(materia.creditos ?? 3));
    setSemestre(materia.semestre == null ? '' : String(materia.semestre));
    setPrograma(String(materia.programa));
    setFormError(null);
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    if (guardando) return;
    setModalAbierto(false);
    limpiarFormulario();
  };

  const guardar = async (event: FormEvent) => {
    event.preventDefault();

    if (!codigo.trim() || !nombre.trim() || !programa) {
      setFormError('El código, el nombre y el programa son obligatorios.');
      return;
    }

    const semestreNumero = semestre ? Number(semestre) : null;
    if (semestreNumero !== null && (semestreNumero < 1 || semestreNumero > 10)) {
      setFormError('El semestre debe estar entre 1 y 10.');
      return;
    }

    setGuardando(true);
    setFormError(null);

    const payload = {
      codigo: codigo.trim(),
      nombre: nombre.trim(),
      creditos: Number(creditos) || 3,
      semestre: semestreNumero,
      programa: Number(programa),
    };

    try {
      if (editando) {
        const { data } = await api.patch<MateriaAPI>(
          `/catalogo/materias/${editando.id}/`,
          payload,
        );
        setMaterias((previo) =>
          previo.map((item) => (item.id === editando.id ? { ...item, ...data } : item)),
        );
        setToast('Materia actualizada.');
      } else {
        const { data } = await api.post<MateriaAPI>('/catalogo/materias/', payload);
        setMaterias((previo) => [...previo, data]);
        setToast('Materia creada.');
      }

      setModalAbierto(false);
      limpiarFormulario();
    } catch (err) {
      setFormError(mensajeError(err));
    } finally {
      setGuardando(false);
    }
  };

  const cambiarEstado = async (materia: MateriaAPI) => {
    setError(null);

    try {
      const { data } = await api.patch<MateriaAPI>(`/catalogo/materias/${materia.id}/`, {
        activa: !materia.activa,
      });
      setMaterias((previo) =>
        previo.map((item) => (item.id === materia.id ? { ...item, ...data } : item)),
      );
      setToast(materia.activa ? 'Materia desactivada.' : 'Materia reactivada.');
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setMateriaAConfirmar(null);
    }
  };

  return (
    <div className="flex min-h-screen bg-mist font-constelacion text-tinta">
      <AdminRail />

      <main className="mx-auto w-full min-w-0 max-w-[1500px] flex-1 px-5 py-6 pb-24 sm:px-7 md:pb-6 lg:px-8">
        <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11.5px] text-muted">Materias · Administrador</p>
            <h1 className="mt-1 text-[30px] font-medium leading-tight tracking-[-0.02em] text-tinta sm:text-[36px]">
              Catálogo de materias
            </h1>
            <p className="mt-1 max-w-[640px] text-[13px] leading-relaxed text-muted">
              Crea y actualiza las materias que usan los horarios y la postulación como tutor. Para
              retirar una materia, desactívala: así no se pierden horarios ni inscripciones.
            </p>
          </div>

          <button
            type="button"
            onClick={abrirNueva}
            className="h-11 rounded-full bg-violeta-accion px-5 text-[12.5px] font-semibold text-white transition-colors hover:bg-violeta-profundo"
          >
            Nueva materia
          </button>
        </header>

        {sinSemestre > 0 && (
          <div
            role="status"
            className="mb-4 rounded-2xl border border-advertencia/30 bg-advertencia/5 px-4 py-3"
          >
            <p className="text-[12.5px] font-semibold text-advertencia">
              {sinSemestre} {sinSemestre === 1 ? 'materia activa no tiene' : 'materias activas no tienen'}{' '}
              semestre
            </p>
            <p className="mt-1 text-[11.5px] leading-relaxed text-advertencia/90">
              La postulación como tutor necesita ese dato; sin él la materia aparece como «no
              cumple». Edítala y asígnale el semestre del plan de estudios.
            </p>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mb-4 rounded-2xl border border-peligro/30 bg-peligro/5 px-4 py-3 text-peligro"
          >
            <p className="text-[12.5px] font-semibold">No pudimos completar la operación</p>
            <p className="mt-1 text-[11.5px] leading-relaxed opacity-90">{error}</p>
          </div>
        )}

        <section className="rounded-[32px] bg-white p-5 sm:p-6">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_220px_150px_180px]">
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-medium text-slate-ink">Buscar</span>
              <span className="relative block">
                <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-pebble" />
                <input
                  type="search"
                  value={busqueda}
                  onChange={(event) => setBusqueda(event.target.value)}
                  placeholder="Nombre o código"
                  className={`${inputClass} pl-10`}
                />
              </span>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-[11px] font-medium text-slate-ink">Programa</span>
              <select
                value={programaFiltro}
                onChange={(event) => setProgramaFiltro(event.target.value)}
                className={inputClass}
              >
                <option value="">Todos los programas</option>
                {programas.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nombre}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-[11px] font-medium text-slate-ink">Semestre</span>
              <select
                value={semestreFiltro}
                onChange={(event) => setSemestreFiltro(event.target.value as FiltroSemestre)}
                className={inputClass}
              >
                <option value="">Todos</option>
                <option value="sin">Sin semestre</option>
                {SEMESTRES.map((valor) => (
                  <option key={valor} value={valor}>
                    {valor}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-[11px] font-medium text-slate-ink">Estado</span>
              <select
                value={estadoFiltro}
                onChange={(event) => setEstadoFiltro(event.target.value as FiltroEstado)}
                className={inputClass}
              >
                <option value="activas">Activas</option>
                <option value="inactivas">Inactivas</option>
                <option value="todas">Todas</option>
              </select>
            </label>
          </div>

          <div className="mt-5 flex items-center justify-between px-1 text-[10.5px] text-muted">
            <span>
              {filtradas.length}{' '}
              {filtradas.length === 1 ? 'materia encontrada' : 'materias encontradas'}
            </span>
            <span>{programas.length} programas</span>
          </div>

          {cargando ? (
            <SkeletonFilas className="mt-2" filas={5} />
          ) : filtradas.length === 0 ? (
            <EmptyState
              titulo="No encontramos materias"
              detalle={
                materias.length === 0
                  ? 'Crea la primera materia para empezar a publicar horarios.'
                  : 'Prueba con otro texto o cambia los filtros.'
              }
            />
          ) : (
            <div className="mt-2 overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-[12px]">
                <thead>
                  <tr className="border-b border-faint text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">
                    <th className="px-3 pb-3">Materia</th>
                    <th className="px-3 pb-3">Programa</th>
                    <th className="px-3 pb-3">Semestre</th>
                    <th className="px-3 pb-3 text-center">Créditos</th>
                    <th className="px-3 pb-3">Estado</th>
                    <th className="px-3 pb-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-faint">
                  {filtradas.map((materia) => {
                    const programaItem = programasPorId.get(materia.programa);

                    return (
                      <tr key={materia.id} className="hover:bg-mist/60">
                        <td className="px-3 py-3">
                          <p className="font-semibold text-tinta">{materia.nombre}</p>
                          <p className="mt-0.5 font-mono text-[10.5px] text-muted">
                            {materia.codigo}
                          </p>
                        </td>
                        <td className="px-3 py-3 text-slate-ink">
                          {programaItem?.nombre ?? `Programa ${materia.programa}`}
                        </td>
                        <td className="px-3 py-3">
                          {materia.semestre == null ? (
                            <span className="rounded-full bg-advertencia/10 px-2.5 py-1 text-[10px] font-semibold text-advertencia">
                              Sin semestre
                            </span>
                          ) : (
                            <span className="font-semibold text-slate-ink">{materia.semestre}</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-center text-slate-ink">{materia.creditos}</td>
                        <td className="px-3 py-3">
                          <span
                            className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                              materia.activa
                                ? 'bg-exito/10 text-exito'
                                : 'bg-mist text-muted'
                            }`}
                          >
                            {materia.activa ? 'Activa' : 'Inactiva'}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => abrirEditar(materia)}
                              className="rounded-full border border-faint px-3 py-1.5 text-[10.5px] font-semibold text-slate-ink transition-colors hover:bg-mist"
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                materia.activa
                                  ? setMateriaAConfirmar(materia)
                                  : void cambiarEstado(materia)
                              }
                              className={`rounded-full px-3 py-1.5 text-[10.5px] font-semibold transition-colors ${
                                materia.activa
                                  ? 'border border-peligro/40 text-peligro hover:bg-peligro/5'
                                  : 'border border-exito/40 text-exito hover:bg-exito/5'
                              }`}
                            >
                              {materia.activa ? 'Desactivar' : 'Reactivar'}
                            </button>
                          </div>
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
          tituloId="materia-form"
          eyebrow={editando ? 'GT-49 · Actualizar materia' : 'GT-48 · Registrar materia'}
          titulo={editando ? 'Editar materia' : 'Nueva materia'}
          ancho="lg"
          cerrable={!guardando}
        >
        <form onSubmit={guardar} className="px-6 pb-6 pt-4 sm:px-7">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-[11.5px] font-semibold text-tinta">Código *</span>
              <input
                type="text"
                required
                value={codigo}
                onChange={(event) => setCodigo(event.target.value)}
                placeholder="Ej.: ISW-501"
                className={inputClass}
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-[11.5px] font-semibold text-tinta">Nombre *</span>
              <input
                type="text"
                required
                value={nombre}
                onChange={(event) => setNombre(event.target.value)}
                placeholder="Ej.: Ingeniería de Software"
                className={inputClass}
              />
            </label>

            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-[11.5px] font-semibold text-tinta">
                Programa académico *
              </span>
              <select
                required
                value={programa}
                onChange={(event) => setPrograma(event.target.value)}
                className={inputClass}
              >
                <option value="">Selecciona el programa</option>
                {programas.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nombre}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-[11.5px] font-semibold text-tinta">Semestre</span>
              <select
                value={semestre}
                onChange={(event) => setSemestre(event.target.value)}
                className={inputClass}
              >
                <option value="">Sin semestre</option>
                {SEMESTRES.map((valor) => (
                  <option key={valor} value={valor}>
                    {valor}
                  </option>
                ))}
              </select>
              <span className="mt-1 block text-[10px] leading-relaxed text-muted">
                Obligatorio para calcular el avance en la postulación como tutor.
              </span>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-[11.5px] font-semibold text-tinta">Créditos</span>
              <input
                type="number"
                min={1}
                max={20}
                value={creditos}
                onChange={(event) => setCreditos(event.target.value)}
                className={inputClass}
              />
            </label>
          </div>

          {formError && (
            <p
              role="alert"
              className="mt-4 rounded-2xl border border-peligro/40 bg-[#FDF1EF] px-4 py-3 text-[11.6px] leading-relaxed text-peligro"
            >
              {formError}
            </p>
          )}

          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={cerrarModal}
              disabled={guardando}
              className="h-11 rounded-full bg-mist px-5 text-[12.5px] font-semibold text-tinta transition-colors hover:bg-faint disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="h-11 rounded-full bg-violeta-accion px-6 text-[12.5px] font-semibold text-white transition-colors hover:bg-violeta-profundo disabled:cursor-not-allowed disabled:opacity-60"
            >
              {guardando ? 'Guardando...' : editando ? 'Guardar cambios' : 'Crear materia'}
            </button>
          </div>
        </form>
        </Modal>
      )}

      {materiaAConfirmar && (
        <Modal
          onCerrar={() => setMateriaAConfirmar(null)}
          tituloId="desactivar-materia"
          eyebrow="GT-50 · Desactivar materia"
          eyebrowClassName="text-peligro"
          titulo="Desactivar materia"
          ancho="md"
        >
          <div className="px-6 pb-6 pt-4 sm:px-7">
            <p className="text-[12.4px] leading-relaxed text-muted">
              <strong className="font-semibold text-tinta">{materiaAConfirmar.nombre}</strong> dejará
              de aparecer para nuevos horarios y postulaciones. No se borra: conserva sus horarios e
              inscripciones y puedes reactivarla cuando quieras.
            </p>

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setMateriaAConfirmar(null)}
                className="h-11 rounded-full bg-mist px-5 text-[12.5px] font-semibold text-tinta transition-colors hover:bg-faint"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void cambiarEstado(materiaAConfirmar)}
                className="h-11 rounded-full bg-peligro px-6 text-[12.5px] font-semibold text-white transition-opacity hover:opacity-95"
              >
                Sí, desactivar
              </button>
            </div>
          </div>
        </Modal>
      )}

      <Toast mensaje={toast} />
    </div>
  );
};
