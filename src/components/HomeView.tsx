import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  ChevronRight,
  Plus,
  Search,
  X,
  ClipboardList,
  Play,
  Users,
  Gamepad2,
  Dices,
  Share2,
  User,
  Lock,
  Briefcase,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import type { Quiz, Participant, UserAccount } from '../types/quiz';
import { quizService, DEFAULT_DEPARTMENTS } from '../services/quizService';
import { getActivityStartError } from '../services/activityAccess';
import { ShareQuizModal } from './ShareQuizModal';
import { SurveyStartDialog } from './SurveyStartDialog';
import { isSurveyQuiz } from '../utils/quizKind';

interface HomeViewProps {
  quizzes: Quiz[];
  currentUser?: UserAccount | null;
  invitedQuiz?: Quiz | null;
  verifyId?: string | null;
  onClearVerification: () => void;
  onClearInvitation?: () => void;
  onStartQuiz: (quiz: Quiz, nickname: string, avatar: string, branch?: string, department?: string) => void;
  onHostGame: (quiz: Quiz) => void;
  onOpenPinModal: () => void;
  onOpenSurveys: () => void;
  onCreateSurvey?: () => void;
  publishedSurveyTitle?: string;
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
  verifyId,
  onClearVerification,
  onClearInvitation,
  onStartQuiz,
  onHostGame,
  onOpenPinModal,
  onOpenSurveys,
  onCreateSurvey,
  publishedSurveyTitle,
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
  const [verifiedParticipant, setVerifiedParticipant] = useState<Participant | null>(null);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [search, setSearch] = useState('');

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

  // Si alguien escanea el QR de un boleto (?verify=<uuid>), mostrar su constancia guardada
  useEffect(() => {
    let active = true;
    setVerifiedParticipant(null);
    if (verifyId) {
      quizService.getParticipantById(verifyId).then(p => {
        if (active) setVerifiedParticipant(p);
      });
    }
    return () => { active = false; };
  }, [verifyId]);

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

  async function startActivity(quiz: Quiz, name: string) {
    const error = await getActivityStartError(quiz, name);
    if (error) return error;
    try {
      if (!quiz.isAnonymousSurvey) handleSaveProfile(name, selectedAvatar, undefined, department);
      setIsJoinModalOpen(false);
      onStartQuiz(quiz, name, selectedAvatar, undefined, department || undefined);
    } catch {
      return 'No se pudo abrir la actividad. Intenta nuevamente.';
    }
  }

  const surveys = quizzes.filter(quiz => isSurveyQuiz(quiz) && quiz.questions.length > 0 && quizService.isExamAccessible(quiz).accessible);
  const evaluations = quizzes.filter(quiz => !isSurveyQuiz(quiz));
  const invitedSurvey = invitedQuiz && isSurveyQuiz(invitedQuiz);
  const query = search.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es-MX');
  const matchesSearch = (quiz: Quiz) => [quiz.title, quiz.description, quiz.category].join(' ')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es-MX').includes(query);
  const matchingSurveys = surveys.filter(matchesSearch);
  const matchingEvaluations = evaluations.filter(matchesSearch);
  const firstName = (currentUser?.name || currentUser?.nickname || 'Cinepolito').trim().split(/\s+/)[0];
  const today = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'long' }).format(new Date());

  return (
    <div className="quiz-home">
      <div className="workspace-welcome">
        <div><span className="workspace-breadcrumb">Mi espacio <ChevronRight size={13} aria-hidden="true" /> Kahoot</span>
          <p>Hola, {firstName}<span>Qué gusto tenerte aquí.</span></p></div>
        <span className="workspace-date"><CalendarDays size={16} aria-hidden="true" />{today}</span>
      </div>
      {/* Invitation Hero Banner if user opened direct link ?quiz=... */}
      {invitedQuiz && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="mb-5 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 rounded-3xl p-6 sm:p-8 text-black shadow-[0_16px_40px_rgba(255,184,0,0.35)] relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6 border-2 border-white/60"
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
                  {invitedSurvey ? 'Invitación a encuesta' : 'Invitación a evaluación'}
                </span>
                <span className="bg-white/80 text-black text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full">
                  {invitedQuiz.category || 'General'}
                </span>
              </div>
              <h2 className="text-xl sm:text-3xl font-black tracking-tight leading-tight">
                {invitedQuiz.title}
              </h2>
              <p className="text-xs sm:text-sm font-bold text-black/80 mt-1">
                {invitedQuiz.questions.length} {invitedQuiz.questions.length === 1 ? 'pregunta' : 'preguntas'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <button
              onClick={() => handleLaunchSolo(invitedQuiz)}
              className="flex-1 md:flex-none px-7 py-3.5 bg-[#0b0f19] hover:bg-[#151c2e] text-amber-300 font-black uppercase text-xs sm:text-sm rounded-2xl shadow-xl active:scale-95 transition flex items-center justify-center gap-2 border border-amber-400/40"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>{invitedSurvey ? 'Responder encuesta' : 'Comenzar evaluación'}</span>
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

      <section className="quiz-hero" aria-labelledby="quiz-home-heading" data-enter>
        <div className="quiz-hero-content">
          <span className="section-eyebrow">Nuestro espacio de aprendizaje</span>
          <h1 id="quiz-home-heading"><span className="cinema-title-line"><span>Encuestas y</span></span>{' '}<span className="cinema-title-line"><span>evaluaciones</span></span></h1>
          <p>Comparte tu opinión, pon a prueba lo que sabes y continúa tu desarrollo.</p>
          <div className="quiz-hero-actions">
            <button type="button" className="quiz-action quiz-action-primary" onClick={() => { setSearch(''); onOpenSurveys(); }}>
              Ver encuestas <ArrowRight size={18} aria-hidden="true" />
            </button>
            <button type="button" className="quiz-action" onClick={onOpenPinModal}>
              <Gamepad2 size={19} aria-hidden="true" /> Unirme con PIN
            </button>
          </div>
        </div>
        <div className="quiz-hero-art" aria-hidden="true"><img src="/expertos-film.webp" alt="" fetchPriority="high" width="1100" height="733" /></div>
      </section>

      <div className="activity-toolbar">
        <div><span className="section-eyebrow">Tu aprendizaje</span><h2>Actividades disponibles</h2></div>
        <label className="activity-search">
          <Search size={19} aria-hidden="true" /><span className="sr-only">Buscar actividades</span>
          <input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar una actividad…" />
          {search && <button type="button" aria-label="Limpiar búsqueda" onClick={() => setSearch('')}><X size={17} aria-hidden="true" /></button>}
        </label>
      </div>
      {search && <p className="activity-search-summary" role="status">{matchingSurveys.length + matchingEvaluations.length} actividades coinciden con tu búsqueda.</p>}

      <section id="encuestas" className="quiz-section" tabIndex={-1} aria-labelledby="surveys-heading">
        <div className="activity-section-heading">
          <div><h2 id="surveys-heading">Encuestas <span>{surveys.length}</span></h2><p>Tu opinión ayuda a mejorar nuestro equipo.</p></div>
          {onCreateSurvey && <button type="button" className="quiz-action quiz-action-primary" onClick={onCreateSurvey}><Plus size={18} aria-hidden="true" />Crear encuesta</button>}
        </div>
        {publishedSurveyTitle && <p role="status" className="survey-published"><CheckCircle2 size={19} aria-hidden="true" />Encuesta publicada. {publishedSurveyTitle}</p>}
        {matchingSurveys.length ? (
          <div className="survey-list">
            {matchingSurveys.map(quiz => (
              <article key={quiz.id} className="survey-card">
                <div className="survey-card-top"><span className="survey-card-icon"><ClipboardList size={22} aria-hidden="true" /></span>
                  <span className="activity-badge">{quiz.isAnonymousSurvey ? 'Anónima' : 'Encuesta'}</span></div>
                <div className="survey-card-copy"><h3>{quiz.title}</h3>{quiz.description && <p>{quiz.description}</p>}</div>
                <div className="survey-card-footer">
                  <span><ClipboardList size={15} aria-hidden="true" />{quiz.questions.length} {quiz.questions.length === 1 ? 'pregunta' : 'preguntas'}</span>
                  <button type="button" className="activity-text-action" onClick={() => handleLaunchSolo(quiz)} aria-label={'Responder encuesta: ' + quiz.title}>
                    Responder encuesta <ArrowRight size={17} aria-hidden="true" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : <div className="survey-empty"><ClipboardList size={25} aria-hidden="true" /><p>{search ? 'No encontramos encuestas con esa búsqueda.' : 'Por ahora no hay encuestas abiertas. Cuando se publique una, aparecerá aquí.'}</p></div>}
      </section>

      <section className="quiz-section" aria-labelledby="evaluations-heading">
        <div className="activity-section-heading">
          <div><h2 id="evaluations-heading">Evaluaciones <span>{evaluations.length}</span></h2><p>Refuerza tus conocimientos en cada área.</p></div>
        </div>
        <div className="evaluation-grid">
          {matchingEvaluations.map(quiz => (
            <article key={quiz.id} className="evaluation-card">
              <div className="evaluation-card-image">
                <img src={quiz.coverImage || '/expertos-film.webp'} alt="" loading="lazy" width="600" height="340" />
                <span>{quiz.category || 'Capacitación'}</span>
              </div>
              <div className="evaluation-card-copy">
                <span className="evaluation-meta"><BookOpen size={15} aria-hidden="true" />{quiz.questions.length} {quiz.questions.length === 1 ? 'pregunta' : 'preguntas'}
                  <span>·</span>{quiz.maxAttemptsPerUser === 1 || (quiz.maxAttemptsPerUser === undefined && quiz.preventRetries)
                    ? '1 intento' : quiz.maxAttemptsPerUser ? `${quiz.maxAttemptsPerUser} intentos` : 'Sin límite de intentos'}</span>
                <h3>{quiz.title}</h3>
                {quiz.description && <p>{quiz.description}</p>}
              </div>
              <div className="evaluation-card-actions">
                <button type="button" onClick={() => handleLaunchSolo(quiz)} className="quiz-action quiz-action-primary">
                  Iniciar evaluación <ArrowRight size={17} aria-hidden="true" />
                </button>
                <div className="evaluation-secondary-actions">
                  <button type="button" onClick={() => onHostGame(quiz)}><Users size={16} aria-hidden="true" />Crear sala</button>
                  <button type="button" onClick={() => setSharingQuiz(quiz)}><Share2 size={16} aria-hidden="true" />Compartir</button>
                </div>
              </div>
            </article>
          ))}
        </div>
        {!matchingEvaluations.length && <div className="survey-empty"><BookOpen size={25} aria-hidden="true" /><p>{search ? 'No encontramos evaluaciones con esa búsqueda.' : 'Por ahora no hay evaluaciones disponibles.'}</p></div>}
      </section>

      {isJoinModalOpen && selectedQuiz && isSurveyQuiz(selectedQuiz) && (
        <SurveyStartDialog key={selectedQuiz.id} quiz={selectedQuiz} user={currentUser} initialName={nickname}
          onClose={() => setIsJoinModalOpen(false)} onStart={name => startActivity(selectedQuiz, name)} />
      )}
      {/* Nickname / Colaborador Modal before Solo Play */}
      {isJoinModalOpen && selectedQuiz && !isSurveyQuiz(selectedQuiz) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            className="utility-dialog border rounded-2xl p-5 sm:p-8 max-w-lg w-full text-center relative my-auto max-h-[92dvh] overflow-y-auto"
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
              Confirma tus datos para esta evaluación:
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
                  onSubmit={async event => {
                    event.preventDefault();
                    setErrorMessage(await startActivity(selectedQuiz, nickname.trim()) || '');
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
                      <span>Comenzar evaluación</span>
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
              Folio verificado #{verifiedParticipant.id.slice(0, 8).toUpperCase()}
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
                onClearVerification();
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
