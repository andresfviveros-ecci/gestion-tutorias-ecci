import { useLayoutEffect, useRef, useState, type FC } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { useAuthStore, type ResultadoCierre } from '../../store/useAuthStore';
import {
  prefiereMenosMovimiento,
  useTransicionSesion,
  type Transicion,
} from '../../store/useTransicionSesion';

gsap.registerPlugin(DrawSVGPlugin);

/**
 * Cortina de pantalla completa para entrar al panel y para cerrar sesión.
 *
 * 1. Crece en círculo desde el botón que se pulsó y dibuja el logo de Aula Libre.
 * 2. Espera a que el backend responda (salida) y a que termine la presentación.
 * 3. Cambia el estado a «listo», hace el cambio de ruta tapado por la cortina
 *    y se recoge hacia el centro dejando ver la pantalla nueva.
 */

type Estado = 'trabajando' | ResultadoCierre | 'listo';

/** Cuánto dura como mínimo, para que no parpadee si el backend responde al instante. */
const MINIMO_MS = 1700;

const MENSAJES: Record<Estado, string> = {
  trabajando: '',
  listo: 'Todo listo',
  revocada: 'Sesión cerrada de forma segura',
  vencida: 'Sesión cerrada · ya había vencido en el servidor',
  sin_conexion: 'Sesión cerrada en este equipo · el servidor no respondió',
};

const primerNombre = (nombre: string) => nombre.trim().split(/\s+/)[0] ?? '';

const esperar = (ms: number) => new Promise<void>((resolver) => window.setTimeout(resolver, ms));

/** Dos cuadros: React ya pintó el cambio de estado o de ruta. */
const siguienteCuadro = () =>
  new Promise<void>((resolver) => requestAnimationFrame(() => requestAnimationFrame(() => resolver())));

const terminada = (animacion: gsap.core.Animation) =>
  new Promise<void>((resolver) => {
    animacion.eventCallback('onComplete', () => resolver());
  });

const Palabra: FC<{ texto: string }> = ({ texto }) => (
  <span className="inline-flex overflow-hidden pb-[0.12em]">
    {texto.split('').map((letra, i) => (
      <span key={i} data-letra className="inline-block will-change-transform">
        {letra}
      </span>
    ))}
  </span>
);

const IconoEstado: FC<{ estado: Estado }> = ({ estado }) => {
  if (estado === 'trabajando') {
    return (
      <span
        aria-hidden="true"
        className="h-3.5 w-3.5 animate-spin rounded-full border-[1.5px] border-white/25 border-t-white/80"
      />
    );
  }
  const aviso = estado === 'sin_conexion';
  return (
    <span
      data-icono-estado
      aria-hidden="true"
      className={`flex h-[18px] w-[18px] items-center justify-center rounded-full ${
        aviso ? 'bg-advertencia' : 'bg-exito'
      }`}
    >
      <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="none">
        {aviso ? (
          <path d="M6 3v3.5M6 8.6v.1" stroke="white" strokeWidth="1.6" strokeLinecap="round" />
        ) : (
          <path d="m2.8 6.2 2 2 4.4-4.6" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        )}
      </svg>
    </span>
  );
};

const Cortina: FC<{ transicion: Transicion }> = ({ transicion }) => {
  const navigate = useNavigate();
  // En una ref: tras navegar cambia la función y no debe reiniciar la animación.
  const navegar = useRef(navigate);
  useLayoutEffect(() => {
    navegar.current = navigate;
  });
  const terminar = useTransicionSesion((state) => state.terminar);
  const raiz = useRef<HTMLDivElement>(null);
  const [estado, setEstado] = useState<Estado>('trabajando');

  const salida = transicion.tipo === 'salida';
  const nombre = primerNombre(transicion.nombre);
  const saludo = salida
    ? nombre ? `Hasta pronto, ${nombre}` : 'Hasta pronto'
    : nombre ? `Hola, ${nombre}` : 'Hola';
  const mensajeTrabajando = salida ? 'Revocando tu acceso en el servidor…' : 'Preparando tu panel…';
  const mensaje = estado === 'trabajando' ? mensajeTrabajando : MENSAJES[estado];

  // Layout: la cortina se prepara antes de pintarse y no parpadea entera.
  useLayoutEffect(() => {
    const el = raiz.current;
    if (!el) return;

    let cancelado = false;
    const reducir = prefiereMenosMovimiento();
    const q = gsap.utils.selector(el);
    const ctx = gsap.context(() => undefined, el);
    const inicio = performance.now();

    const { innerWidth: ancho, innerHeight: alto } = window;
    const { x, y } = transicion.origen ?? { x: ancho / 2, y: alto / 2 };
    const radio = Math.hypot(Math.max(x, ancho - x), Math.max(y, alto - y)) + 24;

    let intro!: gsap.core.Timeline;
    ctx.add(() => {
      intro = gsap.timeline({ defaults: { ease: 'expo.out' } });
      if (reducir) {
        intro.fromTo(el, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.25, ease: 'none' });
        intro.set(q('[data-barra]'), { scaleX: 0.72 });
        return;
      }

      intro
        .fromTo(
          el,
          { clipPath: `circle(0px at ${x}px ${y}px)` },
          { clipPath: `circle(${radio}px at ${x}px ${y}px)`, duration: 0.85, ease: 'expo.inOut' },
        )
        .from(q('[data-brillo]'), { autoAlpha: 0, scale: 0.6, duration: 1.4 }, '-=0.45')
        .from(q('[data-anillo]'), { autoAlpha: 0, scale: 0.55, duration: 1.2, stagger: 0.09 }, '<')
        .fromTo(
          q('[data-trazo]'),
          { drawSVG: '0% 0%' },
          { drawSVG: '0% 100%', duration: 0.95, ease: 'power2.inOut' },
          '<0.05',
        )
        .from(
          q('[data-punto]'),
          { scale: 0, y: -22, transformOrigin: '50% 50%', duration: 0.75, ease: 'back.out(3.2)' },
          '-=0.4',
        )
        .from(q('[data-letra]'), { yPercent: 115, duration: 0.75, stagger: 0.03 }, '-=0.6')
        .from(q('[data-saludo]'), { autoAlpha: 0, y: 10, duration: 0.6 }, '-=0.5')
        .from(q('[data-progreso]'), { autoAlpha: 0, y: 8, duration: 0.5 }, '-=0.45')
        .fromTo(q('[data-barra]'), { scaleX: 0 }, { scaleX: 0.72, duration: 1.3, ease: 'power2.out' }, '<');

      // Pulso del punto violeta mientras se espera al servidor.
      gsap.fromTo(
        q('[data-pulso]'),
        { scale: 1, autoAlpha: 0.55, transformOrigin: '50% 50%' },
        { scale: 2.8, autoAlpha: 0, duration: 1.5, repeat: -1, ease: 'power2.out', delay: 1.3, immediateRender: false },
      );
      // Los anillos giran despacio, como el fondo del login.
      gsap.to(q('[data-anillos]'), { rotation: 360, duration: 60, repeat: -1, ease: 'none' });
    });

    const correr = async () => {
      const tarea: Promise<Estado> = transicion.tipo === 'salida' ? transicion.tarea : Promise.resolve('listo');
      const restante = Math.max(0, (reducir ? 400 : MINIMO_MS) - (performance.now() - inicio));
      const [resultado] = await Promise.all([tarea, terminada(intro), esperar(restante)]);
      if (cancelado) return;

      // Cambio de mensaje: sale el de espera, entra el resultado con su icono.
      let ocultar!: gsap.core.Tween;
      ctx.add(() => {
        ocultar = gsap.to(q('[data-estado]'), { autoAlpha: 0, y: -6, duration: reducir ? 0.01 : 0.2 });
      });
      await terminada(ocultar);
      if (cancelado) return;
      setEstado(resultado);
      await siguienteCuadro();
      if (cancelado) return;

      let final!: gsap.core.Timeline;
      ctx.add(() => {
        final = gsap.timeline();
        final
          .fromTo(q('[data-estado]'), { autoAlpha: 0, y: 6 }, { autoAlpha: 1, y: 0, duration: 0.3, ease: 'power2.out' })
          .to(q('[data-barra]'), { scaleX: 1, duration: 0.45, ease: 'power3.out' }, '<')
          .from(q('[data-icono-estado]'), { scale: 0, duration: 0.45, ease: 'back.out(3)' }, '<0.05')
          .to({}, { duration: resultado === 'sin_conexion' ? 1.1 : 0.55 });
      });
      await terminada(final);
      if (cancelado) return;

      // El cambio de ruta pasa detrás de la cortina.
      if (transicion.tipo === 'salida') {
        useAuthStore.getState().logout();
        navegar.current('/', { replace: true, state: {} });
      } else {
        navegar.current(transicion.destino, { replace: true });
      }
      await siguienteCuadro();
      if (cancelado) return;

      let salidaCortina!: gsap.core.Timeline;
      ctx.add(() => {
        salidaCortina = gsap.timeline();
        if (reducir) {
          salidaCortina.to(el, { autoAlpha: 0, duration: 0.25 });
          return;
        }
        salidaCortina
          .to(q('[data-contenido]'), { autoAlpha: 0, scale: 0.94, y: -10, duration: 0.4, ease: 'power2.in' })
          .to(q('[data-anillo]'), { autoAlpha: 0, scale: 1.15, duration: 0.5, stagger: 0.05, ease: 'power2.in' }, '<')
          .to(
            el,
            {
              clipPath: `circle(0px at ${ancho / 2}px ${alto / 2}px)`,
              duration: 0.8,
              ease: 'expo.inOut',
            },
            '-=0.15',
          );
      });
      await terminada(salidaCortina);
      if (!cancelado) terminar();
    };

    void correr();

    return () => {
      cancelado = true;
      ctx.revert();
    };
  }, [transicion, terminar]);

  return (
    <div
      ref={raiz}
      role="status"
      aria-live="polite"
      aria-busy={estado === 'trabajando'}
      className="fixed inset-0 z-[300] flex items-center justify-center overflow-hidden bg-tinta font-constelacion text-white"
    >
      {/* Brillo violeta y anillos guía, como el fondo del login. */}
      <div
        data-brillo
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 h-[720px] w-[720px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(84,51,235,0.38)_0%,rgba(84,51,235,0.08)_45%,transparent_70%)]"
      />
      <div data-anillos aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center">
        {[320, 560, 860, 1200].map((tam, i) => (
          <div
            key={tam}
            data-anillo
            className="absolute shrink-0 rounded-full border border-white"
            style={{ width: tam, height: tam, opacity: 0.11 - i * 0.022, borderStyle: i === 1 ? 'dashed' : 'solid' }}
          />
        ))}
      </div>

      <div data-contenido className="relative flex flex-col items-center px-6 text-center">
        <svg viewBox="0 0 52 52" className="h-[92px] w-[92px] overflow-visible" fill="none" aria-hidden="true">
          <path
            data-trazo
            d="M34 8H17C11.477 8 7 12.477 7 18V34C7 39.523 11.477 44 17 44H35C40.523 44 45 39.523 45 34V24"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <circle data-pulso cx="41" cy="10" r="6.5" fill="#6D3EF4" opacity="0" />
          <circle data-punto cx="41" cy="10" r="6.5" fill="#6D3EF4" />
        </svg>

        <p className="mt-6 flex gap-[0.28em] text-[40px] font-medium leading-none tracking-[-0.02em] sm:text-[48px]">
          <Palabra texto="Aula" />
          <Palabra texto="Libre" />
        </p>

        <p data-saludo className="mt-4 text-[15px] font-medium text-white/70">
          {saludo}
        </p>

        <div data-progreso className="mt-8 flex flex-col items-center gap-3">
          <div className="h-[3px] w-[200px] overflow-hidden rounded-full bg-white/10">
            <div data-barra className="h-full w-full origin-left scale-x-0 rounded-full bg-violeta" />
          </div>
          <p data-estado className="flex min-h-[20px] items-center gap-2 text-[12px] text-white/60">
            <IconoEstado estado={estado} />
            {mensaje}
          </p>
        </div>
      </div>
    </div>
  );
};

/** Se monta una vez dentro del router; solo pinta algo mientras hay una transición. */
export const PantallaSesion = () => {
  const transicion = useTransicionSesion((state) => state.transicion);
  return transicion ? <Cortina transicion={transicion} /> : null;
};
