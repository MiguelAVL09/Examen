import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  User,
  Award,
  Clock,
  Building2,
  Briefcase,
  Download,
  KeyRound,
  CheckCircle2,
  X,
  Trophy,
  History,
  ShieldCheck,
  Sparkles,
  LogOut
} from 'lucide-react';
import type { UserAccount, Participant, Quiz } from '../types/quiz';
import { quizService } from '../services/quizService';
import { authService } from '../services/authService';
import { exportDiplomaPDF } from '../utils/pdfExport';
import { InteractiveMedal3D } from './CinemaEffects';

interface UserProfileModalProps {
  isOpen: boolean;
  user: UserAccount;
  quizzes: Quiz[];
  onClose: () => void;
  onLogout: () => void;
  onUpdateUser: (updated: UserAccount) => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  user,
  quizzes,
  onClose,
  onLogout,
  onUpdateUser,
}) => {
  const [activeTab, setActiveTab] = useState<'history' | 'certificates' | 'profile'>('history');
  const [myAttempts, setMyAttempts] = useState<Participant[]>([]);
  const [isLoadingAttempts, setIsLoadingAttempts] = useState(false);

  // Edit profile state
  const [name, setName] = useState(user.name || user.nickname);
  const [branch, setBranch] = useState(user.branch || '');
  const [department, setDepartment] = useState(user.department || '');
  const [newPassword, setNewPassword] = useState('');
  const [saveMsg, setSaveMsg] = useState('');

  const normalizeName = (s: string) =>
    (s || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ');

  useEffect(() => {
    if (isOpen) {
      setIsLoadingAttempts(true);
      quizService.getRankings().then(all => {
        const userNorm = normalizeName(user.nickname);
        const emailNorm = normalizeName(user.email);
        const filtered = all.filter(p => {
          const pNorm = normalizeName(p.nickname);
          return pNorm === userNorm || pNorm.includes(userNorm) || (p.nickname && p.nickname.toLowerCase() === emailNorm);
        }).sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
        setMyAttempts(filtered);
        setIsLoadingAttempts(false);
      });
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveMsg('');
    const updates: Partial<UserAccount> = {
      name: name.trim(),
      branch: branch.trim(),
      department: department.trim(),
    };

    const res = await authService.updateUser(user.id, updates);
    if (newPassword && newPassword.length >= 6) {
      await authService.resetUserPassword(user.id, newPassword);
    }

    if (res.success && res.user) {
      onUpdateUser(res.user);
      setSaveMsg('¡Datos actualizados con éxito!');
      setNewPassword('');
      setTimeout(() => setSaveMsg(''), 3000);
    }
  };

  const passedAttempts = myAttempts.filter(a => a.accuracyPercentage >= 80);
  const bestScore = myAttempts.length > 0 ? Math.max(...myAttempts.map(a => a.totalScore)) : 0;
  const bestAccuracy = myAttempts.length > 0 ? Math.max(...myAttempts.map(a => a.accuracyPercentage)) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-gradient-to-b from-[#0e172f] via-[#091024] to-[#040815] border-2 border-amber-400/30 rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-[0_20px_60px_rgba(0,0,0,0.85)] text-white my-auto max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-white/10 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-400 to-yellow-500 text-black flex items-center justify-center shadow-lg text-2xl font-black">
              👤
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-black uppercase text-white">
                  {user.name || user.nickname}
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40 font-black uppercase">
                  {user.role === 'admin' ? '⭐ Administrador' : 'Colaborador Cinépolis'}
                </span>
              </div>
              <p className="text-xs text-white/50 font-medium">
                {user.email} {user.employeeNumber ? `• No. ${user.employeeNumber}` : ''}
              </p>
              <div className="flex items-center gap-2 mt-1 text-[11px] text-amber-300 font-bold">
                <span>🏢 {user.branch || 'Sin sucursal'}</span>
                <span>•</span>
                <span>🍿 {user.department || 'Operaciones'}</span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Resumen Superior de Logros Personales */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-black/40 p-3 rounded-2xl border border-white/10 text-center">
            <span className="text-[10px] text-white/50 uppercase font-black block">Mejor Puntaje</span>
            <span className="text-lg font-black text-amber-300 mt-0.5 block">
              {bestScore.toLocaleString()} pts
            </span>
          </div>

          <div className="bg-black/40 p-3 rounded-2xl border border-white/10 text-center">
            <span className="text-[10px] text-white/50 uppercase font-black block">Mejor Precisión</span>
            <span className="text-lg font-black text-emerald-400 mt-0.5 block">
              {bestAccuracy}%
            </span>
          </div>

          <div className="bg-black/40 p-3 rounded-2xl border border-white/10 text-center">
            <span className="text-[10px] text-white/50 uppercase font-black block">Certificados</span>
            <span className="text-lg font-black text-yellow-300 mt-0.5 block">
              {passedAttempts.length} Ganado(s)
            </span>
          </div>
        </div>

        {/* Navegación por pestañas */}
        <div className="flex p-1 bg-black/40 rounded-2xl border border-white/10 mb-6">
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-2 rounded-xl font-black text-xs uppercase tracking-wider transition flex items-center justify-center gap-1.5 ${
              activeTab === 'history' ? 'bg-amber-400 text-black shadow-md' : 'text-white/60 hover:text-white'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Mis Evaluaciones ({myAttempts.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('certificates')}
            className={`flex-1 py-2 rounded-xl font-black text-xs uppercase tracking-wider transition flex items-center justify-center gap-1.5 ${
              activeTab === 'certificates' ? 'bg-amber-400 text-black shadow-md' : 'text-white/60 hover:text-white'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>Certificados ({passedAttempts.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`flex-1 py-2 rounded-xl font-black text-xs uppercase tracking-wider transition flex items-center justify-center gap-1.5 ${
              activeTab === 'profile' ? 'bg-amber-400 text-black shadow-md' : 'text-white/60 hover:text-white'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Mis Datos</span>
          </button>
        </div>

        {/* TAB 1: HISTORIAL DE EVALUACIONES */}
        {activeTab === 'history' && (
          <div className="space-y-3">
            {isLoadingAttempts ? (
              <div className="py-8 text-center text-xs text-white/60">Cargando tus evaluaciones...</div>
            ) : myAttempts.length > 0 ? (
              myAttempts.map((attempt, idx) => {
                const quiz = quizzes.find(q => q.id === attempt.quizId);
                const isPassed = attempt.accuracyPercentage >= 80;

                return (
                  <div
                    key={attempt.id || idx}
                    className="p-3.5 rounded-2xl bg-black/30 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-white text-sm">
                          {quiz?.title || 'Cuestionario Cinépolis'}
                        </span>
                        {isPassed && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black uppercase">
                            ✓ Aprobado
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-white/40 block mt-0.5">
                        {new Date(attempt.completedAt).toLocaleString('es-MX', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="font-black text-amber-300 text-sm block">
                          {attempt.totalScore.toLocaleString()} pts
                        </span>
                        <span className="text-[10px] text-white/60 block">
                          {attempt.correctAnswersCount}/{attempt.totalQuestionsCount} ({attempt.accuracyPercentage}%)
                        </span>
                      </div>

                      {isPassed && (
                        <button
                          type="button"
                          onClick={() => {
                            exportDiplomaPDF(attempt, 0, quiz?.title || 'Cinepolis Master');
                          }}
                          className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-black text-[11px] flex items-center gap-1 transition shadow"
                          title="Descargar certificado oficial en PDF"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>PDF</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-10 text-center text-white/50 text-xs">
                <Trophy className="w-10 h-10 mx-auto mb-2 opacity-30 text-amber-300" />
                <p className="font-bold text-white/70">Aún no has completado ninguna evaluación.</p>
                <p className="text-[11px] text-white/40 mt-1">
                  Participa en un cuestionario para que tus resultados y diplomas aparezcan aquí.
                </p>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: MIS CERTIFICADOS / MEDALLAS */}
        {activeTab === 'certificates' && (
          <div className="space-y-4">
            {passedAttempts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {passedAttempts.map((att, i) => {
                  const quiz = quizzes.find(q => q.id === att.quizId);
                  return (
                    <div
                      key={att.id || i}
                      className="p-4 rounded-3xl bg-gradient-to-b from-amber-950/20 to-black/40 border border-amber-400/40 flex flex-col items-center text-center justify-between gap-3 shadow-lg"
                    >
                      <InteractiveMedal3D
                        accuracy={att.accuracyPercentage}
                        rank={1}
                        size="sm"
                      />
                      <div>
                        <h4 className="text-xs font-black text-white mt-1 line-clamp-1">
                          {quiz?.title || 'Evaluación Cinépolis'}
                        </h4>
                        <span className="text-[11px] text-emerald-300 font-extrabold block">
                          Calificación: {att.accuracyPercentage}% ({att.totalScore.toLocaleString()} pts)
                        </span>
                        <span className="text-[10px] text-white/40 block">
                          Fecha: {new Date(att.completedAt).toLocaleDateString()}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          exportDiplomaPDF(att, 0, quiz?.title || 'Cinepolis Master');
                        }}
                        className="w-full py-2.5 rounded-xl btn-cinepolis-gold text-xs font-black uppercase flex items-center justify-center gap-1.5 shadow"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Descargar Diploma (PDF)</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-10 text-center text-white/50 text-xs">
                <Award className="w-10 h-10 mx-auto mb-2 opacity-30 text-amber-300" />
                <p className="font-bold text-white/70">Aún no cuentas con diplomas descargables.</p>
                <p className="text-[11px] text-white/40 mt-1">
                  Obtén una precisión de al menos 80% en cualquier cuestionario oficial para recibir tu certificado personalizado.
                </p>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: EDITAR PERFIL */}
        {activeTab === 'profile' && (
          <form onSubmit={handleSaveProfile} className="space-y-4">
            {saveMsg && (
              <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{saveMsg}</span>
              </div>
            )}

            <div>
              <label className="text-[10px] font-black uppercase text-white/70 block mb-1">
                Nombre Completo
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/15 text-white text-xs font-semibold focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-black uppercase text-white/70 block mb-1">
                  Sucursal / Cine
                </label>
                <input
                  type="text"
                  value={branch}
                  onChange={e => setBranch(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/15 text-white text-xs font-semibold focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-white/70 block mb-1">
                  Área / Departamento
                </label>
                <input
                  type="text"
                  value={department}
                  onChange={e => setDepartment(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/15 text-white text-xs font-semibold focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-white/10">
              <label className="text-[10px] font-black uppercase text-amber-300 block mb-1">
                Cambiar Contraseña (Opcional)
              </label>
              <input
                type="password"
                placeholder="Escribe la nueva contraseña (deja vacío si no deseas cambiarla)"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/15 text-white text-xs font-semibold focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={onLogout}
                className="px-4 py-2.5 rounded-xl bg-red-600/20 hover:bg-red-600/40 text-red-300 font-bold text-xs flex items-center gap-1.5 transition"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Cerrar Sesión</span>
              </button>

              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl btn-cinepolis-gold text-xs font-black uppercase tracking-wider shadow"
              >
                Guardar Cambios
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
};
