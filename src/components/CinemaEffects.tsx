import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import {
  Award,
  BookOpen,
  CheckCircle2,
  Flame,
  RotateCcw,
  Sparkles,
  Ticket,
  Trophy,
  X,
  Building2,
  Briefcase,
  ShieldCheck,
  Mail,
  MessageCircle,
  Send,
} from 'lucide-react';
import type { Participant, ParticipantAnswer, Quiz } from '../types/quiz';
import { DEFAULT_EXPLANATIONS } from '../services/quizService';
import { exportDiplomaPDF } from '../utils/pdfExport';
import { haptic } from '../utils/security';

// ============================================================================
// 1. ANIMACIÓN DE APERTURA DE TELÓN DE CINE (Curtains Reveal)
// ============================================================================
export const CurtainsReveal: React.FC<{ triggerKey?: string | number }> = ({ triggerKey = 'start' }) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 1250);
    return () => clearTimeout(t);
  }, [triggerKey]);

  return (
    <AnimatePresence>
      {visible && (
        <div className="fixed inset-0 z-50 pointer-events-none overflow-hidden flex">
          {/* Telón Izquierdo */}
          <motion.div
            initial={{ x: '0%' }}
            animate={{ x: '-102%' }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.05, ease: [0.65, 0, 0.35, 1], delay: 0.12 }}
            className="w-1/2 h-full relative shadow-2xl"
            style={{
              background:
                'repeating-linear-gradient(90deg, #7f1d1d 0px, #991b1b 24px, #b91c1c 48px, #7f1d1d 72px)',
              borderRight: '4px solid #f59e0b',
            }}
          >
            <div className="absolute inset-y-0 right-2 w-3 bg-gradient-to-b from-amber-300/60 via-yellow-500/40 to-amber-300/60 rounded-full blur-[1px]" />
          </motion.div>

          {/* Telón Derecho */}
          <motion.div
            initial={{ x: '0%' }}
            animate={{ x: '102%' }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.05, ease: [0.65, 0, 0.35, 1], delay: 0.12 }}
            className="w-1/2 h-full relative shadow-2xl"
            style={{
              background:
                'repeating-linear-gradient(90deg, #7f1d1d 0px, #991b1b 24px, #b91c1c 48px, #7f1d1d 72px)',
              borderLeft: '4px solid #f59e0b',
            }}
          >
            <div className="absolute inset-y-0 left-2 w-3 bg-gradient-to-b from-amber-300/60 via-yellow-500/40 to-amber-300/60 rounded-full blur-[1px]" />
          </motion.div>

          {/* Cenefa superior dorada */}
          <motion.div
            initial={{ y: 0 }}
            animate={{ y: -90 }}
            transition={{ duration: 0.9, ease: 'easeInOut', delay: 0.25 }}
            className="absolute top-0 inset-x-0 h-14 bg-gradient-to-b from-red-950 via-red-900 to-amber-500/80 border-b-4 border-amber-400 shadow-2xl flex items-center justify-center"
          >
            <span className="text-xs font-black uppercase tracking-[0.35em] text-amber-200 drop-shadow">
              ★ Función Especial Club Cinépolis ★
            </span>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

// ============================================================================
// 2. BARRA DE PROGRESO ESTILO ROLLO DE PELÍCULA 35MM (Film Strip Progress)
// ============================================================================
interface FilmStripProgressProps {
  total: number;
  currentIndex: number;
  answers: ParticipantAnswer[];
}

export const FilmStripProgress: React.FC<FilmStripProgressProps> = ({
  total,
  currentIndex,
  answers,
}) => {
  return (
    <div className="w-full bg-black/80 border-y-2 border-amber-500/40 py-1.5 px-3 rounded-xl mb-3 shadow-inner overflow-hidden">
      {/* Perforaciones superiores del celuloide */}
      <div className="flex justify-between gap-1.5 mb-1 opacity-50">
        {Array.from({ length: Math.max(12, total * 2) }).map((_, i) => (
          <span key={`top-${i}`} className="h-1.5 flex-1 bg-amber-200/30 rounded-[2px]" />
        ))}
      </div>

      {/* Fotogramas numerados */}
      <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${total}, minmax(0, 1fr))` }}>
        {Array.from({ length: total }).map((_, idx) => {
          const answered = answers[idx];
          const isCurrent = idx === currentIndex;
          const isPast = idx < currentIndex;

          let frameClass = 'bg-white/5 border-white/15 text-white/40';
          if (isCurrent) {
            frameClass =
              'bg-gradient-to-br from-amber-400 to-yellow-500 text-black border-white shadow-[0_0_14px_rgba(255,184,0,0.85)] scale-[1.03]';
          } else if (isPast && answered) {
            frameClass = answered.isCorrect
              ? 'bg-emerald-500/30 border-emerald-400/70 text-emerald-200'
              : 'bg-red-500/30 border-red-400/70 text-red-200';
          }

          return (
            <div
              key={idx}
              className={`h-7 sm:h-8 rounded-md border flex items-center justify-center text-[11px] sm:text-xs font-black transition-all duration-300 ${frameClass}`}
              title={`Fotograma ${idx + 1} de ${total}`}
            >
              <span>#{idx + 1}</span>
            </div>
          );
        })}
      </div>

      {/* Perforaciones inferiores del celuloide */}
      <div className="flex justify-between gap-1.5 mt-1 opacity-50">
        {Array.from({ length: Math.max(12, total * 2) }).map((_, i) => (
          <span key={`bot-${i}`} className="h-1.5 flex-1 bg-amber-200/30 rounded-[2px]" />
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// 3. MEDALLA 3D INTERACTIVA CON INCLINACIÓN (Interactive 3D Medal)
// ============================================================================
interface InteractiveMedal3DProps {
  accuracy: number;
  rank?: number;
  size?: 'sm' | 'md' | 'lg';
}

export const InteractiveMedal3D: React.FC<InteractiveMedal3DProps> = ({
  accuracy,
  rank,
  size = 'lg',
}) => {
  const [tilt, setTilt] = useState({ rx: 0, ry: 0, gx: 50, gy: 50 });

  const tier =
    rank === 1 || accuracy >= 90
      ? {
          label: 'ORO MASTER',
          gradient: 'from-yellow-300 via-amber-400 to-yellow-600',
          ring: 'border-yellow-200',
          shadow: 'rgba(251, 191, 36, 0.65)',
          icon: '🏆',
        }
      : rank === 2 || accuracy >= 80
      ? {
          label: 'PLATA CERTIFICADO',
          gradient: 'from-slate-200 via-gray-300 to-slate-500',
          ring: 'border-white',
          shadow: 'rgba(226, 232, 240, 0.55)',
          icon: '🥈',
        }
      : rank === 3 || accuracy >= 60
      ? {
          label: 'BRONCE CINEPOLITO',
          gradient: 'from-amber-600 via-orange-500 to-amber-800',
          ring: 'border-amber-300',
          shadow: 'rgba(217, 119, 6, 0.55)',
          icon: '🥉',
        }
      : {
          label: 'PARTICIPANTE',
          gradient: 'from-blue-500 via-indigo-600 to-blue-900',
          ring: 'border-blue-300',
          shadow: 'rgba(59, 130, 246, 0.5)',
          icon: '🎬',
        };

  const dims =
    size === 'sm' ? 'w-16 h-16 text-2xl' : size === 'md' ? 'w-24 h-24 text-4xl' : 'w-28 h-28 sm:w-32 sm:h-32 text-5xl';

  const handleMove = (clientX: number, clientY: number, rect: DOMRect) => {
    const x = (clientX - rect.left) / rect.width;
    const y = (clientY - rect.top) / rect.height;
    setTilt({
      rx: (0.5 - y) * 28,
      ry: (x - 0.5) * 28,
      gx: x * 100,
      gy: y * 100,
    });
  };

  return (
    <div className="flex flex-col items-center select-none" style={{ perspective: '700px' }}>
      <motion.div
        onMouseMove={e => handleMove(e.clientX, e.clientY, e.currentTarget.getBoundingClientRect())}
        onTouchMove={e => {
          const t = e.touches[0];
          if (t) handleMove(t.clientX, t.clientY, e.currentTarget.getBoundingClientRect());
        }}
        onMouseLeave={() => setTilt({ rx: 0, ry: 0, gx: 50, gy: 50 })}
        onTouchEnd={() => setTilt({ rx: 0, ry: 0, gx: 50, gy: 50 })}
        onClick={() => haptic(15)}
        animate={{ rotateX: tilt.rx, rotateY: tilt.ry }}
        transition={{ type: 'spring', stiffness: 260, damping: 18 }}
        style={{
          transformStyle: 'preserve-3d',
          boxShadow: `0 18px 40px ${tier.shadow}`,
        }}
        className={`relative ${dims} rounded-full bg-gradient-to-br ${tier.gradient} border-4 ${tier.ring} flex items-center justify-center cursor-grab active:cursor-grabbing`}
        title="Mueve el dedo o el cursor para inclinar la medalla 3D"
      >
        {/* Brillo especular dinámico */}
        <div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            background: `radial-gradient(circle at ${tilt.gx}% ${tilt.gy}%, rgba(255,255,255,0.65) 0%, transparent 60%)`,
          }}
        />
        <span style={{ transform: 'translateZ(22px)' }} className="drop-shadow-lg">
          {tier.icon}
        </span>
      </motion.div>
      <span className="mt-2 px-3 py-0.5 rounded-full bg-amber-400/20 border border-amber-300/40 text-[10px] font-black uppercase tracking-widest text-amber-200">
        {tier.label}
      </span>
    </div>
  );
};

// ============================================================================
// 4. TARJETA FINAL ESTILO "BOLETO DE CINE / TICKET" CON QR Y DIPLOMA
// ============================================================================
interface CinemaTicketResultProps {
  quiz: Quiz;
  participant: Participant;
  onPlayAgain: () => void;
  onExit: () => void;
  allowReplay?: boolean;
}

export const CinemaTicketResult: React.FC<CinemaTicketResultProps> = ({
  quiz,
  participant,
  onPlayAgain,
  onExit,
  allowReplay = true,
}) => {
  const [showReview, setShowReview] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [emailStatus, setEmailStatus] = useState('');

  const isApproved = participant.accuracyPercentage >= 80;
  const folio = participant.id.slice(0, 8).toUpperCase();
  const verifyUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/?verify=${participant.id}`
      : `https://examen-smoky-mu.vercel.app/?verify=${participant.id}`;

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(
      `🎬 *¡Certificación Oficial Cinépolis!*\n\n` +
      `¡Hola! He completado exitosamente la evaluación oficial *"${quiz.title}"* con un puntaje de *${participant.totalScore.toLocaleString()} pts* (${participant.accuracyPercentage}% de precisión).\n\n` +
      `🎖️ Folio Oficial: #${folio}\n` +
      `Avalado formalmente por la Dirección y Gerencia de Conjunto Cinépolis.\n` +
      `Verifica mi resultado aquí: ${verifyUrl}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const handleSendEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientEmail.trim()) return;

    exportDiplomaPDF(participant, 0, quiz.title, folio);

    const subject = encodeURIComponent(`¡Felicidades! Acreditación Oficial en Cinépolis: ${quiz.title}`);
    const body = encodeURIComponent(
      `Estimado/a ${participant.nickname},\n\n` +
      `Por medio de la presente, la Dirección y Gerencia de Conjunto Cinépolis te extienden una sincera y calurosa felicitación por haber acreditado satisfactoriamente la evaluación oficial:\n\n` +
      `🎬 EVALUACIÓN: ${quiz.title}\n` +
      `🏆 PUNTAJE OBTENIDO: ${participant.totalScore.toLocaleString()} puntos\n` +
      `🎯 PRECISIÓN: ${participant.accuracyPercentage}%\n` +
      `🎫 FOLIO OFICIAL: #${folio}\n` +
      `📅 FECHA: ${new Date(participant.completedAt).toLocaleDateString()}\n\n` +
      `Tu esfuerzo y compromiso reflejan los más altos estándares de hospitalidad y excelencia operativa que distinguen a Cinépolis.\n\n` +
      `Atentamente,\n` +
      `Dirección y Gerencia de Conjunto Cinépolis\n` +
      `"La Capital del Cine"`
    );

    window.open(`mailto:${recipientEmail.trim()}?subject=${subject}&body=${body}`, '_blank');
    setEmailStatus('¡Plantilla oficial preparada y diploma descargado exitosamente!');
    setTimeout(() => {
      setEmailStatus('');
      setShowEmailModal(false);
    }, 3500);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className="my-auto max-w-3xl mx-auto w-full px-2 sm:px-4 py-4"
    >
      {/* Boleto de Cine Perforado */}
      <div className="relative rounded-3xl overflow-hidden shadow-[0_25px_70px_rgba(0,0,0,0.75)] border-2 border-amber-400/50 bg-gradient-to-br from-[#0c1938] via-[#09122c] to-[#050b1c]">
        {/* Cinta superior dorada */}
        <div className="bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-black px-5 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2 font-black text-xs sm:text-sm uppercase tracking-wider">
            <Ticket className="w-4 h-4" />
            <span>BOLETO OFICIAL DE EVALUACIÓN • CLUB CINÉPOLIS</span>
          </div>
          <span className="font-mono font-black text-xs bg-black/15 px-2.5 py-0.5 rounded-full">
            FOLIO #{folio}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12">
          {/* Cuerpo principal del boleto */}
          <div className="md:col-span-8 p-6 sm:p-8 space-y-5 relative">
            <div className="flex flex-col sm:flex-row items-center gap-5">
              <InteractiveMedal3D accuracy={participant.accuracyPercentage} />

              <div className="text-center sm:text-left flex-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-xs font-bold text-amber-300 mb-2">
                  <span>{participant.avatar}</span>
                  <span>Colaborador Evaluado</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight break-words">
                  {participant.nickname}
                </h2>
                {participant.department && (
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-1.5 text-xs text-white/75">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-amber-500/20 border border-amber-400/30 text-amber-200 font-bold">
                      <Briefcase className="w-3.5 h-3.5" />
                      Área: {participant.department}
                    </span>
                  </div>
                )}
                <p className="text-xs text-white/50 mt-1">{quiz.title}</p>
              </div>
            </div>

            {/* Sello de Certificación */}
            <div
              className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${
                isApproved
                  ? 'bg-emerald-950/40 border-emerald-400/50 text-emerald-200'
                  : 'bg-amber-950/30 border-amber-400/40 text-amber-200'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <ShieldCheck className={`w-6 h-6 shrink-0 ${isApproved ? 'text-emerald-400' : 'text-amber-400'}`} />
                <div>
                  <span className="text-xs font-black uppercase tracking-wider block">
                    {isApproved ? '★ CERTIFICADO CINÉPOLIS APROBADO ★' : 'EVALUACIÓN COMPLETADA'}
                  </span>
                  <span className="text-[11px] opacity-80">
                    {isApproved
                      ? 'Obtuviste 80% o más de precisión. Tu diploma oficial está listo para descargar.'
                      : 'Revisa las fichas formativas abajo para reforzar los temas de Club Cinépolis.'}
                  </span>
                </div>
              </div>
              <span className="px-3 py-1 rounded-xl font-black text-sm bg-black/30 border border-white/10 shrink-0">
                {participant.accuracyPercentage}%
              </span>
            </div>

            {/* Métricas tipo talón de boleto */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-black/35 p-3.5 rounded-2xl border border-white/10 text-center">
                <Trophy className="w-5 h-5 text-amber-400 mx-auto mb-1" />
                <div className="text-xl sm:text-2xl font-black text-amber-300">
                  {participant.totalScore.toLocaleString()}
                </div>
                <div className="text-[10px] text-white/50 font-bold uppercase tracking-wider">Puntaje</div>
              </div>

              <div className="bg-black/35 p-3.5 rounded-2xl border border-white/10 text-center">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
                <div className="text-xl sm:text-2xl font-black text-emerald-400">
                  {participant.correctAnswersCount}/{participant.totalQuestionsCount}
                </div>
                <div className="text-[10px] text-white/50 font-bold uppercase tracking-wider">Aciertos</div>
              </div>

              <div className="bg-black/35 p-3.5 rounded-2xl border border-white/10 text-center">
                <Flame className="w-5 h-5 text-orange-400 mx-auto mb-1" />
                <div className="text-xl sm:text-2xl font-black text-orange-400">
                  x{participant.maxStreak}
                </div>
                <div className="text-[10px] text-white/50 font-bold uppercase tracking-wider">Racha Máx</div>
              </div>
            </div>
          </div>

          {/* Línea perforada y Talón con QR de verificación */}
          <div className="md:col-span-4 bg-black/40 border-t-2 md:border-t-0 md:border-l-2 border-dashed border-amber-400/40 p-6 flex flex-col items-center justify-between text-center relative">
            {/* Muescas circulares de boleto */}
            <div className="hidden md:block w-6 h-6 rounded-full bg-[#060d21] border-2 border-amber-400/40 absolute -left-3 -top-3" />
            <div className="hidden md:block w-6 h-6 rounded-full bg-[#060d21] border-2 border-amber-400/40 absolute -left-3 -bottom-3" />

            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-300 block mb-2">
                Código QR de Verificación
              </span>
              <div className="bg-white p-3 rounded-2xl inline-block shadow-lg">
                <QRCodeSVG value={verifyUrl} size={116} level="M" />
              </div>
              <p className="text-[11px] text-white/60 mt-2 font-mono">
                Folio: <strong className="text-white">#{folio}</strong>
              </p>
              <p className="text-[10px] text-white/40 mt-0.5">
                {new Date(participant.completedAt).toLocaleString('es-MX', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </p>
            </div>

            {isApproved && (
              <div className="mt-4 w-full space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    haptic([30, 40, 30]);
                    exportDiplomaPDF(participant, 0, quiz.title, folio);
                  }}
                  className="w-full py-3 px-4 rounded-2xl btn-cinepolis-gold text-black font-black text-xs uppercase tracking-wider shadow-xl flex items-center justify-center gap-2 transition active:scale-95"
                >
                  <Award className="w-4 h-4" />
                  <span>Descargar Mi Diploma PDF</span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleShareWhatsApp}
                    className="py-2.5 px-3 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/40 text-emerald-200 font-bold text-[11px] flex items-center justify-center gap-1.5 transition active:scale-95"
                    title="Compartir felicitación y certificado por WhatsApp"
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                    <span>WhatsApp</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setRecipientEmail('');
                      setShowEmailModal(true);
                    }}
                    className="py-2.5 px-3 rounded-xl bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500/40 text-blue-200 font-bold text-[11px] flex items-center justify-center gap-1.5 transition active:scale-95"
                    title="Enviar felicitación formal por correo electrónico"
                  >
                    <Mail className="w-3.5 h-3.5 text-blue-400" />
                    <span>Enviar a Correo</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Barra inferior de acciones y Fichas Formativas */}
        <div className="bg-black/50 border-t border-white/10 p-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setShowReview(v => !v)}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 border border-blue-400/40 text-blue-200 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition"
          >
            <BookOpen className="w-4 h-4" />
            <span>{showReview ? 'Ocultar Retroalimentación' : 'Ver Fichas Formativas y Respuestas'}</span>
          </button>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {allowReplay && !quiz.preventRetries && quiz.maxAttemptsPerUser !== 1 && (
              <button
                type="button"
                onClick={onPlayAgain}
                className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reintentar</span>
              </button>
            )}
            <button
              type="button"
              onClick={onExit}
              className="flex-1 sm:flex-initial px-6 py-2.5 rounded-xl bg-kahoot-green hover:bg-green-600 text-white font-black text-xs uppercase tracking-wider shadow-lg transition"
            >
              Finalizar y Salir
            </button>
          </div>
        </div>

        {/* Desglose formativo pregunta por pregunta */}
        <AnimatePresence>
          {showReview && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-white/10 bg-black/60 p-4 sm:p-6 space-y-3 overflow-hidden"
            >
              <h4 className="text-xs font-black uppercase tracking-wider text-amber-300 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                <span>Retroalimentación de Capacitación Cinépolis</span>
              </h4>
              {quiz.questions.map((q, idx) => {
                const ans = (participant.answers || []).find(a => a.questionId === q.id);
                const correctOpt = q.options.find(o => o.isCorrect);
                const explanation = q.explanation || DEFAULT_EXPLANATIONS[q.id];
                const isRight = ans?.isCorrect;

                return (
                  <div
                    key={q.id}
                    className={`p-4 rounded-2xl border text-xs space-y-1.5 ${
                      isRight
                        ? 'bg-emerald-950/25 border-emerald-500/30'
                        : 'bg-red-950/25 border-red-500/35'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-black text-white">
                        #{idx + 1}. {q.questionText}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full font-black text-[10px] shrink-0 ${
                          isRight ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
                        }`}
                      >
                        {isRight ? '✓ Acertaste' : '✗ Por reforzar'}
                      </span>
                    </div>
                    {correctOpt && (
                      <p className="text-emerald-300 font-bold">
                        ✓ Respuesta correcta: <span className="text-white">{correctOpt.text}</span>
                      </p>
                    )}
                    {explanation && (
                      <p className="text-amber-200/90 bg-amber-500/10 border border-amber-400/20 rounded-xl p-2.5 leading-relaxed">
                        💡 <strong>¿Por qué?</strong> {explanation}
                      </p>
                    )}
                  </div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Modal Enviar Diploma por Correo */}
      <AnimatePresence>
        {showEmailModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-kahoot-purple-dark border-2 border-white/20 rounded-3xl p-6 max-w-md w-full shadow-2xl text-white space-y-4"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <span className="p-2 bg-blue-500/20 text-blue-300 rounded-xl">
                    <Mail className="w-5 h-5" />
                  </span>
                  <h3 className="text-lg font-black uppercase tracking-tight">
                    Envío Formal por Correo
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowEmailModal(false)}
                  className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 text-xs space-y-1.5 text-white/80">
                <p className="font-bold text-amber-300">
                  📜 Felicitación Institucional de Dirección y Gerencia Cinépolis:
                </p>
                <p className="text-[11px] text-white/60">
                  Se abrirá tu gestor de correo con el mensaje formal de acreditación avalado por la gerencia y se descargará automáticamente tu Diploma PDF oficial para adjuntarlo.
                </p>
              </div>

              <form onSubmit={handleSendEmail} className="space-y-4">
                <div>
                  <label className="text-xs uppercase font-bold text-white/70 block mb-1">
                    Correo del Colaborador o Destinatario *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="tu-correo@cinepolis.com"
                    value={recipientEmail}
                    onChange={e => setRecipientEmail(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/20 text-white text-xs font-semibold focus:outline-none focus:border-amber-400"
                  />
                </div>

                {emailStatus && (
                  <p className="text-xs font-bold text-emerald-300 bg-emerald-500/20 p-2.5 rounded-xl border border-emerald-500/30 text-center animate-pulse">
                    ✓ {emailStatus}
                  </p>
                )}

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowEmailModal(false)}
                    className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn-cinepolis-gold px-5 py-2 text-black font-black text-xs rounded-xl flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5 text-black" />
                    <span>Preparar y Enviar</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
