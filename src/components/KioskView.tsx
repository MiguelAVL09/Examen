import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Monitor,
  Clock,
  Sparkles,
  Lock,
  Unlock,
  Users,
  Trophy,
  CheckCircle2,
  Briefcase,
  Play,
  RotateCcw,
  ShieldCheck,
  Film
} from 'lucide-react';
import type { Quiz, Participant } from '../types/quiz';
import { DEFAULT_DEPARTMENTS, quizService } from '../services/quizService';
import { authService } from '../services/authService';

interface KioskViewProps {
  quizzes: Quiz[];
  onStartQuiz: (quiz: Quiz, nickname: string, avatar: string, branch?: string, department?: string) => void;
  onExitKiosk: () => void;
  onSelectQuizToView?: (quiz: Quiz) => void;
}

const KIOSK_AVATARS = ['🍿', '🥤', '🎬', '🎟️', '⭐', '🦁', '🚀', '🦊', '🕶️', '⚡'];

export const KioskView: React.FC<KioskViewProps> = ({
  quizzes,
  onStartQuiz,
  onExitKiosk
}) => {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');

  // Form states
  const [employeeNumber, setEmployeeNumber] = useState('');
  const [nickname, setNickname] = useState('');
  const [department, setDepartment] = useState(DEFAULT_DEPARTMENTS[0]);
  const [selectedAvatar, setSelectedAvatar] = useState(KIOSK_AVATARS[0]);
  const [selectedQuizId, setSelectedQuizId] = useState<string>(() => {
    return quizzes[0]?.id || 'f3f7aa07-4389-4769-a162-3fb8b989bfc0';
  });

  // Admin exit lock
  const [showExitModal, setShowExitModal] = useState(false);
  const [exitPasscode, setExitPasscode] = useState('');
  const [exitError, setExitError] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Update real-time clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
      );
      setCurrentDate(
        now.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Autofill name if employee number is typed and user exists
  const handleEmployeeNumberChange = async (num: string) => {
    setEmployeeNumber(num);
    setErrorMessage('');
    if (num.trim().length >= 3) {
      const users = await authService.getUsers();
      const clean = num.trim().toLowerCase();
      const found = users.find(
        u => (u.employeeNumber && u.employeeNumber.toLowerCase() === clean) || u.nickname.toLowerCase() === clean
      );
      if (found) {
        setNickname(found.name || found.nickname);
        if (found.department) setDepartment(found.department);
      }
    }
  };

  const handleLaunchKioskExam = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const targetQuiz = quizzes.find(q => q.id === selectedQuizId) || quizzes[0];
    if (!targetQuiz) {
      setErrorMessage('No hay evaluaciones disponibles en este momento.');
      return;
    }

    const finalName = nickname.trim() || `Colaborador #${employeeNumber.trim() || 'Cinépolis'}`;

    // Validar candado de intento si aplica
    const maxAllowed = targetQuiz.maxAttemptsPerUser ?? (targetQuiz.preventRetries ? 1 : 0);
    if (maxAllowed > 0 && !targetQuiz.isAnonymousSurvey) {
      const hasAttempt = await quizService.hasParticipantAttempt(targetQuiz.id, finalName);
      if (hasAttempt) {
        setErrorMessage(
          `¡Hola ${finalName}! Ya registraste tu evaluación de "${targetQuiz.title}". El sistema tiene candado de intento único.`
        );
        return;
      }
    }

    onStartQuiz(targetQuiz, finalName, selectedAvatar, undefined, department);
  };

  const handleExitConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (exitPasscode.trim() === 'Mike040903') {
      setShowExitModal(false);
      onExitKiosk();
    } else {
      setExitError('Contraseña de administrador incorrecta.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#090b14] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-950/40 via-[#0a0d18] to-black flex flex-col justify-between p-4 sm:p-8 overflow-y-auto select-none">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center text-black font-black shadow-lg shadow-amber-500/20">
            <Film className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl sm:text-2xl font-black text-white tracking-tight uppercase">
                Cinépolis Kiosco
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400 text-black shadow-sm">
                Sala de Descanso
              </span>
            </div>
            <p className="text-xs text-white/50 capitalize font-medium">{currentDate}</p>
          </div>
        </div>

        {/* Live Clock & Lock Button */}
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <span className="font-mono text-xl sm:text-2xl font-black text-amber-300 tracking-wider">
              {currentTime}
            </span>
            <p className="text-[10px] uppercase font-bold text-white/40">Hora Local</p>
          </div>

          <button
            type="button"
            onClick={() => {
              setExitPasscode('');
              setExitError('');
              setShowExitModal(true);
            }}
            title="Desbloquear / Salir del modo Kiosco (Solo Administrador)"
            className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white transition active:scale-95"
          >
            <Lock className="w-5 h-5 text-amber-300" />
          </button>
        </div>
      </div>

      {/* Main Kiosk Center Card */}
      <div className="max-w-2xl w-full mx-auto my-auto py-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-black/40 backdrop-blur-xl border border-white/15 rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden"
        >
          {/* Subtle Background Glow */}
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="text-center mb-6">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-white/10 text-amber-300 border border-white/10 mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Capacitación & Voz del Colaborador</span>
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight uppercase">
              ¡Hola Cinépolito! 🍿
            </h2>
            <p className="text-xs sm:text-sm text-white/70 max-w-md mx-auto mt-1">
              Aprovecha tus minutos libres en descanso para contestar tu evaluación o expresar tu opinión sincera.
            </p>
          </div>

          <form onSubmit={handleLaunchKioskExam} className="space-y-4">
            {/* Input # Nómina */}
            <div>
              <label className="text-xs font-black uppercase text-white/80 block mb-1">
                Número de Nómina / Colaborador *
              </label>
              <input
                type="text"
                required
                autoFocus
                placeholder="Ej. 1024 o #EMP-048"
                value={employeeNumber}
                onChange={e => handleEmployeeNumberChange(e.target.value)}
                className="w-full px-4 py-3.5 rounded-2xl bg-white/5 border border-white/20 text-white font-mono text-base font-bold placeholder-white/30 focus:outline-none focus:border-amber-400 focus:bg-white/10 transition"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Input Nombre */}
              <div>
                <label className="text-xs font-black uppercase text-white/80 block mb-1">
                  Tu Nombre o Alias
                </label>
                <input
                  type="text"
                  placeholder="Ej. Carlos Mendoza"
                  value={nickname}
                  onChange={e => setNickname(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/20 text-white text-sm font-bold placeholder-white/30 focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Área del Cine */}
              <div>
                <label className="text-xs font-black uppercase text-white/80 block mb-1">
                  Tu Área en el Cine
                </label>
                <select
                  value={department}
                  onChange={e => setDepartment(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-white/20 text-white text-sm font-bold focus:outline-none focus:border-amber-400"
                >
                  {DEFAULT_DEPARTMENTS.map(d => (
                    <option key={d} value={d} className="bg-slate-900">
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Selector de Cuestionario / Encuesta */}
            <div>
              <label className="text-xs font-black uppercase text-amber-300 block mb-1">
                Selecciona la Evaluación o Encuesta
              </label>
              <select
                value={selectedQuizId}
                onChange={e => setSelectedQuizId(e.target.value)}
                className="w-full px-4 py-3.5 rounded-2xl bg-black/60 border border-amber-400/40 text-amber-200 text-sm font-bold focus:outline-none focus:border-amber-400"
              >
                {quizzes.map(q => (
                  <option key={q.id} value={q.id} className="bg-slate-950 text-white">
                    {q.isAnonymousSurvey ? '🛡️ (Anónima) ' : q.quizKind === 'simulator' ? '🎭 (Simulador) ' : '⭐ '}
                    {q.title} ({q.questions.length} preguntas)
                  </option>
                ))}
              </select>
            </div>

            {/* Avatar Picker Rápido */}
            <div>
              <span className="text-[11px] font-black uppercase text-white/60 block mb-1.5 text-center">
                Elige tu Amuleto de Suerte
              </span>
              <div className="flex justify-center gap-1.5 sm:gap-2 flex-wrap">
                {KIOSK_AVATARS.map(av => (
                  <button
                    key={av}
                    type="button"
                    onClick={() => setSelectedAvatar(av)}
                    className={`w-10 h-10 rounded-xl text-lg flex items-center justify-center transition ${
                      selectedAvatar === av
                        ? 'bg-amber-400 text-black scale-110 shadow-lg shadow-amber-400/30'
                        : 'bg-white/5 hover:bg-white/10 text-white'
                    }`}
                  >
                    {av}
                  </button>
                ))}
              </div>
            </div>

            {errorMessage && (
              <p className="text-xs font-bold text-red-300 bg-red-500/20 p-3 rounded-xl border border-red-500/30 text-center animate-pulse">
                ⚠️ {errorMessage}
              </p>
            )}

            {/* Botón Gigante Táctil de Inicio */}
            <div className="pt-3">
              <button
                type="submit"
                className="btn-cinepolis-gold w-full py-4 rounded-2xl text-black font-black uppercase tracking-wider text-base sm:text-lg flex items-center justify-center gap-3 shadow-xl active:scale-95"
              >
                <Play className="w-5 h-5 fill-black" />
                <span>Comenzar Ahora</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>

      {/* Footer Instructions */}
      <div className="text-center text-xs text-white/40 border-t border-white/5 pt-3">
        <span>Cinépolis • Terminal de Auto-Evaluación y Retroalimentación para Sala de Descanso</span>
      </div>

      {/* Modal Desbloquear / Salir de Kiosco */}
      <AnimatePresence>
        {showExitModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-kahoot-purple-dark border-2 border-white/20 rounded-3xl p-6 max-w-sm w-full shadow-2xl text-white space-y-4"
            >
              <div className="flex items-center gap-2">
                <span className="p-2 bg-amber-400/20 text-amber-300 rounded-xl">
                  <Lock className="w-5 h-5" />
                </span>
                <h3 className="text-lg font-black uppercase tracking-tight">
                  Salir del Modo Kiosco
                </h3>
              </div>
              <p className="text-xs text-white/70">
                Esta pantalla está bloqueada para los colaboradores. Introduce la contraseña del administrador para regresar al portal regular:
              </p>

              <form onSubmit={handleExitConfirm} className="space-y-4">
                <input
                  type="password"
                  required
                  placeholder="Contraseña de Administrador"
                  value={exitPasscode}
                  onChange={e => setExitPasscode(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/20 text-white font-mono text-sm focus:outline-none focus:border-amber-400"
                />

                {exitError && (
                  <p className="text-xs text-red-300 font-bold bg-red-500/20 p-2 rounded-lg">
                    {exitError}
                  </p>
                )}

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowExitModal(false)}
                    className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn-cinepolis-gold px-5 py-2 text-black font-black text-xs rounded-xl"
                  >
                    Desbloquear
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
