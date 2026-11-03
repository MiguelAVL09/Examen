import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Lock,
  Mail,
  User,
  Shield,
  Building2,
  Briefcase,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  X,
  Sparkles,
  ArrowRight,
  Eye,
  EyeOff
} from 'lucide-react';
import { authService, type RegisterDTO } from '../services/authService';
import type { UserAccount } from '../types/quiz';
import { DEFAULT_DEPARTMENTS } from '../services/quizService';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: UserAccount) => void;
  initialMode?: 'login' | 'register';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onAuthSuccess,
  initialMode = 'login',
}) => {
  const [mode, setMode] = useState<'login' | 'register' | 'recover'>(initialMode);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Login form state
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register form state
  const [registerForm, setRegisterForm] = useState<RegisterDTO>({
    email: '',
    name: '',
    nickname: '',
    employeeNumber: '',
    branch: 'Cinépolis Diana',
    department: DEFAULT_DEPARTMENTS[0],
    password: '',
    securityQuestion: '¿Cuál es tu sucursal o cine favorito?',
    securityAnswer: '',
  });

  // Recovery form state
  const [recoverIdentifier, setRecoverIdentifier] = useState('');
  const [recoverQuestion, setRecoverQuestion] = useState('');
  const [recoverAnswer, setRecoverAnswer] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isQuestionLoaded, setIsQuestionLoaded] = useState(false);

  if (!isOpen) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    if (!loginIdentifier.trim() || !loginPassword) {
      setErrorMsg('Por favor completa todos los campos.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await authService.login(loginIdentifier, loginPassword);
      if (res.success && res.user) {
        setSuccessMsg(`¡Bienvenido de vuelta, ${res.user.name || res.user.nickname}!`);
        setTimeout(() => {
          onAuthSuccess(res.user!);
          onClose();
        }, 600);
      } else {
        setErrorMsg(res.error || 'Credenciales inválidas.');
      }
    } catch {
      setErrorMsg('Error de conexión con el sistema de autenticación.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!registerForm.email.trim() || !registerForm.nickname.trim() || !registerForm.password) {
      setErrorMsg('Por favor completa los campos obligatorios (*).');
      return;
    }

    setIsLoading(true);
    try {
      const res = await authService.register(registerForm);
      if (res.success && res.user) {
        setSuccessMsg('¡Cuenta registrada exitosamente!');
        setTimeout(() => {
          onAuthSuccess(res.user!);
          onClose();
        }, 700);
      } else {
        setErrorMsg(res.error || 'Error al crear la cuenta.');
      }
    } catch {
      setErrorMsg('Error inesperado al procesar el registro.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFindQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!recoverIdentifier.trim()) {
      setErrorMsg('Ingresa tu correo, número de colaborador o usuario.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await authService.getSecurityQuestion(recoverIdentifier);
      if (res.success && res.question) {
        setRecoverQuestion(res.question);
        setIsQuestionLoaded(true);
      } else {
        setErrorMsg(res.error || 'Usuario no encontrado.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecoverSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!recoverAnswer.trim() || !newPassword) {
      setErrorMsg('Por favor ingresa la respuesta y la nueva contraseña.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await authService.recoverPasswordWithQuestion(
        recoverIdentifier,
        recoverAnswer,
        newPassword
      );
      if (res.success) {
        setSuccessMsg(res.message || 'Contraseña actualizada.');
        setTimeout(() => {
          setMode('login');
          setLoginIdentifier(recoverIdentifier);
          setLoginPassword('');
          setIsQuestionLoaded(false);
          setRecoverAnswer('');
          setNewPassword('');
          setSuccessMsg('');
        }, 1500);
      } else {
        setErrorMsg(res.error || 'Respuesta incorrecta.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.93, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.93, y: 15 }}
        className="relative bg-gradient-to-b from-[#0e172f] via-[#091024] to-[#040815] border-2 border-amber-400/30 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-[0_20px_60px_rgba(0,0,0,0.85)] text-white my-auto overflow-hidden"
      >
        {/* Glow ambient decoration */}
        <div className="absolute top-0 right-0 w-44 h-44 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-44 h-44 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 to-yellow-500 text-black flex items-center justify-center shadow-lg font-black">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black uppercase tracking-tight text-white flex items-center gap-1.5">
                <span>Acceso Seguro</span>
                <span className="text-[10px] bg-amber-400/20 text-amber-300 border border-amber-400/30 px-2 py-0.5 rounded-full font-bold">
                  Cinépolis
                </span>
              </h3>
              <p className="text-[11px] text-white/50 font-medium">
                Identificación de Colaboradores y Evaluaciones
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switch between Login & Register */}
        {mode !== 'recover' && (
          <div className="flex p-1 bg-black/40 rounded-2xl border border-white/10 mb-6">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setErrorMsg('');
                setSuccessMsg('');
              }}
              className={`flex-1 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition ${
                mode === 'login'
                  ? 'bg-amber-400 text-black shadow-md'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              Iniciar Sesión
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setErrorMsg('');
                setSuccessMsg('');
              }}
              className={`flex-1 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition ${
                mode === 'register'
                  ? 'bg-amber-400 text-black shadow-md'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              Crear Cuenta
            </button>
          </div>
        )}

        {/* Alerts */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/20 border border-red-500/40 text-red-200 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* 1. MODO INICIAR SESIÓN */}
        {mode === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="text-[11px] font-black uppercase text-white/70 block mb-1">
                Usuario, Correo o No. Colaborador
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Ej. admin@cinepolis.com o tu usuario"
                  value={loginIdentifier}
                  onChange={e => setLoginIdentifier(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-black/40 border border-white/15 text-white placeholder-white/30 text-xs font-semibold focus:outline-none focus:border-amber-400 transition"
                  autoFocus
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-black uppercase text-white/70">
                  Contraseña
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setMode('recover');
                    setErrorMsg('');
                    setSuccessMsg('');
                  }}
                  className="text-[10px] text-amber-300 hover:text-amber-200 underline font-bold"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Tu contraseña segura"
                  value={loginPassword}
                  onChange={e => setLoginPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 rounded-xl bg-black/40 border border-white/15 text-white placeholder-white/30 text-xs font-semibold focus:outline-none focus:border-amber-400 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 rounded-2xl btn-cinepolis-gold text-xs font-black uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 mt-2"
            >
              {isLoading ? (
                <span>Validando Credenciales...</span>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>Ingresar a la Plataforma</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* 2. MODO REGISTRO DE NUEVO COLABORADOR */}
        {mode === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            <div>
              <label className="text-[10px] font-black uppercase text-white/70 block mb-0.5">
                Nombre Completo *
              </label>
              <input
                type="text"
                placeholder="Ej. Carlos Mendoza López"
                value={registerForm.name}
                onChange={e => setRegisterForm({ ...registerForm, name: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/15 text-white placeholder-white/30 text-xs font-semibold focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-black uppercase text-white/70 block mb-0.5">
                  Alias para el Juego *
                </label>
                <input
                  type="text"
                  placeholder="Ej. Cinepolito Carlos"
                  value={registerForm.nickname}
                  onChange={e => setRegisterForm({ ...registerForm, nickname: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/15 text-white placeholder-white/30 text-xs font-semibold focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-white/70 block mb-0.5">
                  No. de Colaborador
                </label>
                <input
                  type="text"
                  placeholder="Ej. 10425"
                  value={registerForm.employeeNumber || ''}
                  onChange={e => setRegisterForm({ ...registerForm, employeeNumber: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/15 text-white placeholder-white/30 text-xs font-semibold focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase text-white/70 block mb-0.5">
                Correo Electrónico *
              </label>
              <input
                type="email"
                placeholder="colaborador@cinepolis.com"
                value={registerForm.email}
                onChange={e => setRegisterForm({ ...registerForm, email: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/15 text-white placeholder-white/30 text-xs font-semibold focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-black uppercase text-white/70 block mb-0.5">
                  Sucursal / Cine
                </label>
                <input
                  type="text"
                  placeholder="Ej. Cinépolis Diana"
                  value={registerForm.branch}
                  onChange={e => setRegisterForm({ ...registerForm, branch: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/15 text-white placeholder-white/30 text-xs font-semibold focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-white/70 block mb-0.5">
                  Área / Departamento
                </label>
                <select
                  value={registerForm.department}
                  onChange={e => setRegisterForm({ ...registerForm, department: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-white/15 text-white text-xs font-semibold focus:outline-none focus:border-amber-400"
                >
                  {DEFAULT_DEPARTMENTS.map(d => (
                    <option key={d} value={d} className="bg-gray-900 text-white">
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase text-white/70 block mb-0.5">
                Contraseña Segura (mín. 6 caracteres) *
              </label>
              <input
                type="password"
                placeholder="Contraseña"
                value={registerForm.password}
                onChange={e => setRegisterForm({ ...registerForm, password: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/15 text-white placeholder-white/30 text-xs font-semibold focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="pt-2 border-t border-white/10">
              <label className="text-[10px] font-black uppercase text-amber-300 block mb-1">
                Pregunta de Seguridad (para recuperación si olvidas la contraseña)
              </label>
              <select
                value={registerForm.securityQuestion}
                onChange={e => setRegisterForm({ ...registerForm, securityQuestion: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/15 text-white text-[11px] font-semibold mb-2"
              >
                <option value="¿Cuál es tu sucursal o cine favorito?" className="bg-gray-900">
                  ¿Cuál es tu sucursal o cine favorito?
                </option>
                <option value="¿Cuál fue tu primera película vista en Cinépolis?" className="bg-gray-900">
                  ¿Cuál fue tu primera película vista en Cinépolis?
                </option>
                <option value="¿Cuál es el nombre de tu gerente o líder de equipo?" className="bg-gray-900">
                  ¿Cuál es el nombre de tu gerente o líder de equipo?
                </option>
              </select>

              <input
                type="text"
                placeholder="Tu respuesta secreta (ej. Diana, Titanic...)"
                value={registerForm.securityAnswer}
                onChange={e => setRegisterForm({ ...registerForm, securityAnswer: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/15 text-white placeholder-white/30 text-xs font-semibold focus:outline-none focus:border-amber-400"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 rounded-2xl btn-cinepolis-gold text-xs font-black uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 mt-4"
            >
              {isLoading ? 'Registrando...' : 'Completar Registro'}
            </button>
          </form>
        )}

        {/* 3. MODO RECUPERAR CONTRASEÑA */}
        {mode === 'recover' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <HelpCircle className="w-4 h-4 text-amber-300" />
              <span className="text-xs font-black uppercase text-amber-300">
                Recuperación Segura de Contraseña
              </span>
            </div>

            {!isQuestionLoaded ? (
              <form onSubmit={handleFindQuestion} className="space-y-3">
                <p className="text-xs text-white/70 leading-relaxed font-medium">
                  Ingresa tu correo electrónico, número de colaborador o nombre de usuario registrado para consultar tu pregunta de seguridad:
                </p>

                <input
                  type="text"
                  placeholder="Correo o Usuario..."
                  value={recoverIdentifier}
                  onChange={e => setRecoverIdentifier(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/15 text-white text-xs font-semibold focus:outline-none focus:border-amber-400"
                  autoFocus
                />

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 rounded-2xl btn-cinepolis-primary text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2"
                >
                  {isLoading ? 'Buscando...' : 'Buscar Cuenta'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleRecoverSubmit} className="space-y-3">
                <div className="p-3 bg-black/40 rounded-xl border border-white/10">
                  <span className="text-[10px] text-white/50 uppercase font-black block">Tu Pregunta de Seguridad:</span>
                  <p className="text-xs font-bold text-amber-300 mt-1">{recoverQuestion}</p>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-white/70 block mb-1">
                    Tu Respuesta Secreta
                  </label>
                  <input
                    type="text"
                    placeholder="Escribe la respuesta..."
                    value={recoverAnswer}
                    onChange={e => setRecoverAnswer(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/15 text-white text-xs font-semibold focus:outline-none focus:border-amber-400"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-white/70 block mb-1">
                    Nueva Contraseña
                  </label>
                  <input
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/15 text-white text-xs font-semibold focus:outline-none focus:border-amber-400"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 rounded-2xl btn-cinepolis-gold text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 mt-2"
                >
                  {isLoading ? 'Actualizando...' : 'Restablecer Contraseña'}
                </button>
              </form>
            )}

            <button
              type="button"
              onClick={() => {
                setMode('login');
                setIsQuestionLoaded(false);
                setErrorMsg('');
                setSuccessMsg('');
              }}
              className="w-full text-center text-xs text-white/60 hover:text-white pt-2 underline"
            >
              ← Volver al inicio de sesión
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};
