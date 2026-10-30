import React, { useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import axios from "axios";
import { useAuthStore } from "../store/useAuthStore";
import { api } from "../api/axios";
import { esCorreoPermitido, MENSAJE_DOMINIO } from "../config";

const loginSchema = z.object({
  email: z
    .string()
    .email("Correo no válido")
    .refine(esCorreoPermitido, {
      message: MENSAJE_DOMINIO,
    }),
  password: z.string().min(1, "La contraseña es requerida"),
});

type LoginFormData = z.infer<typeof loginSchema>;
type ViewState = "login" | "step1" | "step2" | "step3" | "success";

const inputClass =
  "h-[54px] w-full rounded-full border border-[#858180] bg-white px-6 text-[14.6px] text-tinta placeholder:text-[#5F5C5B] outline-none transition focus:border-violeta-accion focus:ring-4 focus:ring-violeta-accion/15";

const labelClass = "mb-1.5 block text-[12px] font-semibold text-tinta";

const primaryButtonClass =
  "flex h-14 w-full items-center justify-center gap-2 rounded-full bg-violeta-accion text-[15.5px] font-semibold text-white shadow-constelacion-violet transition hover:bg-[#4524DB] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50";

const secondaryLinkClass =
  "text-[13.8px] font-semibold text-tinta transition hover:text-violeta-accion hover:underline";

const AulaLibreLogo: React.FC = () => (
  <div className="flex items-center gap-3">
    <svg
      viewBox="0 0 52 52"
      className="h-10 w-10 text-tinta sm:h-[52px] sm:w-[52px]"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M34 8H17C11.477 8 7 12.477 7 18V34C7 39.523 11.477 44 17 44H35C40.523 44 45 39.523 45 34V24"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <circle cx="41" cy="10" r="6.5" fill="#5433EB" />
    </svg>
    <span className="text-[32px] font-medium leading-none tracking-[-0.02em] text-tinta sm:text-[42.9px]">
      Aula Libre
    </span>
  </div>
);

const ArrowRightIcon: React.FC = () => (
  <svg viewBox="0 0 18 18" className="h-[18px] w-[18px]" fill="none" aria-hidden="true">
    <path d="M3 9h11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <path d="M9.5 4.5 14 9l-4.5 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const EyeIcon: React.FC<{ open: boolean }> = ({ open }) => (
  <svg viewBox="0 0 18 18" className="h-[18px] w-[18px]" fill="none" aria-hidden="true">
    <path
      d="M2 9s2.5-4.5 7-4.5S16 9 16 9s-2.5 4.5-7 4.5S2 9 2 9Z"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="9" cy="9" r="2" stroke="currentColor" strokeWidth="1.4" />
    {!open && (
      <path d="m3 15 12-12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    )}
  </svg>
);

const LockIcon: React.FC = () => (
  <svg viewBox="0 0 14 14" className="h-3.5 w-3.5" fill="none" aria-hidden="true">
    <rect x="2.5" y="6" width="9" height="6" rx="2" stroke="currentColor" strokeWidth="1.2" />
    <path d="M4.5 6V4.5a2.5 2.5 0 0 1 5 0V6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);

const GuideRings: React.FC = () => (
  <div
    className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden"
    aria-hidden="true"
  >
    <div className="h-[760px] w-[760px] shrink-0 rounded-full border border-tinta/[0.07]" />
    <div className="absolute h-[1100px] w-[1100px] shrink-0 rounded-full border border-tinta/[0.05]" />
    <div className="absolute h-[1400px] w-[1400px] shrink-0 rounded-full border border-tinta/[0.035]" />
  </div>
);

const FloatingShowcase: React.FC = () => (
  <div
    className="pointer-events-none absolute inset-0 hidden select-none xl:block"
    aria-hidden="true"
  >
    {/* Estudiante · slot card */}
    <div className="absolute left-[11%] top-[7%] w-[228px] -rotate-6 rounded-[22px] bg-white p-3 shadow-constelacion-float">
      <div className="rounded-[16px] bg-terracota p-3 text-white">
        <span className="rounded-full bg-white/25 px-2 py-0.5 text-[9px] font-semibold">
          Estudiante
        </span>
        <p className="mt-2 text-[10px] font-semibold">Lunes 12</p>
        <div className="flex items-end justify-between">
          <span className="text-[38px] leading-none tracking-[-0.04em]">15:00</span>
          <span className="rounded-full bg-white px-2 py-0.5 text-[9px] font-semibold text-tinta">
            Virtual
          </span>
        </div>
      </div>
      <p className="mt-2 text-[11px] font-semibold text-tinta">Laura Gómez</p>
      <div className="mt-2 rounded-full bg-tinta py-1.5 text-center text-[10px] font-semibold text-white">
        Reservar
      </div>
    </div>

    {/* Tutor · calendar */}
    <div className="absolute right-[11%] top-[6%] w-[248px] rotate-3 rounded-[20px] bg-white p-3 shadow-constelacion-float">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-tinta">Semana 12-18</span>
        <span className="rounded-full bg-tinta px-2 py-0.5 text-[9px] font-semibold text-white">
          Tutor
        </span>
      </div>
      <div className="mt-2 grid grid-cols-4 gap-1.5">
        {[
          "bg-terracota", "bg-white border border-faint", "bg-white border border-faint", "bg-salvia",
          "bg-white border border-faint", "bg-tinta", "bg-white border border-faint", "bg-terracota",
          "bg-white border border-faint", "bg-salvia", "bg-white border border-faint", "bg-white border border-dashed border-pebble",
        ].map((tone, i) => (
          <div key={i} className={`h-9 rounded-[7px] ${tone}`} />
        ))}
      </div>
    </div>

    {/* Horas flotantes */}
    <div className="absolute left-[26%] top-[30%] -rotate-6 rounded-[14px] bg-tinta px-5 py-2.5 text-[22px] tracking-[-0.03em] text-white shadow-constelacion-float">
      10:00
    </div>
    <div className="absolute right-[21%] top-[33%] rotate-3 rounded-[14px] bg-salvia px-5 py-2.5 text-[22px] tracking-[-0.03em] text-tinta shadow-constelacion-float">
      18:00
    </div>

    {/* Coordinador · user pill */}
    <div className="absolute left-[17%] top-[46%] w-[300px] -rotate-3 rounded-full bg-white p-2 pr-4 shadow-constelacion-float">
      <div className="flex items-center gap-2.5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-arena text-[10px] font-semibold text-tinta">
          E1
        </div>
        <div className="min-w-0 flex-1 leading-tight">
          <span className="inline-block rounded-full bg-tinta px-2 py-[3px] text-[8px] font-semibold leading-none text-white">
            Coordinador
          </span>
          <p className="mt-1.5 truncate text-[11px] font-semibold text-tinta">Estudiante1 Prueba</p>
          <p className="truncate text-[8px] text-muted">est1.prueba@ecci.edu.co</p>
        </div>
        <div className="flex h-6 w-11 shrink-0 items-center rounded-full bg-tinta p-0.5">
          <div className="ml-auto h-5 w-5 rounded-full bg-white" />
        </div>
      </div>
    </div>

    {/* Toast */}
    <div className="absolute right-[22%] top-[50%] flex rotate-1 items-center gap-2 rounded-full bg-tinta px-4 py-2.5 shadow-constelacion-float">
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-violeta-accion text-[12px] font-bold text-white">
        ✓
      </span>
      <span className="text-[11px] font-semibold text-white">¡Reserva Agendada!</span>
    </div>
  </div>
);

const RecoveryStepper: React.FC<{ step: 1 | 2 | 3 }> = ({ step }) => {
  const items = [1, 2, 3] as const;

  return (
    <div className="mb-6 flex items-center justify-center">
      {items.map((item, index) => (
        <React.Fragment key={item}>
          {index > 0 && (
            <div
              className={`mx-2 h-px w-10 transition-colors ${
                step > index ? "bg-exito" : "bg-faint"
              }`}
            />
          )}
          <div
            className={`flex h-7 w-7 items-center justify-center rounded-full border text-[11px] font-semibold transition-all ${
              step === item
                ? "border-violeta-accion bg-violeta-accion text-white"
                : step > item
                  ? "border-exito bg-exito text-white"
                  : "border-faint bg-white text-pebble"
            }`}
          >
            {step > item ? "✓" : item}
          </div>
        </React.Fragment>
      ))}
    </div>
  );
};

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const login = useAuthStore((state) => state.login);

  const [currentView, setCurrentView] = useState<ViewState>("login");
  const [authError, setAuthError] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // States para la recuperación
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [recoveryToken, setRecoveryToken] = useState("");
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const [recoveryLoading, setRecoveryLoading] = useState(false);

  // States para OTP / Step 2
  const [otp, setOtp] = useState<string[]>(Array(6).fill(""));
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [step2Error, setStep2Error] = useState<string | null>(null);

  // States para Nueva Contraseña / Step 3
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [step3Error, setStep3Error] = useState<string | null>(null);
  const [step3Loading, setStep3Loading] = useState(false);

  const {
    register,
    handleSubmit,
    reset: resetLoginForm,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  // Helper para procesar errores de axios y evitar HTML crudo de Django (500)
  const getCleanErrorMessage = (err: unknown): string => {
    if (axios.isAxiosError(err)) {
      if (!err.response) {
        return "No se pudo conectar con el servidor. Verifica tu conexión a internet.";
      }
      const status = err.response.status;
      const data = err.response.data;

      if (status >= 500) {
        return "Ocurrió un error interno en el servidor (500). Por favor intenta más tarde.";
      }

      if (typeof data === "string") {
        if (data.includes("<html") || data.includes("<!DOCTYPE")) {
          return "Ocurrió un error en el servidor. Inténtalo de nuevo.";
        }
        return data;
      }

      if (data && typeof data === "object") {
        if (data.detail) return data.detail;
        if (Array.isArray(data.non_field_errors))
          return data.non_field_errors[0];
        const keys = Object.keys(data);
        if (keys.length > 0) {
          const firstErr = data[keys[0]];
          if (Array.isArray(firstErr)) return `${firstErr[0]}`;
          if (typeof firstErr === "string") return firstErr;
        }
      }
    }
    return "Ocurrió un error inesperado. Inténtalo de nuevo.";
  };

  const onLoginSubmit = async (data: LoginFormData) => {
    setAuthError(false);
    const loggedUser = await login(data.email, data.password);

    if (loggedUser) {
      let defaultPath = "/inicio";
      if (loggedUser.role === "admin") defaultPath = "/dashboard";
      if (loggedUser.role === "tutor") defaultPath = "/tutor/dashboard";

      const stateFrom = (location.state as { from?: { pathname?: string } })
        ?.from?.pathname;

      if (stateFrom && stateFrom !== "/") {
        const isTutorRoute = stateFrom.startsWith("/tutor");
        const isAdminRoute = [
          "/dashboard",
          "/estudiantes",
          "/tutores",
          "/coordinadores",
          "/gestionar-usuarios",
        ].includes(stateFrom);
        const isStudentRoute = stateFrom === "/inicio";

        const hasPermission =
          (loggedUser.role === "tutor" && isTutorRoute) ||
          (loggedUser.role === "admin" && isAdminRoute) ||
          (loggedUser.role === "estudiante" && isStudentRoute);

        if (hasPermission) {
          navigate(stateFrom, { replace: true });
          return;
        }
      }

      navigate(defaultPath, { replace: true });
    } else {
      setAuthError(true);
    }
  };

  // PASO 1: Enviar correo y guardar el Token retornado
  const handleRecoverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError(null);

    if (!recoveryEmail) return;

    try {
      setRecoveryLoading(true);
      const res = await api.post("/accounts/recovery/", {
        email: recoveryEmail.trim().toLowerCase(),
      });
      setRecoveryLoading(false);

      if (res.data && res.data.token) {
        setRecoveryToken(res.data.token);
      }
      setCurrentView("step2");
    } catch (err: unknown) {
      setRecoveryLoading(false);
      setRecoveryError(getCleanErrorMessage(err));
    }
  };

  // PASO 2: Verificar la entrada del PIN de 6 dígitos
  const handleOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep2Error(null);

    const pinCode = otp.join("");
    if (pinCode.length < 6) {
      setStep2Error("Por favor ingresa el código completo de 6 dígitos.");
      return;
    }

    if (!recoveryToken) {
      setStep2Error(
        "No se encontró el token de recuperación. Vuelve a solicitar el código.",
      );
      return;
    }

    setCurrentView("step3");
  };

  // PASO 3: Cambiar contraseña llamando a /accounts/recovery/change-password/
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setStep3Error(null);

    if (!isPasswordValid) return;

    try {
      setStep3Loading(true);
      await api.post("/accounts/recovery/change-password/", {
        token: recoveryToken,
        pin: otp.join(""),
        password: newPassword,
        password_confirm: confirmPassword,
      });
      setStep3Loading(false);
      setCurrentView("success");
    } catch (err: unknown) {
      setStep3Loading(false);
      setStep3Error(getCleanErrorMessage(err));
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) value = value.charAt(0);
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").trim().slice(0, 6);
    if (!/^\d+$/.test(pastedData)) return;

    const newOtp = [...otp];
    pastedData.split("").forEach((char, index) => {
      if (index < 6) newOtp[index] = char;
    });
    setOtp(newOtp);

    const nextFocusIndex = Math.min(pastedData.length, 5);
    otpRefs.current[nextFocusIndex]?.focus();
  };

  const hasMin8 = newPassword.length >= 8;
  const hasNum = /\d/.test(newPassword);
  const hasSym = /[!@#$%^&*(),.?":{}|<>_\-/]/.test(newPassword);
  const isMatch = confirmPassword.length > 0 && newPassword === confirmPassword;
  const isPasswordValid = hasMin8 && hasNum && hasSym && isMatch;

  const resetAllForms = () => {
    resetLoginForm();
    setRecoveryEmail("");
    setRecoveryToken("");
    setRecoveryError(null);
    setOtp(Array(6).fill(""));
    setStep2Error(null);
    setNewPassword("");
    setConfirmPassword("");
    setStep3Error(null);
    setAuthError(false);
    setShowPassword(false);
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-mist font-constelacion text-tinta">
      <GuideRings />
      <FloatingShowcase />

      <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-[520px] flex-col items-center justify-center gap-6 px-4 py-10">
        <AulaLibreLogo />

        <section className="w-full max-w-[440px] rounded-[32px] bg-white px-6 py-8 shadow-constelacion-card sm:px-8">
          {["step1", "step2", "step3"].includes(currentView) && (
            <RecoveryStepper
              step={currentView === "step1" ? 1 : currentView === "step2" ? 2 : 3}
            />
          )}

          {/* VISTA LOGIN */}
          {currentView === "login" && (
            <div>
              <h1 className="text-center text-[26.8px] font-medium leading-[33px] tracking-[-0.02em] text-tinta">
                Inicia sesión
              </h1>
              <p className="mt-2 text-center text-[13.4px] leading-[21px] text-[#5F5C5B]">
                Usa tu correo institucional para acceder al panel según tu rol
              </p>

              <form onSubmit={handleSubmit(onLoginSubmit)} className="mt-6 space-y-4">
                <div>
                  <label htmlFor="emailLogin" className={labelClass}>
                    Correo Institucional
                  </label>
                  <input
                    type="email"
                    id="emailLogin"
                    placeholder="nombre@ecci.edu.co"
                    autoComplete="email"
                    {...register("email")}
                    className={`${inputClass} ${
                      errors.email || authError
                        ? "border-peligro focus:border-peligro focus:ring-peligro/15"
                        : ""
                    }`}
                  />
                  {errors.email && (
                    <p className="mt-1 pl-4 text-[11px] font-medium text-peligro">
                      {errors.email.message}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="passwordLogin" className={labelClass}>
                    Contraseña
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      id="passwordLogin"
                      autoComplete="current-password"
                      {...register("password")}
                      className={`${inputClass} pr-16 ${
                        errors.password || authError
                          ? "border-peligro focus:border-peligro focus:ring-peligro/15"
                          : ""
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      aria-label={
                        showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                      }
                      className="absolute right-1.5 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-[#F2F4F5] text-tinta transition hover:bg-faint"
                    >
                      <EyeIcon open={showPassword} />
                    </button>
                  </div>
                  {errors.password && (
                    <p className="mt-1 pl-4 text-[11px] font-medium text-peligro">
                      {errors.password.message}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between gap-3 pt-1">
                  <label className="flex cursor-pointer items-center gap-2 text-[13.7px] text-tinta">
                    <input
                      type="checkbox"
                      className="h-5 w-5 cursor-pointer rounded-[2.5px] border border-[#858180] accent-[#5433EB]"
                    />
                    Recordarme
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setRecoveryError(null);
                      setCurrentView("step1");
                    }}
                    className={secondaryLinkClass}
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>

                {authError && (
                  <div className="rounded-2xl bg-peligro/10 px-4 py-2.5 text-[12px] font-medium text-peligro">
                    Correo o contraseña incorrectos
                  </div>
                )}

                <button type="submit" className={primaryButtonClass}>
                  Iniciar sesión
                  <ArrowRightIcon />
                </button>
              </form>
            </div>
          )}

          {/* VISTA STEP 1: SOLICITAR RECUPERACIÓN */}
          {currentView === "step1" && (
            <div>
              <h2 className="text-center text-[26.8px] font-medium leading-[33px] tracking-[-0.02em] text-tinta">
                ¿Olvidaste tu contraseña?
              </h2>
              <p className="mt-2 text-center text-[13.4px] leading-[21px] text-[#5F5C5B]">
                Ingresa tu correo institucional y te enviaremos un código para
                recuperar el acceso.
              </p>

              <form onSubmit={handleRecoverySubmit} className="mt-6 space-y-4">
                <div>
                  <label htmlFor="recoveryEmail" className={labelClass}>
                    Correo Institucional
                  </label>
                  <input
                    id="recoveryEmail"
                    type="email"
                    required
                    value={recoveryEmail}
                    onChange={(e) => setRecoveryEmail(e.target.value)}
                    placeholder="nombre@ecci.edu.co"
                    className={`${inputClass} ${
                      recoveryError
                        ? "border-peligro focus:border-peligro focus:ring-peligro/15"
                        : ""
                    }`}
                  />
                </div>

                {recoveryError && (
                  <div className="rounded-2xl bg-peligro/10 px-4 py-2.5 text-[12px] font-medium text-peligro">
                    {recoveryError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={recoveryLoading}
                  className={primaryButtonClass}
                >
                  {recoveryLoading ? "Enviando código..." : "Enviar código de recuperación"}
                  <ArrowRightIcon />
                </button>
              </form>

              <div className="mt-5 text-center">
                <button
                  type="button"
                  onClick={() => setCurrentView("login")}
                  className="text-[12.5px] font-medium text-muted transition hover:text-tinta"
                >
                  Volver a iniciar sesión
                </button>
              </div>
            </div>
          )}

          {/* VISTA STEP 2: INGRESAR CÓDIGO/PIN */}
          {currentView === "step2" && (
            <div>
              <h2 className="text-center text-[26.8px] font-medium leading-[33px] tracking-[-0.02em] text-tinta">
                Revisa tu correo
              </h2>
              <p className="mt-2 text-center text-[13.4px] leading-[21px] text-[#5F5C5B]">
                Enviamos un código de 6 dígitos a{" "}
                <strong className="font-semibold text-tinta">
                  {recoveryEmail || "usuario@ecci.edu.co"}
                </strong>
                . Ingrésalo para continuar.
              </p>

              <form onSubmit={handleOtpSubmit} className="mt-6 space-y-5">
                <div className="flex justify-between gap-2">
                  {otp.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => {
                        otpRefs.current[idx] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      onPaste={handleOtpPaste}
                      className="h-[54px] w-full max-w-[54px] rounded-full border border-[#858180] bg-white text-center text-[18px] font-semibold text-tinta outline-none transition focus:border-violeta-accion focus:ring-4 focus:ring-violeta-accion/15"
                    />
                  ))}
                </div>

                {step2Error && (
                  <div className="rounded-2xl bg-peligro/10 px-4 py-2.5 text-center text-[12px] font-medium text-peligro">
                    {step2Error}
                  </div>
                )}

                <p className="text-center text-[11px] text-muted">
                  ¿No llegó nada? Revisa spam o reenvía el código.
                </p>

                <button type="submit" className={primaryButtonClass}>
                  Verificar código
                  <ArrowRightIcon />
                </button>
              </form>

              <div className="mt-5 text-center">
                <button
                  type="button"
                  onClick={() => setCurrentView("step1")}
                  className="text-[12.5px] font-medium text-muted transition hover:text-tinta"
                >
                  Volver
                </button>
              </div>
            </div>
          )}

          {/* VISTA STEP 3: NUEVA CONTRASEÑA */}
          {currentView === "step3" && (
            <div>
              <h2 className="text-center text-[26.8px] font-medium leading-[33px] tracking-[-0.02em] text-tinta">
                Crea una nueva contraseña
              </h2>
              <p className="mt-2 text-center text-[13.4px] leading-[21px] text-[#5F5C5B]">
                Elige una contraseña segura para tu cuenta institucional.
              </p>

              <form onSubmit={handleResetPassword} className="mt-6 space-y-4">
                <div>
                  <label htmlFor="newPassword" className={labelClass}>
                    Nueva contraseña
                  </label>
                  <input
                    id="newPassword"
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className={inputClass}
                  />
                </div>

                <div className="space-y-1.5 py-1">
                  {[
                    { ok: hasMin8, text: "Mínimo 8 caracteres" },
                    { ok: hasNum, text: "Al menos un número" },
                    { ok: hasSym, text: "Al menos un símbolo" },
                  ].map((rule) => (
                    <div
                      key={rule.text}
                      className={`flex items-center gap-1.5 text-[11px] ${
                        rule.ok ? "text-exito" : "text-muted"
                      }`}
                    >
                      <span
                        className={`flex h-3.5 w-3.5 items-center justify-center rounded-full border text-[9px] ${
                          rule.ok
                            ? "border-exito bg-exito text-white"
                            : "border-pebble"
                        }`}
                      >
                        ✓
                      </span>
                      {rule.text}
                    </div>
                  ))}
                </div>

                <div>
                  <label htmlFor="confirmPassword" className={labelClass}>
                    Confirmar contraseña
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`${inputClass} ${
                      confirmPassword.length > 0 && !isMatch
                        ? "border-peligro focus:border-peligro focus:ring-peligro/15"
                        : ""
                    }`}
                  />
                  {confirmPassword.length > 0 && !isMatch && (
                    <p className="mt-1 pl-4 text-[11px] font-medium text-peligro">
                      Las contraseñas no coinciden
                    </p>
                  )}
                </div>

                {step3Error && (
                  <div className="rounded-2xl bg-peligro/10 px-4 py-2.5 text-[12px] font-medium text-peligro">
                    {step3Error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={!isPasswordValid || step3Loading}
                  className={primaryButtonClass}
                >
                  {step3Loading ? "Guardando..." : "Guardar nueva contraseña"}
                  <ArrowRightIcon />
                </button>
              </form>

              <div className="mt-5 text-center">
                <button
                  type="button"
                  onClick={() => setCurrentView("step2")}
                  className="text-[12.5px] font-medium text-muted transition hover:text-tinta"
                >
                  Volver
                </button>
              </div>
            </div>
          )}

          {/* VISTA SUCCESS */}
          {currentView === "success" && (
            <div className="text-center">
              <div className="mb-6 flex justify-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-exito/10 text-exito ring-8 ring-exito/5">
                  <svg
                    className="h-10 w-10"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4.5 12.75l6 6 9-13.5"
                    />
                  </svg>
                </div>
              </div>

              <h2 className="text-[26.8px] font-medium leading-[33px] tracking-[-0.02em] text-tinta">
                Contraseña actualizada
              </h2>
              <p className="mt-2 text-[13.4px] leading-[21px] text-[#5F5C5B]">
                Ya puedes iniciar sesión con tu nueva contraseña. Te
                recomendamos no compartirla con nadie.
              </p>

              <button
                type="button"
                onClick={() => {
                  resetAllForms();
                  setCurrentView("login");
                }}
                className={`${primaryButtonClass} mt-6`}
              >
                Ir a iniciar sesión
                <ArrowRightIcon />
              </button>
            </div>
          )}
        </section>

        <div className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-[11.6px] text-[#5F5C5B] shadow-sm">
          <LockIcon />
          Universidad ECCI · Sede Cali
        </div>
      </main>
    </div>
  );
};
