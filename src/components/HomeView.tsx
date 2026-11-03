import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Play,
  Users,
  Sparkles,
  Clock,
  Gamepad2,
  Dices,
  Share2,
  User,
  Lock,
  BookOpen,
  Building2,
  Briefcase,
  ShieldCheck,
  Award,
  CheckCircle2,
  FileCheck2,
  RotateCcw
} from 'lucide-react';
import type { Quiz, Participant, UserAccount } from '../types/quiz';
import { quizService, DEFAULT_DEPARTMENTS } from '../services/quizService';
import { KahootShapeIcon } from './KahootShapes';
import { ShareQuizModal } from './ShareQuizModal';
import { FlashcardsModal } from './CinemaEffects';

interface HomeViewProps {
  quizzes: Quiz[];
  currentUser?: UserAccount | null;
  invitedQuiz?: Quiz | null;
  onClearInvitation?: () => void;
  onStartQuiz: (quiz: Quiz, nickname: string, avatar: string, branch?: string, department?: string) => void;
  onHostGame: (quiz: Quiz) => void;
  onOpenPinModal: () => void;
}

const AVATAR_OPTIONS = ['🦊', '🦁', '🐼', '🚀', '⚡', '👑', '🦄', '🎮', '🐯', '🔥', '🤖', '🦖', '🌟', '🎯', '🍿', '🎬'];

const RANDOM_NAMES = [
  'SuperNinja', 'AstroLobo', 'PixelGamer', 'MasterQuiz', 'CyberPanda',
  'FuegoRápido', 'Quantum', 'CapitánSpark', 'NovaStar', 'MenteBrillante',
  'FlashZ', 'Titanium', 'Cometa', 'NeoCode', 'Cerebrito'
];

export const HomeView: React.FC<HomeViewProps> = ({
  quizzes,
  currentUser,
  invitedQuiz,
  onClearInvitation,
  onStartQuiz,
  onHostGame,
  onOpenPinModal,
}) => {
  const [nickname, setNickname] = useState<string>(() => {
    return currentUser?.name || currentUser?.nickname || localStorage.getItem('kahoot_player_nickname') || '';
  });
  const [selectedAvatar, setSelectedAvatar] = useState<string>(() => {
    return localStorage.getItem('kahoot_player_avatar') || '🦊';
  });
  const [branch, setBranch] = useState<string>(() => {
    return currentUser?.branch || localStorage.getItem('kahoot_player_branch') || '';
  });
  const [department, setDepartment] = useState<string>(() => {
    return currentUser?.department || localStorage.getItem('kahoot_player_department') || DEFAULT_DEPARTMENTS[0];
  });

  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [sharingQuiz, setSharingQuiz] = useState<Quiz | null>(null);
  const [flashcardsQuiz, setFlashcardsQuiz] = useState<Quiz | null>(null);
  const [verifiedParticipant, setVerifiedParticipant] = useState<Participant | null>(null);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Sincronizar datos si el usuario inicia o cambia sesión
  useEffect(() => {
    if (currentUser) {
      if (currentUser.name || currentUser.nickname) {
        setNickname(currentUser.name || currentUser.nickname);
      }
      if (currentUser.branch) {
        setBranch(currentUser.branch);
      }
      if (currentUser.department) {
        setDepartment(currentUser.department);
      }
    }
  }, [currentUser]);

  // Si alguien escanea el QR de un boleto (?verify=<uuid>), mostrar su constancia oficial
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const verifyId = params.get('verify');
    if (verifyId) {
      quizService.getParticipantById(verifyId).then(p => {
        if (p) setVerifiedParticipant(p);
      });
    }
  }, []);

  const handleSaveProfile = (nick: string, av: string, br?: string, dept?: string) => {
    setNickname(nick);
    setSelectedAvatar(av);
    localStorage.setItem('kahoot_player_nickname', nick);
    localStorage.setItem('kahoot_player_avatar', av);
    if (br !== undefined) {
      setBranch(br);
      localStorage.setItem('kahoot_player_branch', br);
    }
    if (dept !== undefined) {
      setDepartment(dept);
      localStorage.setItem('kahoot_player_department', dept);
    }
  };

  const handleGenerateRandomName = () => {
    const randomNick = RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)];
    const randomAv = AVATAR_OPTIONS[Math.floor(Math.random() * AVATAR_OPTIONS.length)];
    handleSaveProfile(randomNick, randomAv);
  };

  // Abrir automáticamente el modal de ingreso de nombre si se accede por enlace de invitación (?quiz=...)
  useEffect(() => {
    if (invitedQuiz) {
      setSelectedQuiz(invitedQuiz);
      setErrorMessage('');
      setIsJoinModalOpen(true);
    } else {
      setIsJoinModalOpen(false);
      setSelectedQuiz(null);
    }
  }, [invitedQuiz]);

  const handleLaunchSolo = (quiz: Quiz) => {
    setSelectedQuiz(quiz);
    setErrorMessage('');
    setIsJoinModalOpen(true);
  };

  return (
    <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 space-y-12 overflow-hidden">
      {/* Animated Floating Geometric Particles */}
      <motion.div
        animate={{ y: [-10, 15, -10], rotate: [0, 15, 0] }}
        transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut' }}
        className="absolute top-10 left-6 text-red-500/20 pointer-events-none -z-10"
      >
        <KahootShapeIcon shape="triangle" size={60} />
      </motion.div>
      <motion.div
        animate={{ y: [10, -20, 10], rotate: [0, -20, 0] }}
        transition={{ repeat: Infinity, duration: 7, ease: 'easeInOut' }}
        className="absolute top-28 right-10 text-blue-500/20 pointer-events-none -z-10"
      >
        <KahootShapeIcon shape="diamond" size={68} />
      </motion.div>
      <motion.div
        animate={{ y: [-15, 15, -15], rotate: [0, 25, 0] }}
        transition={{ repeat: Infinity, duration: 8, ease: 'easeInOut' }}
        className="absolute bottom-20 left-12 text-yellow-500/20 pointer-events-none -z-10"
      >
        <KahootShapeIcon shape="circle" size={54} />
      </motion.div>
      <motion.div
        animate={{ y: [15, -15, 15], rotate: [0, -15, 0] }}
        transition={{ repeat: Infinity, duration: 6.5, ease: 'easeInOut' }}
        className="absolute bottom-12 right-20 text-green-500/20 pointer-events-none -z-10"
      >
        <KahootShapeIcon shape="square" size={58} />
      </motion.div>

      {/* Invitation Hero Banner if user opened direct link ?quiz=... */}
      {invitedQuiz && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 rounded-3xl p-6 sm:p-8 text-black shadow-[0_16px_40px_rgba(255,184,0,0.35)] relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6 border-2 border-white/60"
        >
          <div className="flex items-center gap-4 sm:gap-6">
            <img
              src={invitedQuiz.coverImage || '/cinepolis-cover.jpg'}
              alt={invitedQuiz.title}
              className="w-20 h-20 sm:w-28 sm:h-28 rounded-2xl object-cover border-2 border-black/20 shadow-xl flex-shrink-0"
            />
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="bg-black text-amber-300 text-[10px] sm:text-xs font-black uppercase px-3 py-1 rounded-full tracking-wider shadow">
                  🎉 ¡Invitación a Evaluación!
                </span>
                <span className="bg-white/80 text-black text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full">
                  {invitedQuiz.category || 'General'}
                </span>
              </div>
              <h2 className="text-xl sm:text-3xl font-black tracking-tight leading-tight">
                {invitedQuiz.title}
              </h2>
              <p className="text-xs sm:text-sm font-bold text-black/80 mt-1">
                {invitedQuiz.questions?.length || 0} preguntas preparadas • ¿Listo para certificarte?
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <button
              type="button"
              onClick={() => setFlashcardsQuiz(invitedQuiz)}
              className="flex-1 md:flex-none px-5 py-3.5 bg-black/15 hover:bg-black/25 text-black font-black uppercase text-xs rounded-2xl transition flex items-center justify-center gap-2 border border-black/20"
            >
              <BookOpen className="w-4 h-4" />
              <span>Modo Práctica</span>
            </button>
            <button
              onClick={() => handleLaunchSolo(invitedQuiz)}
              className="flex-1 md:flex-none px-7 py-3.5 bg-[#0b0f19] hover:bg-[#151c2e] text-amber-300 font-black uppercase text-xs sm:text-sm rounded-2xl shadow-xl active:scale-95 transition flex items-center justify-center gap-2 border border-amber-400/40"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>¡Comenzar Evaluación!</span>
            </button>
            {onClearInvitation && (
              <button
                onClick={onClearInvitation}
                className="p-3 bg-black/10 hover:bg-black/20 text-black rounded-2xl font-black text-xs transition"
                title="Cerrar invitación"
              >
                ✕
              </button>
            )}
          </div>
        </motion.div>
      )}

      {/* Hero Section: Limpio, Ejecutivo y enfocado en Cinépolis */}
      <div className="relative text-center max-w-4xl mx-auto pt-2 pb-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-400/10 border border-amber-400/30 text-xs md:text-sm font-black text-amber-300 uppercase tracking-widest mb-6 shadow-md backdrop-blur-md">
            <Sparkles className="w-4 h-4" />
            <span>Plataforma Oficial de Evaluación y Capacitación</span>
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-black text-white tracking-tight uppercase leading-none drop-shadow-2xl">
            Aprende, Evalúa <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500">
              Y Certifícate en Cinépolis
            </span>
          </h1>

          <p className="mt-6 text-base sm:text-xl text-white/80 max-w-2xl mx-auto font-medium leading-relaxed">
            Evaluaciones dinámicas, retroalimentación formativa inmediata, constancias oficiales con código QR y analíticas de aprendizaje de alto nivel.
          </p>

          {/* Quick Actions Bar */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => {
                if (quizzes.length > 0) {
                  const target = quizzes.find(q => q.id === 'f3f7aa07-4389-4769-a162-3fb8b989bfc0') || quizzes[0];
                  handleLaunchSolo(target);
                }
              }}
              className="px-8 py-4 rounded-2xl btn-cinepolis-gold text-xs sm:text-sm font-black uppercase tracking-wider flex items-center gap-2 shadow-2xl"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Comenzar Evaluación Oficial</span>
            </button>

            <button
              onClick={onOpenPinModal}
              className="px-6 py-4 rounded-2xl btn-cinepolis-glass text-xs sm:text-sm font-bold uppercase tracking-wider flex items-center gap-2"
            >
              <Gamepad2 className="w-4 h-4 text-amber-300" />
              <span>Unirse con PIN de Sala</span>
            </button>
          </div>
        </motion.div>
      </div>

      {/* Available Quizzes Showcase */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-black uppercase text-white tracking-tight flex items-center gap-2.5">
              <Gamepad2 className="w-7 h-7 text-amber-400" />
              <span>Cuestionarios Disponibles ({quizzes.length})</span>
            </h2>
            <p className="text-white/70 text-sm font-semibold">
              Elige tu módulo de evaluación o realiza un repaso previo sin afectar tu historial.
            </p>
          </div>
        </div>

        {/* Quizzes Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quizzes.map((quiz, index) => (
            <motion.div
              key={quiz.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.3 }}
              className="bg-gradient-to-b from-[#0c152c] to-[#060b17] rounded-3xl border-2 border-white/10 overflow-hidden shadow-2xl flex flex-col justify-between group hover:border-amber-400/60 transition-all duration-300 backdrop-blur-md"
            >
              <div>
                <div className="relative h-48 overflow-hidden bg-black/40">
                  <img
                    src={quiz.coverImage || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80'}
                    alt={quiz.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
                  
                  <span className="absolute top-3 left-3 px-3.5 py-1 bg-black/70 backdrop-blur-md rounded-full text-xs font-black text-amber-300 uppercase tracking-wider border border-white/10">
                    {quiz.category}
                  </span>
                  
                  <span className="absolute top-3 right-3 px-3 py-1 bg-[#13234d]/90 backdrop-blur-md rounded-full text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5 shadow border border-white/10">
                    <Clock className="w-3.5 h-3.5 text-amber-300" />
                    {quiz.questions.length} Preguntas
                  </span>
                </div>

                <div className="p-6">
                  <div className="flex items-center gap-2 mb-2">
                    {quiz.maxAttemptsPerUser === 1 || (quiz.maxAttemptsPerUser === undefined && quiz.preventRetries) ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400/20 text-amber-300 border border-amber-400/40">
                        <Lock className="w-3 h-3" /> 1 Intento Único
                      </span>
                    ) : quiz.maxAttemptsPerUser && quiz.maxAttemptsPerUser > 1 ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/40">
                        <RotateCcw className="w-3 h-3" /> Máx. {quiz.maxAttemptsPerUser} Intentos
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        <Sparkles className="w-3 h-3" /> Intentos Ilimitados
                      </span>
                    )}
                  </div>

                  <h3 className="text-xl font-black text-white mb-2 leading-snug group-hover:text-amber-300 transition-colors">
                    {quiz.title}
                  </h3>
                  <p className="text-white/70 text-xs md:text-sm line-clamp-2 leading-relaxed">
                    {quiz.description}
                  </p>
                </div>
              </div>

              <div className="p-6 pt-0 space-y-2.5">
                <button
                  onClick={() => handleLaunchSolo(quiz)}
                  className="w-full py-3.5 px-4 rounded-2xl btn-cinepolis-gold text-xs md:text-sm font-black uppercase tracking-wider shadow-lg flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Jugar Ahora (Desafío)</span>
                </button>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setFlashcardsQuiz(quiz)}
                    className="py-2.5 px-2 rounded-xl btn-cinepolis-glass font-bold uppercase tracking-wider text-[11px] flex items-center justify-center gap-1"
                    title="Estudiar preguntas sin afectar el ranking"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-amber-300" />
                    <span>Práctica</span>
                  </button>

                  <button
                    onClick={() => onHostGame(quiz)}
                    className="py-2.5 px-2 rounded-xl btn-cinepolis-glass font-bold uppercase tracking-wider text-[11px] flex items-center justify-center gap-1"
                    title="Crear una sala multijugador para el equipo"
                  >
                    <Users className="w-3.5 h-3.5 text-blue-300" />
                    <span>Sala</span>
                  </button>

                  <button
                    onClick={() => setSharingQuiz(quiz)}
                    className="py-2.5 px-2 rounded-xl btn-cinepolis-glass text-amber-300 font-bold uppercase tracking-wider text-[11px] flex items-center justify-center gap-1"
                    title="Compartir enlace o código QR de este cuestionario"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Compartir</span>
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Feature Highlights Grid: Profesional y Seguro */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8 border-t border-white/10">
        <div className="bg-black/30 p-6 rounded-3xl border border-white/10 flex items-start gap-4">
          <div className="p-3 bg-red-500/20 text-red-400 rounded-2xl flex-shrink-0">
            <KahootShapeIcon shape="triangle" size={28} />
          </div>
          <div>
            <h4 className="text-base font-black uppercase text-white mb-1">
              Evaluación y Retroalimentación
            </h4>
            <p className="text-xs text-white/70 leading-relaxed font-semibold">
              Cápsula formativa oficial en cada reactivo que explica el por qué de la respuesta correcta de acuerdo a políticas Cinépolis.
            </p>
          </div>
        </div>

        <div className="bg-black/30 p-6 rounded-3xl border border-white/10 flex items-start gap-4">
          <div className="p-3 bg-blue-500/20 text-blue-400 rounded-2xl flex-shrink-0">
            <KahootShapeIcon shape="diamond" size={28} />
          </div>
          <div>
            <h4 className="text-base font-black uppercase text-white mb-1">
              Seguridad y Blindaje Anti-Fraude
            </h4>
            <p className="text-xs text-white/70 leading-relaxed font-semibold">
              Aleatorización anti-copia de opciones, detección de cambios de pestaña y registro de huella digital del dispositivo.
            </p>
          </div>
        </div>

        <div className="bg-black/30 p-6 rounded-3xl border border-white/10 flex items-start gap-4">
          <div className="p-3 bg-amber-500/20 text-amber-300 rounded-2xl flex-shrink-0">
            <Award className="w-7 h-7" />
          </div>
          <div>
            <h4 className="text-base font-black uppercase text-white mb-1">
              Certificación Oficial en PDF
            </h4>
            <p className="text-xs text-white/70 leading-relaxed font-semibold">
              Boletos estilo cine con código QR de verificación y diplomas descargables al obtener 80% o más de aciertos.
            </p>
          </div>
        </div>
      </div>

      {/* Nickname / Colaborador Modal before Solo Play */}
      {isJoinModalOpen && selectedQuiz && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            className="bg-gradient-to-b from-[#0e172f] via-[#091024] to-[#040815] border-2 border-amber-400/40 rounded-3xl p-5 sm:p-8 max-w-lg w-full shadow-2xl text-center text-white relative my-auto max-h-[92vh] overflow-y-auto"
          >
            {/* Botón de cierre */}
            <button
              onClick={() => setIsJoinModalOpen(false)}
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white font-black flex items-center justify-center transition"
              title="Cerrar"
            >
              ✕
            </button>

            {/* Insignia Superior */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-400/20 border border-amber-400/40 text-xs font-black text-amber-300 uppercase tracking-widest mb-3">
              <User className="w-4 h-4" />
              <span>Registro de Colaborador</span>
            </div>

            <h3 className="text-2xl sm:text-3xl font-black uppercase tracking-tight mb-1">
              {currentUser ? `¡Hola, ${currentUser.name || currentUser.nickname}!` : '¿Cuál es tu nombre?'}
            </h3>
            <p className="text-white/80 text-xs sm:text-sm font-medium mb-5">
              Confirmación de datos para la evaluación oficial:
              <br />
              <strong className="text-amber-300 font-black text-sm sm:text-base">
                {selectedQuiz.title}
              </strong>
              <span className="block text-[11px] text-white/60 mt-0.5">
                ({selectedQuiz.questions?.length || 0} preguntas preparadas)
              </span>
            </p>

            {(() => {
              const accessCheck = quizService.isExamAccessible(selectedQuiz);
              if (!accessCheck.accessible) {
                return (
                  <div className="py-6 text-center space-y-4">
                    <div className="w-16 h-16 mx-auto bg-amber-500/20 text-amber-300 rounded-3xl flex items-center justify-center border border-amber-500/40 shadow-inner">
                      <Lock className="w-8 h-8" />
                    </div>
                    <h4 className="text-xl sm:text-2xl font-black text-white">Evaluación Concluida</h4>
                    <p className="text-xs sm:text-sm text-white/70 max-w-sm mx-auto leading-relaxed">
                      {accessCheck.reason}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setIsJoinModalOpen(false);
                        if (onClearInvitation) onClearInvitation();
                      }}
                      className="px-6 py-3 rounded-2xl btn-cinepolis-glass text-xs uppercase tracking-wider transition"
                    >
                      Entendido
                    </button>
                  </div>
                );
              }

              return (
                <form
                  onSubmit={async e => {
                    e.preventDefault();
                    if (!nickname.trim()) {
                      setErrorMessage('Por favor escribe tu nombre para identificarte en el registro.');
                      return;
                    }

                    // 1. Validar acceso al examen
                    const freshAccessCheck = quizService.isExamAccessible(selectedQuiz);
                    if (!freshAccessCheck.accessible) {
                      setErrorMessage(freshAccessCheck.reason || 'Esta evaluación está cerrada.');
                      return;
                    }

                    // 2. Validar límite individual de intentos para este cuestionario
                    const attemptCheck = await quizService.checkParticipantCanAttempt(selectedQuiz, nickname.trim());
                    if (!attemptCheck.canAttempt) {
                      setErrorMessage(
                        attemptCheck.reason || 'Has alcanzado el límite de intentos permitidos para esta evaluación.'
                      );
                      return;
                    }

                    handleSaveProfile(nickname.trim(), selectedAvatar, undefined, department);
                    setIsJoinModalOpen(false);
                    onStartQuiz(selectedQuiz, nickname.trim(), selectedAvatar, undefined, department || undefined);
                  }}
                  className="space-y-4"
                >
                  {/* Selector de Avatar */}
                  <div>
                    <label className="block text-xs uppercase font-black text-white/70 mb-2">
                      Elige tu avatar
                    </label>
                    <div className="flex justify-center gap-2 flex-wrap">
                      {AVATAR_OPTIONS.map(av => (
                        <button
                          key={av}
                          type="button"
                          onClick={() => setSelectedAvatar(av)}
                          className={`w-11 h-11 text-2xl rounded-2xl border-2 transition transform active:scale-90 flex items-center justify-center ${
                            selectedAvatar === av
                              ? 'border-amber-400 bg-amber-400/20 scale-110 shadow-lg ring-2 ring-amber-400/50'
                              : 'border-white/10 hover:border-white/30 bg-black/30'
                          }`}
                        >
                          {av}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Campo de Nombre Obligatorio */}
                  <div className="space-y-1.5 text-left">
                    <label className="block text-xs uppercase font-black text-white/70">
                      Tu nombre y apellido <span className="text-red-400">*</span>
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Ej. Roberto Martínez..."
                        value={nickname}
                        onChange={e => {
                          setNickname(e.target.value);
                          if (errorMessage) setErrorMessage('');
                        }}
                        className="flex-1 text-center sm:text-left text-lg font-black py-3 px-4 rounded-2xl bg-black/50 border-2 border-white/20 focus:border-amber-400 focus:outline-none transition text-white placeholder-white/30"
                        autoFocus
                      />
                      {!currentUser && (
                        <button
                          type="button"
                          onClick={handleGenerateRandomName}
                          title="Sugerir nombre"
                          className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl border border-white/20 text-white transition active:scale-95 flex items-center justify-center"
                        >
                          <Dices className="w-5 h-5 text-amber-300" />
                        </button>
                      )}
                    </div>
                    {errorMessage && (
                      <p className="text-red-400 text-xs font-bold mt-1 animate-pulse">
                        ⚠️ {errorMessage}
                      </p>
                    )}
                  </div>

                  {/* Área / Puesto en el Cine */}
                  <div className="space-y-1 text-left">
                    <label className="text-[11px] uppercase font-black text-white/70 flex items-center gap-1.5">
                      <Briefcase className="w-3.5 h-3.5 text-amber-300" />
                      <span>Área / Puesto en el Cine</span>
                    </label>
                    <select
                      value={department}
                      onChange={e => setDepartment(e.target.value)}
                      className="w-full py-3 px-3.5 rounded-2xl bg-black/50 border-2 border-white/20 focus:border-amber-400 focus:outline-none text-sm font-bold text-white"
                    >
                      {(selectedQuiz.departments && selectedQuiz.departments.length > 0
                        ? selectedQuiz.departments
                        : DEFAULT_DEPARTMENTS
                      ).map(dept => (
                        <option key={dept} value={dept} className="bg-slate-900 text-white">
                          {dept}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Botón de Modo Práctica (Cine-Flashcards) antes del examen */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsJoinModalOpen(false);
                      setFlashcardsQuiz(selectedQuiz);
                    }}
                    className="w-full py-2.5 px-4 rounded-2xl btn-cinepolis-glass text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition"
                  >
                    <BookOpen className="w-4 h-4 text-amber-300" />
                    <span>Repasar con Cine-Flashcards (Sin registro de intento)</span>
                  </button>

                  {/* Botones de Acción */}
                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsJoinModalOpen(false)}
                      className="flex-1 py-3.5 rounded-2xl btn-cinepolis-glass text-xs uppercase tracking-wider transition"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={!nickname.trim()}
                      className="flex-[2] py-3.5 rounded-2xl btn-cinepolis-gold disabled:opacity-40 disabled:cursor-not-allowed text-xs font-black uppercase tracking-wider transition shadow-2xl flex items-center justify-center gap-2"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      <span>¡Entrar al Cuestionario!</span>
                    </button>
                  </div>
                </form>
              );
            })()}
          </motion.div>
        </div>
      )}

      {/* Share Quiz Modal */}
      {sharingQuiz && (
        <ShareQuizModal
          quiz={sharingQuiz}
          onClose={() => setSharingQuiz(null)}
        />
      )}

      {/* Cine-Flashcards Study Modal */}
      {flashcardsQuiz && (
        <FlashcardsModal
          quiz={flashcardsQuiz}
          onClose={() => setFlashcardsQuiz(null)}
          onStartOfficial={() => {
            const q = flashcardsQuiz;
            setFlashcardsQuiz(null);
            handleLaunchSolo(q);
          }}
        />
      )}

      {/* Modal de Verificación de Folio QR (?verify=...) */}
      {verifiedParticipant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            className="cinepolis-glass rounded-3xl p-6 sm:p-8 max-w-md w-full text-center space-y-4 border-2 border-emerald-400/50"
          >
            <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300">
              <ShieldCheck className="w-9 h-9" />
            </div>
            <span className="inline-block px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-black uppercase tracking-widest">
              Folio Oficial Verificado #{verifiedParticipant.id.slice(0, 8).toUpperCase()}
            </span>
            <h3 className="text-2xl font-black text-white">
              {verifiedParticipant.avatar} {verifiedParticipant.nickname}
            </h3>
            {verifiedParticipant.department && (
              <p className="text-xs text-amber-300 font-bold">
                🍿 Área: {verifiedParticipant.department}
              </p>
            )}
            <div className="grid grid-cols-3 gap-2 bg-black/40 p-3.5 rounded-2xl border border-white/10 text-xs">
              <div>
                <span className="text-white/50 block">Puntaje</span>
                <strong className="text-amber-300 text-base">{verifiedParticipant.totalScore.toLocaleString()}</strong>
              </div>
              <div>
                <span className="text-white/50 block">Aciertos</span>
                <strong className="text-white text-base">
                  {verifiedParticipant.correctAnswersCount}/{verifiedParticipant.totalQuestionsCount}
                </strong>
              </div>
              <div>
                <span className="text-white/50 block">Precisión</span>
                <strong className="text-emerald-400 text-base">{verifiedParticipant.accuracyPercentage}%</strong>
              </div>
            </div>
            <p className="text-[11px] text-white/50">
              Evaluación registrada el {new Date(verifiedParticipant.completedAt).toLocaleString('es-MX')}
            </p>
            <button
              type="button"
              onClick={() => {
                setVerifiedParticipant(null);
                if (typeof window !== 'undefined' && window.history) {
                  window.history.replaceState({}, '', window.location.pathname);
                }
              }}
              className="w-full py-3 rounded-2xl btn-cinepolis-gold text-xs font-black uppercase tracking-wider"
            >
              Cerrar Verificación
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
};
