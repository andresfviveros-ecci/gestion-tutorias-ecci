import React, { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import gsap from "gsap";
import { useAuthStore } from "../store/useAuthStore";

const loginSchema = z.object({
  email: z
    .string()
    .email("Correo no válido")
    .refine((val) => val.endsWith("@ecci.edu.co"), {
      message: "Debe ser correo institucional @ecci.edu.co",
    }),
  password: z.string().min(1, "La contraseña es requerida"),
});

type LoginFormData = z.infer<typeof loginSchema>;
type ViewState = "login" | "step1" | "step2" | "step3" | "success";

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);

  const [currentView, setCurrentView] = useState<ViewState>("login");
  const [loaderVisible, setLoaderVisible] = useState(true);
  const [typedTitle, setTypedTitle] = useState("");
  const [authError, setAuthError] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState("");

  const [otp, setOtp] = useState<string[]>(Array(6).fill(""));
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const panelLeftRef = useRef<HTMLDivElement>(null);
  const formCardRef = useRef<HTMLDivElement>(null);

  const fullText = "Aula Libre";

  const typeWriterEffect = () => {
    setTypedTitle("");
    let i = 0;
    const interval = setInterval(() => {
      if (i < fullText.length) {
        setTypedTitle(fullText.substring(0, i + 1));
        i++;
      } else {
        clearInterval(interval);
      }
    }, 120);
  };

  const triggerLoaderAndReset = (callback?: () => void) => {
    setLoaderVisible(true);
    setTypedTitle("");
    setTimeout(() => {
      setLoaderVisible(false);
      if (callback) callback();
      setTimeout(typeWriterEffect, 300);
    }, 2200);
  };

  useEffect(() => {
    setTimeout(() => {
      setLoaderVisible(false);
      setTimeout(typeWriterEffect, 300);
    }, 2200);

    const ctx = gsap.context(() => {
      gsap.fromTo(
        panelLeftRef.current,
        { x: -50, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.8, ease: "power2.out" },
      );
      gsap.fromTo(
        formCardRef.current,
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, delay: 0.2, ease: "power2.out" },
      );
    });

    return () => ctx.revert();
  }, []);

  const {
    register,
    handleSubmit,
    reset: resetLoginForm,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onLoginSubmit = (data: LoginFormData) => {
    setAuthError(false);
    const success = login(data.email, data.password);

    if (success) {
      triggerLoaderAndReset(() => {
        navigate("/dashboard");
      });
    } else {
      setAuthError(true);
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

  const hasMin8 = newPassword.length >= 8;
  const hasNum = /\d/.test(newPassword);
  const hasSym = /[!@#$%^&*(),.?":{}|<>_\-/]/.test(newPassword);
  const isMatch = confirmPassword.length > 0 && newPassword === confirmPassword;
  const isPasswordValid = hasMin8 && hasNum && hasSym && isMatch;

  const resetAllForms = () => {
    resetLoginForm();
    setRecoveryEmail("");
    setOtp(Array(6).fill(""));
    setNewPassword("");
    setConfirmPassword("");
    setAuthError(false);
  };

  return (
    <div className="flex min-h-screen w-full bg-[#f7f5ed] font-body overflow-hidden">
      <div
        className={`fixed inset-0 z-[9999] flex items-center justify-center bg-[#0d1b2a]/85 backdrop-blur-[14px] transition-all duration-500 ${
          loaderVisible
            ? "opacity-100 visible"
            : "opacity-0 invisible pointer-events-none"
        }`}
      >
        <svg
          className="w-[260px] h-[60px] overflow-visible"
          viewBox="0 0 240 60"
        >
          <text x="50%" y="42" textAnchor="middle" className="loader-text">
            Aula Libre
          </text>
        </svg>
      </div>

      <div
        ref={panelLeftRef}
        className="relative hidden md:flex md:w-[55%] bg-[#0d1b2a] text-[#f7f5ed] flex-col justify-center p-16 overflow-hidden"
      >
        <img
          src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=1200&auto=format&fit=crop"
          alt="Fondo Tutorías"
          className="absolute inset-0 w-full h-full object-cover object-[center_90%] opacity-20 grayscale pointer-events-none [mask-image:linear-gradient(to_top,rgba(0,0,0,1)_0%,rgba(0,0,0,0)_80%)]"
        />
        <div className="relative z-10 min-h-[4.5rem]">
          <h1 className="font-display italic text-4xl md:text-5xl font-semibold">
            <span>{typedTitle}</span>
            <span className="animate-blink ml-1">|</span>
          </h1>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8 bg-[#f7f5ed]">
        <div ref={formCardRef} className="w-full max-w-[380px]">
          {["step1", "step2", "step3"].includes(currentView) && (
            <div className="flex items-center justify-center mb-8">
              <div
                className={`w-7 h-7 rounded-full border flex items-center justify-center text-xs font-semibold transition-all ${
                  currentView === "step1"
                    ? "bg-[#0d1b2a] text-white border-[#0d1b2a]"
                    : "bg-[#1f7a5c] text-white border-[#1f7a5c]"
                }`}
              >
                {currentView !== "step1" ? "✓" : "1"}
              </div>

              <div
                className={`flex-1 max-w-[50px] h-[1px] mx-2 transition-colors ${
                  ["step2", "step3"].includes(currentView)
                    ? "bg-[#1f7a5c]"
                    : "bg-slate-200"
                }`}
              />

              <div
                className={`w-7 h-7 rounded-full border flex items-center justify-center text-xs font-semibold transition-all ${
                  currentView === "step2"
                    ? "bg-[#0d1b2a] text-white border-[#0d1b2a]"
                    : currentView === "step3"
                      ? "bg-[#1f7a5c] text-white border-[#1f7a5c]"
                      : "bg-white text-slate-400 border-slate-300"
                }`}
              >
                {currentView === "step3" ? "✓" : "2"}
              </div>

              <div
                className={`flex-1 max-w-[50px] h-[1px] mx-2 transition-colors ${
                  currentView === "step3" ? "bg-[#1f7a5c]" : "bg-slate-200"
                }`}
              />

              <div
                className={`w-7 h-7 rounded-full border flex items-center justify-center text-xs font-semibold transition-all ${
                  currentView === "step3"
                    ? "bg-[#0d1b2a] text-white border-[#0d1b2a]"
                    : "bg-white text-slate-400 border-slate-300"
                }`}
              >
                3
              </div>
            </div>
          )}

          {currentView === "login" && (
            <div>
              <h2 className="font-display italic text-3xl font-semibold text-slate-800 mb-2">
                Inicia sesión
              </h2>
              <p className="text-xs text-slate-500 mb-8 leading-relaxed">
                Usa tu correo institucional para acceder al panel según tu rol
              </p>

              <form
                onSubmit={handleSubmit(onLoginSubmit)}
                className="space-y-5"
              >
                <div className="relative">
                  <input
                    type="email"
                    id="emailLogin"
                    placeholder=" "
                    {...register("email")}
                    className={`peer w-full h-[52px] pt-5 pb-1 px-3.5 text-sm bg-white border rounded-md outline-none transition-all ${
                      errors.email || authError
                        ? "border-red-500 ring-2 ring-red-500/10"
                        : "border-slate-300 focus:border-[#0d1b2a] focus:ring-2 focus:ring-[#0d1b2a]/10"
                    }`}
                  />
                  <label
                    htmlFor="emailLogin"
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none transition-all peer-focus:top-2 peer-focus:translate-y-0 peer-focus:text-[10px] peer-focus:font-semibold peer-focus:uppercase peer-focus:text-[#0d1b2a] peer-[:not(:placeholder-shown)]:top-2 peer-[:not(:placeholder-shown)]:translate-y-0 peer-[:not(:placeholder-shown)]:text-[10px] peer-[:not(:placeholder-shown)]:font-semibold peer-[:not(:placeholder-shown)]:uppercase"
                  >
                    Correo Institucional
                  </label>
                  {errors.email && (
                    <span className="text-[11px] text-red-500 font-medium mt-1 block">
                      {errors.email.message}
                    </span>
                  )}
                </div>

                <div className="relative">
                  <input
                    type="password"
                    id="passwordLogin"
                    placeholder=" "
                    {...register("password")}
                    className={`peer w-full h-[52px] pt-5 pb-1 px-3.5 text-sm bg-white border rounded-md outline-none transition-all ${
                      errors.password || authError
                        ? "border-red-500 ring-2 ring-red-500/10"
                        : "border-slate-300 focus:border-[#0d1b2a] focus:ring-2 focus:ring-[#0d1b2a]/10"
                    }`}
                  />
                  <label
                    htmlFor="passwordLogin"
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none transition-all peer-focus:top-2 peer-focus:translate-y-0 peer-focus:text-[10px] peer-focus:font-semibold peer-focus:uppercase peer-focus:text-[#0d1b2a] peer-[:not(:placeholder-shown)]:top-2 peer-[:not(:placeholder-shown)]:translate-y-0 peer-[:not(:placeholder-shown)]:text-[10px] peer-[:not(:placeholder-shown)]:font-semibold peer-[:not(:placeholder-shown)]:uppercase"
                  >
                    Contraseña
                  </label>
                  {errors.password && (
                    <span className="text-[11px] text-red-500 font-medium mt-1 block">
                      {errors.password.message}
                    </span>
                  )}
                </div>

                <div className="flex justify-between items-center text-xs text-slate-600">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" className="rounded text-[#0d1b2a]" />
                    Recordarme
                  </label>
                  <button
                    type="button"
                    onClick={() => setCurrentView("step1")}
                    className="text-[#0d1b2a] font-medium hover:underline"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>

                {authError && (
                  <span className="text-xs text-red-500 font-medium block">
                    Correo o contraseña incorrectos
                  </span>
                )}

                <button
                  type="submit"
                  className="w-full py-3 bg-[#0d1b2a] text-white text-xs font-semibold rounded-md hover:bg-[#1b2a3a] transition-colors shadow-md"
                >
                  Iniciar sesión
                </button>
              </form>
            </div>
          )}

          {currentView === "step1" && (
            <div>
              <h2 className="font-display italic text-3xl font-semibold text-slate-800 mb-2">
                ¿Olvidaste tu contraseña?
              </h2>
              <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                Ingresa tu correo institucional y te enviaremos un código para
                recuperar el acceso.
              </p>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (recoveryEmail) setCurrentView("step2");
                }}
                className="space-y-5"
              >
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={recoveryEmail}
                    onChange={(e) => setRecoveryEmail(e.target.value)}
                    placeholder=" "
                    className="peer w-full h-[52px] pt-5 pb-1 px-3.5 text-sm bg-white border border-slate-300 rounded-md outline-none focus:border-[#0d1b2a]"
                  />
                  <label className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none transition-all peer-focus:top-2 peer-focus:translate-y-0 peer-focus:text-[10px] peer-focus:font-semibold peer-focus:uppercase peer-focus:text-[#0d1b2a] peer-[:not(:placeholder-shown)]:top-2 peer-[:not(:placeholder-shown)]:translate-y-0 peer-[:not(:placeholder-shown)]:text-[10px] peer-[:not(:placeholder-shown)]:font-semibold peer-[:not(:placeholder-shown)]:uppercase">
                    Correo Institucional
                  </label>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-[#0d1b2a] text-white text-xs font-semibold rounded-md hover:bg-[#1b2a3a]"
                >
                  Enviar código de recuperación
                </button>
              </form>

              <div className="text-center mt-6">
                <button
                  type="button"
                  onClick={() => setCurrentView("login")}
                  className="text-xs text-slate-600 hover:text-[#0d1b2a] font-medium"
                >
                  ← Volver a iniciar sesión
                </button>
              </div>
            </div>
          )}

          {currentView === "step2" && (
            <div>
              <button
                type="button"
                onClick={() => setCurrentView("step1")}
                className="text-xs text-slate-500 hover:text-slate-800 mb-4 block"
              >
                ← Volver
              </button>

              <h2 className="font-display italic text-3xl font-semibold text-slate-800 mb-2">
                Revisa tu correo
              </h2>
              <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                Enviamos un código de 6 dígitos a{" "}
                <strong className="text-slate-700">
                  {recoveryEmail || "usuario@gmail.com"}
                </strong>
                . Ingrésalo para continuar.
              </p>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setCurrentView("step3");
                }}
                className="space-y-5"
              >
                <div className="flex justify-between gap-2">
                  {otp.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => {
                        otpRefs.current[idx] = el;
                      }}
                      type="text"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      className="w-11 h-[52px] text-center text-lg font-semibold border border-slate-300 rounded-md bg-white outline-none focus:border-[#0d1b2a] focus:ring-2 focus:ring-[#0d1b2a]/10"
                    />
                  ))}
                </div>

                <p className="text-[11px] text-slate-500 text-center">
                  ¿No llegó nada? Revisa spam o reenviar código.
                </p>

                <button
                  type="submit"
                  className="w-full py-3 bg-[#0d1b2a] text-white text-xs font-semibold rounded-md hover:bg-[#1b2a3a]"
                >
                  Verificar código
                </button>
              </form>
            </div>
          )}

          {currentView === "step3" && (
            <div>
              <button
                type="button"
                onClick={() => setCurrentView("step2")}
                className="text-xs text-slate-500 hover:text-slate-800 mb-4 block"
              >
                ← Volver
              </button>

              <h2 className="font-display italic text-3xl font-semibold text-slate-800 mb-2">
                Crea una nueva contraseña
              </h2>
              <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                Elige una contraseña segura para tu cuenta institucional.
              </p>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (isPasswordValid) {
                    setCurrentView("success");
                  }
                }}
                className="space-y-4"
              >
                <div className="relative">
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder=" "
                    className="peer w-full h-[52px] pt-5 pb-1 px-3.5 text-sm bg-white border border-slate-300 rounded-md outline-none focus:border-[#0d1b2a]"
                  />
                  <label className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none transition-all peer-focus:top-2 peer-focus:translate-y-0 peer-focus:text-[10px] peer-focus:font-semibold peer-focus:uppercase peer-focus:text-[#0d1b2a] peer-[:not(:placeholder-shown)]:top-2 peer-[:not(:placeholder-shown)]:translate-y-0 peer-[:not(:placeholder-shown)]:text-[10px] peer-[:not(:placeholder-shown)]:font-semibold peer-[:not(:placeholder-shown)]:uppercase">
                    Nueva contraseña
                  </label>
                </div>

                <div className="space-y-1.5 py-1">
                  <div
                    className={`text-[11px] flex items-center gap-1.5 ${hasMin8 ? "text-[#1f7a5c]" : "text-slate-400"}`}
                  >
                    <span
                      className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center text-[9px] ${hasMin8 ? "bg-[#1f7a5c] text-white border-[#1f7a5c]" : "border-slate-300"}`}
                    >
                      ✓
                    </span>
                    Mínimo 8 caracteres
                  </div>
                  <div
                    className={`text-[11px] flex items-center gap-1.5 ${hasNum ? "text-[#1f7a5c]" : "text-slate-400"}`}
                  >
                    <span
                      className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center text-[9px] ${hasNum ? "bg-[#1f7a5c] text-white border-[#1f7a5c]" : "border-slate-300"}`}
                    >
                      ✓
                    </span>
                    Al menos un número
                  </div>
                  <div
                    className={`text-[11px] flex items-center gap-1.5 ${hasSym ? "text-[#1f7a5c]" : "text-slate-400"}`}
                  >
                    <span
                      className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center text-[9px] ${hasSym ? "bg-[#1f7a5c] text-white border-[#1f7a5c]" : "border-slate-300"}`}
                    >
                      ✓
                    </span>
                    Al menos un símbolo
                  </div>
                </div>

                <div className="relative">
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder=" "
                    className={`peer w-full h-[52px] pt-5 pb-1 px-3.5 text-sm bg-white border rounded-md outline-none ${
                      confirmPassword.length > 0 && !isMatch
                        ? "border-red-500"
                        : "border-slate-300 focus:border-[#0d1b2a]"
                    }`}
                  />
                  <label className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none transition-all peer-focus:top-2 peer-focus:translate-y-0 peer-focus:text-[10px] peer-focus:font-semibold peer-focus:uppercase peer-focus:text-[#0d1b2a] peer-[:not(:placeholder-shown)]:top-2 peer-[:not(:placeholder-shown)]:translate-y-0 peer-[:not(:placeholder-shown)]:text-[10px] peer-[:not(:placeholder-shown)]:font-semibold peer-[:not(:placeholder-shown)]:uppercase">
                    Confirmar contraseña
                  </label>
                  {confirmPassword.length > 0 && !isMatch && (
                    <span className="text-[11px] text-red-500 block mt-1">
                      Las contraseñas no coinciden
                    </span>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={!isPasswordValid}
                  className="w-full py-3 bg-[#0d1b2a] text-white text-xs font-semibold rounded-md hover:bg-[#1b2a3a] disabled:bg-slate-300 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors"
                >
                  Guardar nueva contraseña
                </button>
              </form>
            </div>
          )}

          {currentView === "success" && (
            <div className="text-center">
              <div className="flex justify-center mb-6">
                <svg className="checkmark-svg" viewBox="0 0 52 52">
                  <circle className="checkmark-circle" cx="26" cy="26" r="23" />
                  <path
                    className="checkmark-check"
                    d="M14.1 27.2l7.1 7.2 16.7-16.8"
                  />
                </svg>
              </div>

              <h2 className="font-display italic text-3xl font-semibold text-slate-800 mb-2">
                Contraseña actualizada
              </h2>
              <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                Ya puedes iniciar sesión con tu nueva contraseña. Te
                recomendamos no compartirla con nadie.
              </p>

              <button
                type="button"
                onClick={() => {
                  triggerLoaderAndReset(() => {
                    resetAllForms();
                    setCurrentView("login");
                  });
                }}
                className="w-full py-3 bg-[#0d1b2a] text-white text-xs font-semibold rounded-md hover:bg-[#1b2a3a]"
              >
                Ir a iniciar sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
