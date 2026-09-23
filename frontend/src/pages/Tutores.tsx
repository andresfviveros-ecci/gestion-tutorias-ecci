import React, { useState, useEffect, useRef } from 'react';
import { Loader } from '../components/Loader';

interface FacultyOption {
  id: string;
  name: string;
}

interface SubjectOption {
  id: string;
  name: string;
  facultyId: string;
}

interface TutorFacultyGroup {
  facultyName: string;
  subjects: string[];
}

interface Tutor {
  nombre: string;
  id: string;
  correo: string;
  groups: TutorFacultyGroup[];
  totalSubjectsCount: number;
}

// DATOS QUEMADOS DE PRUEBA
const FACULTIES: FacultyOption[] = [
  { id: 'sistemas', name: 'Ingeniería de Sistemas' },
  { id: 'gastronomia', name: 'Gastronomía' },
  { id: 'administracion', name: 'Administración de Empresas' },
  { id: 'diseno', name: 'Diseño Gráfico' },
];

const SUBJECTS: SubjectOption[] = [
  // Sistemas
  { id: 'prog1', name: 'Programación I', facultyId: 'sistemas' },
  { id: 'bd', name: 'Bases de Datos', facultyId: 'sistemas' },
  { id: 'ed', name: 'Estructuras de Datos', facultyId: 'sistemas' },
  { id: 'web', name: 'Desarrollo Web', facultyId: 'sistemas' },
  // Gastronomía
  { id: 'cocina_int', name: 'Cocina Internacional', facultyId: 'gastronomia' },
  { id: 'pasteleria', name: 'Pastelería Básica', facultyId: 'gastronomia' },
  { id: 'enologia', name: 'Enología', facultyId: 'gastronomia' },
  { id: 'higiene', name: 'Higiene Alimentaria', facultyId: 'gastronomia' },
  // Administración
  { id: 'contabilidad', name: 'Contabilidad General', facultyId: 'administracion' },
  { id: 'marketing', name: 'Fundamentos de Marketing', facultyId: 'administracion' },
  { id: 'finanzas', name: 'Gestión Financiera', facultyId: 'administracion' },
  { id: 'rrhh', name: 'Recursos Humanos', facultyId: 'administracion' },
  // Diseño
  { id: 'ilustracion', name: 'Ilustración Digital', facultyId: 'diseno' },
  { id: 'tipografia', name: 'Tipografía', facultyId: 'diseno' },
  { id: 'marca', name: 'Diseño de Marca', facultyId: 'diseno' },
  { id: 'video', name: 'Edición de Video', facultyId: 'diseno' },
];

export const Tutores: React.FC = () => {
  const [loading, setLoading] = useState(true);

  // CAMPOS DE FORMULARIO
  const [nombre, setNombre] = useState('');
  const [identificacion, setIdentificacion] = useState('');
  const [correo, setCorreo] = useState('');

  // SELECCIONES MÚLTIPLES
  const [selectedFaculties, setSelectedFaculties] = useState<FacultyOption[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<SubjectOption[]>([]);

  // BÚSQUEDA Y MENÚS DESPLEGABLES
  const [facultyQuery, setFacultyQuery] = useState('');
  const [subjectQuery, setSubjectQuery] = useState('');
  const [showFacultyDropdown, setShowFacultyDropdown] = useState(false);
  const [showSubjectDropdown, setShowSubjectDropdown] = useState(false);

  const facultyRef = useRef<HTMLDivElement>(null);
  const subjectRef = useRef<HTMLDivElement>(null);

  // ALERTAS Y ERRORES
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState({
    nombre: false,
    identificacion: false,
    correo: false,
    facultades: false,
    materias: false,
  });

  // REGISTROS DE TUTORES
  const [tutores, setTutores] = useState<Tutor[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1400);
    return () => clearTimeout(timer);
  }, []);

  // CERRAR DESPLEGABLES AL HACER CLIC FUERA
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (facultyRef.current && !facultyRef.current.contains(event.target as Node)) {
        setShowFacultyDropdown(false);
      }
      if (subjectRef.current && !subjectRef.current.contains(event.target as Node)) {
        setShowSubjectDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // OPCIONES DISPONIBLES FILTRADAS
  const availableFaculties = FACULTIES.filter(
    (f) =>
      !selectedFaculties.some((sf) => sf.id === f.id) &&
      f.name.toLowerCase().includes(facultyQuery.toLowerCase())
  );

  const availableSubjects = SUBJECTS.filter(
    (s) =>
      selectedFaculties.some((sf) => sf.id === s.facultyId) &&
      !selectedSubjects.some((ss) => ss.id === s.id) &&
      s.name.toLowerCase().includes(subjectQuery.toLowerCase())
  );

  // ACCIONES FACULTADES
  const handleSelectFaculty = (faculty: FacultyOption) => {
    setSelectedFaculties([...selectedFaculties, faculty]);
    setFacultyQuery('');
    setShowFacultyDropdown(false);
    setErrors((prev) => ({ ...prev, facultades: false }));
  };

  const handleRemoveFaculty = (id: string) => {
    setSelectedFaculties(selectedFaculties.filter((f) => f.id !== id));
    setSelectedSubjects(selectedSubjects.filter((s) => s.facultyId !== id));
  };

  // ACCIONES MATERIAS
  const handleSelectSubject = (subject: SubjectOption) => {
    setSelectedSubjects([...selectedSubjects, subject]);
    setSubjectQuery('');
    setShowSubjectDropdown(false);
    setErrors((prev) => ({ ...prev, materias: false }));
  };

  const handleRemoveSubject = (id: string) => {
    setSelectedSubjects(selectedSubjects.filter((s) => s.id !== id));
  };

  // SUBMIT FORMULARIO
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors = {
      nombre: !nombre.trim(),
      identificacion: !identificacion.trim(),
      correo: !correo.trim(),
      facultades: selectedFaculties.length === 0,
      materias: selectedSubjects.length === 0,
    };

    setErrors(newErrors);

    if (
      newErrors.nombre ||
      newErrors.identificacion ||
      newErrors.correo ||
      newErrors.facultades ||
      newErrors.materias
    ) {
      setAlertMessage('Completa los campos obligatorios antes de registrar.');
      return;
    }

    const duplicado = tutores.some(
      (t) => t.id === identificacion.trim() || t.correo.toLowerCase() === correo.trim().toLowerCase()
    );

    if (duplicado) {
      setAlertMessage('Ya existe un tutor registrado con ese correo o número de identificación.');
      return;
    }

    // AGRUPAR MATERIAS POR FACULTAD
    const facultyMap = new Map<string, string[]>();
    selectedSubjects.forEach((sub) => {
      const fac = FACULTIES.find((f) => f.id === sub.facultyId);
      const facName = fac ? fac.name : 'Facultad';
      if (!facultyMap.has(facName)) {
        facultyMap.set(facName, []);
      }
      facultyMap.get(facName)!.push(sub.name);
    });

    const groups: TutorFacultyGroup[] = [];
    let totalSubjectsCount = 0;
    facultyMap.forEach((subjects, facultyName) => {
      groups.push({ facultyName, subjects });
      totalSubjectsCount += subjects.length;
    });

    setAlertMessage(null);

    setTutores([
      ...tutores,
      {
        nombre: nombre.trim(),
        id: identificacion.trim(),
        correo: correo.trim(),
        groups,
        totalSubjectsCount,
      },
    ]);

    limpiarFormulario();
  };

  const limpiarFormulario = () => {
    setNombre('');
    setIdentificacion('');
    setCorreo('');
    setSelectedFaculties([]);
    setSelectedSubjects([]);
    setFacultyQuery('');
    setSubjectQuery('');
    setErrors({
      nombre: false,
      identificacion: false,
      correo: false,
      facultades: false,
      materias: false,
    });
    setAlertMessage(null);
  };

  return (
    <div className="w-full flex flex-col bg-[#f7f5ed] h-screen overflow-hidden">
      <Loader hidden={!loading} />

      {/* HEADER SUPERIOR BLANCO */}
      <header className="w-full h-14 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0">
        <div className="text-[0.82rem] text-slate-500">
          Usuarios / <span className="font-semibold text-[#0d1b2a]">Registrar tutor</span>
        </div>
        <div className="text-xs font-semibold text-slate-600">Administrador</div>
      </header>

      {/* ÁREA DE CONTENIDO */}
      <main className="px-8 py-6 w-full max-w-[1400px] mx-auto flex-1 flex flex-col justify-start space-y-4 overflow-hidden">
        <div>
          <h1 className="font-display italic text-3xl font-semibold text-[#0d1b2a] mb-1">
            Registrar tutor
          </h1>
          <p className="text-[0.83rem] text-slate-500">
            Completa los datos del tutor para habilitarlo a gestionar su disponibilidad y dictar tutorías.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* FORMULARIO */}
          <div className="lg:col-span-5 bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
            {alertMessage && (
              <div className="mb-4 p-3.5 bg-rose-100 border border-rose-300 text-rose-800 rounded-lg text-xs leading-relaxed flex items-start gap-2">
                <i className="fa-solid fa-triangle-exclamation mt-0.5"></i>
                <div>{alertMessage}</div>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate className="space-y-3.5">
              {/* NOMBRE COMPLETO */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Nombre completo <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  className={`w-full h-10 px-3.5 text-xs bg-white border rounded-md outline-none transition-all ${
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

              {/* IDENTIFICACIÓN Y DEPARTAMENTO / FACULTAD */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    N.º de identificación <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    className={`w-full h-10 px-3.5 text-xs bg-white border rounded-md outline-none transition-all ${
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

                {/* FACULTAD - ELIMINA EL ÚLTIMO ELEMENTO AL PRESIONAR BACKSPACE */}
                <div className="relative" ref={facultyRef}>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Departamento / facultad <span className="text-rose-500">*</span>
                  </label>
                  <div
                    className={`min-h-[40px] max-h-[66px] overflow-y-auto overflow-x-hidden p-1.5 px-3 bg-white border rounded-md flex flex-wrap items-center gap-1.5 cursor-text transition-all ${
                      errors.facultades
                        ? 'border-rose-500 ring-2 ring-rose-500/15'
                        : 'border-slate-200 focus-within:border-[#0d1b2a] focus-within:ring-2 focus-within:ring-[#0d1b2a]/10'
                    }`}
                    onClick={() => setShowFacultyDropdown(true)}
                  >
                    {selectedFaculties.map((fac) => (
                      <span
                        key={fac.id}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#0d1b2a] text-white max-w-full"
                      >
                        <span className="truncate max-w-[170px]">{fac.name}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveFaculty(fac.id);
                          }}
                          className="hover:text-rose-300 font-bold ml-0.5 shrink-0"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                    <input
                      type="text"
                      className="flex-1 min-w-[60px] bg-transparent outline-none text-xs"
                      placeholder={selectedFaculties.length === 0 ? 'Buscar...' : ''}
                      value={facultyQuery}
                      onChange={(e) => {
                        setFacultyQuery(e.target.value);
                        setShowFacultyDropdown(true);
                      }}
                      onFocus={() => setShowFacultyDropdown(true)}
                      onKeyDown={(e) => {
                        if (e.key === 'Backspace' && facultyQuery === '' && selectedFaculties.length > 0) {
                          const lastFaculty = selectedFaculties[selectedFaculties.length - 1];
                          handleRemoveFaculty(lastFaculty.id);
                        }
                      }}
                    />
                  </div>

                  {showFacultyDropdown && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg z-50 max-h-36 overflow-y-auto">
                      {availableFaculties.length === 0 ? (
                        <div className="p-2.5 text-xs text-slate-400 text-center">
                          No hay más facultades
                        </div>
                      ) : (
                        availableFaculties.map((fac) => (
                          <div
                            key={fac.id}
                            className="px-3 py-2 text-xs text-slate-700 hover:bg-slate-100 cursor-pointer transition-colors"
                            onClick={() => handleSelectFaculty(fac)}
                          >
                            {fac.name}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* CORREO INSTITUCIONAL */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Correo institucional <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  className={`w-full h-10 px-3.5 text-xs bg-white border rounded-md outline-none transition-all ${
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

              {/* MATERIAS - ELIMINA EL ÚLTIMO ELEMENTO AL PRESIONAR BACKSPACE */}
              <div className="relative" ref={subjectRef}>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Materias que puede tutorar <span className="text-rose-500">*</span>
                </label>
                <div
                  className={`min-h-[40px] max-h-[40px] overflow-y-auto overflow-x-hidden p-1.5 px-3 bg-white border rounded-md flex flex-wrap items-center gap-1.5 cursor-text transition-all ${
                    errors.materias
                      ? 'border-rose-500 ring-2 ring-rose-500/15'
                      : 'border-slate-200 focus-within:border-[#0d1b2a] focus-within:ring-2 focus-within:ring-[#0d1b2a]/10'
                  }`}
                  onClick={() => setShowSubjectDropdown(true)}
                >
                  {selectedSubjects.map((sub) => (
                    <span
                      key={sub.id}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-700 text-white max-w-full"
                    >
                      <span className="truncate max-w-[170px]">{sub.name}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveSubject(sub.id);
                        }}
                        className="hover:text-rose-300 font-bold ml-0.5 shrink-0"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    className="flex-1 min-w-[80px] bg-transparent outline-none text-xs"
                    placeholder={
                      selectedFaculties.length === 0
                        ? 'Elige primero facultad...'
                        : selectedSubjects.length === 0
                        ? 'Buscar materias...'
                        : ''
                    }
                    disabled={selectedFaculties.length === 0}
                    value={subjectQuery}
                    onChange={(e) => {
                      setSubjectQuery(e.target.value);
                      setShowSubjectDropdown(true);
                    }}
                    onFocus={() => setShowSubjectDropdown(true)}
                    onKeyDown={(e) => {
                      if (e.key === 'Backspace' && subjectQuery === '' && selectedSubjects.length > 0) {
                        const lastSubject = selectedSubjects[selectedSubjects.length - 1];
                        handleRemoveSubject(lastSubject.id);
                      }
                    }}
                  />
                </div>

                {showSubjectDropdown && selectedFaculties.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg z-50 max-h-36 overflow-y-auto">
                    {availableSubjects.length === 0 ? (
                      <div className="p-2.5 text-xs text-slate-400 text-center">
                        No hay más materias disponibles
                      </div>
                    ) : (
                      availableSubjects.map((sub) => (
                        <div
                          key={sub.id}
                          className="px-3 py-2 text-xs text-slate-700 hover:bg-slate-100 cursor-pointer transition-colors flex justify-between items-center"
                          onClick={() => handleSelectSubject(sub)}
                        >
                          <span>{sub.name}</span>
                          <span className="text-[10px] text-slate-400 font-medium">
                            {FACULTIES.find((f) => f.id === sub.facultyId)?.name}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* CAJA ROL TUTOR */}
              <div className="bg-emerald-100/70 border border-emerald-200 rounded-lg p-3 flex items-center gap-3 my-2">
                <span className="bg-[#1f7a5c] text-white text-[0.7rem] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                  TUTOR
                </span>
                <span className="text-xs text-emerald-900 font-medium">
                  Rol asignado automáticamente
                </span>
              </div>

              {/* BOTONES */}
              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  className="flex-[1.2] h-10 bg-[#0d1b2a] hover:bg-[#1e2d4a] text-white font-semibold text-xs rounded-md transition-colors"
                >
                  Registrar tutor
                </button>
                <button
                  type="button"
                  onClick={limpiarFormulario}
                  className="flex-[0.8] h-10 bg-transparent hover:bg-slate-50 text-[#0d1b2a] border border-slate-200 font-semibold text-xs rounded-md transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>

          {/* TABLA CON AGRUPACIÓN Y FILAS COHERENTES */}
          <div className="lg:col-span-7 bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[0.88rem] font-bold text-[#0d1b2a] uppercase tracking-wider">
                Tutores registrados recientemente
              </h3>
              <span className="text-xs text-slate-500">
                {tutores.length} registro{tutores.length !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 uppercase text-[0.7rem] tracking-wider font-bold">
                    <th className="pb-3 px-2">TUTOR</th>
                    <th className="pb-3 px-2">IDENTIFICACION</th>
                    <th className="pb-3 px-2">CORREO</th>
                    <th className="pb-3 px-2">FACULTAD</th>
                    <th className="pb-3 px-2">MATERIAS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {tutores.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400 font-medium text-xs">
                        No hay tutores registrados aún.
                      </td>
                    </tr>
                  ) : (
                    tutores.map((tutor, tIndex) => (
                      <React.Fragment key={tIndex}>
                        {tutor.groups.map((group, gIndex) =>
                          group.subjects.map((subject, sIndex) => {
                            const isFirstTutorRow = gIndex === 0 && sIndex === 0;
                            const isFirstFacultyRow = sIndex === 0;

                            return (
                              <tr
                                key={`${tIndex}-${gIndex}-${sIndex}`}
                                className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors"
                              >
                                {/* DATOS AGRUPADOS DEL TUTOR */}
                                {isFirstTutorRow && (
                                  <>
                                    <td
                                      rowSpan={tutor.totalSubjectsCount}
                                      className="py-3 px-2 font-semibold text-[#0d1b2a] align-top bg-white border-r border-slate-100"
                                    >
                                      {tutor.nombre}
                                    </td>
                                    <td
                                      rowSpan={tutor.totalSubjectsCount}
                                      className="py-3 px-2 align-top bg-white border-r border-slate-100"
                                    >
                                      {tutor.id}
                                    </td>
                                    <td
                                      rowSpan={tutor.totalSubjectsCount}
                                      className="py-3 px-2 align-top bg-white border-r border-slate-100"
                                    >
                                      {tutor.correo}
                                    </td>
                                  </>
                                )}

                                {/* FACULTAD UNIFICADA POR GRUPO */}
                                {isFirstFacultyRow && (
                                  <td
                                    rowSpan={group.subjects.length}
                                    className="py-3 px-2 align-top bg-white border-r border-slate-100"
                                  >
                                    <span className="bg-slate-100 text-slate-700 text-[10px] px-2 py-0.5 rounded font-semibold border border-slate-200 inline-block">
                                      {group.facultyName}
                                    </span>
                                  </td>
                                )}

                                {/* MATERIA INDIVIDUAL */}
                                <td className="py-2.5 px-2 align-middle">
                                  <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded font-semibold inline-block">
                                    {subject}
                                  </span>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </React.Fragment>
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