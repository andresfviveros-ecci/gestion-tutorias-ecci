import { useEffect, useState } from "react";

/**
 * Aviso que aparece cuando el interceptor de axios detecta un 401.
 * El access token dura 5 minutos y todavía no hay refresh (BE-03), así que
 * la sesión se cierra y se avisa al usuario en vez de dejar la pantalla vacía.
 */
export const SessionExpiredToast = () => {
  const [visible, setVisible] = useState(
    () => sessionStorage.getItem("auth_expired") === "1"
  );

  useEffect(() => {
    if (!visible) return;

    sessionStorage.removeItem("auth_expired");
    const timer = window.setTimeout(() => setVisible(false), 8000);
    return () => window.clearTimeout(timer);
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-4 bottom-4 z-[100] mx-auto flex max-w-md items-start gap-3 rounded-2xl border border-[#B26A00]/25 bg-[#FFF8EC] px-4 py-3 text-[#7A4A00] shadow-[0_10px_30px_rgba(13,27,42,0.16)] sm:left-1/2 sm:right-auto sm:-translate-x-1/2"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="mt-0.5 h-5 w-5 shrink-0"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-snug">Tu sesión expiró</p>
        <p className="mt-0.5 text-xs leading-relaxed">
          Por seguridad cerramos la sesión. Inicia sesión de nuevo para continuar.
        </p>
      </div>

      <button
        type="button"
        onClick={() => setVisible(false)}
        aria-label="Cerrar aviso"
        className="-mr-1 -mt-1 shrink-0 rounded-lg p-1.5 text-[#7A4A00]/70 transition-colors hover:bg-[#B26A00]/10 hover:text-[#7A4A00] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B26A00]/40"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          className="h-4 w-4"
        >
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </div>
  );
};
