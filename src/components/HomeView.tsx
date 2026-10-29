import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Users, Trophy, Sparkles, Clock, ArrowRight, Gamepad2 } from 'lucide-react';
import { Quiz } from '../types/quiz';
import { KahootShapeIcon } from './KahootShapes';

interface HomeViewProps {
  quizzes: Quiz[];
  onStartQuiz: (quiz: Quiz, nickname: string, avatar: string) => void;
  onHostGame: (quiz: Quiz) => void;
  onJoinWithPin: (pin: string, nickname: string, avatar: string) => void;
  onOpenAdmin: () => void;
}

const AVATAR_OPTIONS = ['🦊', '🦁', '🐼', '🚀', '⚡', '👑', '🦄', '🎮', '🐯', '🔥'];

export const HomeView: React.FC<HomeViewProps> = ({
  quizzes,
  onStartQuiz,
  onHostGame,
  onJoinWithPin,
  onOpenAdmin,
}) => {
  const [nickname, setNickname] = useState<string>(() => {
    return localStorage.getItem('kahoot_player_nickname') || '';
  });
  const [selectedAvatar, setSelectedAvatar] = useState<string>(() => {
    return localStorage.getItem('kahoot_player_avatar') || '🦊';
  });
  const [gamePin, setGamePin] = useState<string>('');
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const handleSaveProfile = (nick: string, av: string) => {
    setNickname(nick);
    setSelectedAvatar(av);
    localStorage.setItem('kahoot_player_nickname', nick);
    localStorage.setItem('kahoot_player_avatar', av);
  };

  const handleLaunchSolo = (quiz: Quiz) => {
    if (!nickname.trim()) {
      setSelectedQuiz(quiz);
      setIsJoinModalOpen(true);
      return;
    }
    handleSaveProfile(nickname.trim(), selectedAvatar);
    onStartQuiz(quiz, nickname.trim(), selectedAvatar);
  };

  const handleJoinPinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!gamePin.trim() || gamePin.trim().length < 6) {
      setErrorMessage('Por favor ingresa un PIN válido de 6 dígitos.');
      return;
    }
    if (!nickname.trim()) {
      setErrorMessage('Ingresa tu nombre o apodo para unirte.');
      return;
    }
    handleSaveProfile(nickname.trim(), selectedAvatar);
    onJoinWithPin(gamePin.trim(), nickname.trim(), selectedAvatar);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 space-y-12">
      {/* Hero Section */}
      <div className="relative text-center max-w-4xl mx-auto pt-4 pb-8">
        {/* Floating Background Shapes */}
        <div className="absolute top-0 left-4 text-red-500/30 animate-bounce -z-10 pointer-events-none">
          <KahootShapeIcon shape="triangle" size={54} />
        </div>
        <div className="absolute top-10 right-8 text-blue-500/30 animate-pulse -z-10 pointer-events-none">
          <KahootShapeIcon shape="diamond" size={48} />
        </div>
        <div className="absolute bottom-4 left-16 text-yellow-500/30 animate-wiggle -z-10 pointer-events-none">
          <KahootShapeIcon shape="circle" size={44} />
        </div>
        <div className="absolute bottom-0 right-12 text-green-500/30 animate-bounce -z-10 pointer-events-none">
          <KahootShapeIcon shape="square" size={50} />
        </div>

        {/* Hero Title */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-xs md:text-sm font-black text-amber-300 uppercase tracking-widest mb-6 shadow-md">
            <Sparkles className="w-4 h-4" />
            <span>Plataforma Interactiva Estilo Kahoot</span>
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-black text-white tracking-tight uppercase leading-none drop-shadow-xl">
            ¡Aprende Jugando <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-kahoot-yellow via-amber-300 to-yellow-500">
              Con Máxima Emoción!
            </span>
          </h1>

          <p className="mt-6 text-base sm:text-xl text-white/80 max-w-2xl mx-auto font-medium leading-relaxed">
            Cuestionarios interactivos a toda velocidad, temporizador con adrenalina, rachas con fuego y animaciones profesionales.
          </p>
        </motion.div>

        {/* Quick PIN Entry Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="mt-10 max-w-lg mx-auto bg-white text-gray-900 rounded-3xl p-6 md:p-8 shadow-2xl border-4 border-white/30"
        >
          <form onSubmit={handleJoinPinSubmit} className="space-y-4">
            <div className="text-center mb-4">
              <span className="text-xs uppercase font-black text-kahoot-purple tracking-widest block">
                ¿Tienes el PIN de una sala en vivo?
              </span>
            </div>

            <input
              type="text"
              maxLength={6}
              placeholder="PIN de Juego (6 dígitos)"
              value={gamePin}
              onChange={e => {
                setGamePin(e.target.value.replace(/\D/g, ''));
                setErrorMessage('');
              }}
              className="w-full text-center text-2xl md:text-3xl font-black tracking-widest py-3 px-4 rounded-2xl border-2 border-gray-300 focus:border-kahoot-purple focus:outline-none transition bg-gray-50 uppercase placeholder-gray-400"
            />

            <div className="grid grid-cols-4 gap-2 py-1">
              <div className="col-span-1">
                <select
                  value={selectedAvatar}
                  onChange={e => setSelectedAvatar(e.target.value)}
                  className="w-full text-2xl p-2.5 rounded-2xl border-2 border-gray-300 text-center bg-gray-50 focus:outline-none focus:border-kahoot-purple"
                >
                  {AVATAR_OPTIONS.map(av => (
                    <option key={av} value={av}>
                      {av}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-span-3">
                <input
                  type="text"
                  placeholder="Tu apodo / nombre..."
                  value={nickname}
                  onChange={e => {
                    setNickname(e.target.value);
                    setErrorMessage('');
                  }}
                  className="w-full py-3 px-4 rounded-2xl border-2 border-gray-300 font-bold text-base bg-gray-50 focus:border-kahoot-purple focus:outline-none placeholder-gray-400"
                />
              </div>
            </div>

            {errorMessage && (
              <p className="text-red-600 text-xs font-bold">{errorMessage}</p>
            )}

            <button
              type="submit"
              className="w-full py-4 rounded-2xl bg-kahoot-purple hover:bg-kahoot-purple-light text-white font-black text-lg uppercase tracking-wider shadow-lg active:scale-95 transition"
            >
              ¡Unirse al Juego!
            </button>
          </form>
        </motion.div>
      </div>

      {/* Available Quizzes Showcase */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-black uppercase text-white tracking-tight flex items-center gap-2">
              <Gamepad2 className="w-8 h-8 text-kahoot-yellow" />
              <span>Cuestionarios Disponibles</span>
            </h2>
            <p className="text-white/70 text-sm font-semibold">
              Selecciona un cuestionario para jugar en solitario o iniciar una sala para tus participantes.
            </p>
          </div>

          <button
            onClick={onOpenAdmin}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm border border-white/20 transition self-start sm:self-auto"
          >
            <span>Ver Rankings (Admin)</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Quizzes Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quizzes.map((quiz, index) => (
            <motion.div
              key={quiz.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.3 }}
              className="bg-kahoot-purple-dark/90 rounded-3xl border-2 border-white/10 overflow-hidden shadow-2xl flex flex-col justify-between group hover:border-kahoot-yellow/60 transition-all duration-300 backdrop-blur-md"
            >
              <div>
                {/* Cover Image & Badges */}
                <div className="relative h-48 overflow-hidden bg-black/40">
                  <img
                    src={quiz.coverImage || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80'}
                    alt={quiz.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  
                  <span className="absolute top-3 left-3 px-3.5 py-1 bg-black/60 backdrop-blur-md rounded-full text-xs font-black text-amber-300 uppercase tracking-wider border border-white/10">
                    {quiz.category}
                  </span>
                  
                  <span className="absolute top-3 right-3 px-3 py-1 bg-kahoot-purple-light/90 backdrop-blur-md rounded-full text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5 shadow">
                    <Clock className="w-3.5 h-3.5" />
                    {quiz.questions.length} Preguntas
                  </span>
                </div>

                {/* Details */}
                <div className="p-6">
                  <h3 className="text-xl font-black text-white mb-2 leading-snug">
                    {quiz.title}
                  </h3>
                  <p className="text-white/70 text-xs md:text-sm line-clamp-2 leading-relaxed">
                    {quiz.description}
                  </p>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="p-6 pt-0 space-y-2.5">
                <button
                  onClick={() => handleLaunchSolo(quiz)}
                  className="w-full py-3.5 px-4 rounded-2xl bg-kahoot-yellow hover:bg-amber-400 text-black font-black uppercase tracking-wider text-xs md:text-sm shadow-xl active:scale-95 transition flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Jugar Ahora (Desafío)</span>
                </button>

                <button
                  onClick={() => onHostGame(quiz)}
                  className="w-full py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold uppercase tracking-wider text-xs border border-white/10 active:scale-95 transition flex items-center justify-center gap-2"
                >
                  <Users className="w-4 h-4" />
                  <span>Crear Sala en Vivo (PIN)</span>
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Feature Highlights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8 border-t border-white/10">
        <div className="bg-black/30 p-6 rounded-3xl border border-white/10 flex items-start gap-4">
          <div className="p-3 bg-red-500/20 text-red-400 rounded-2xl flex-shrink-0">
            <KahootShapeIcon shape="triangle" size={28} />
          </div>
          <div>
            <h4 className="text-base font-black uppercase text-white mb-1">
              Ritmo y Temporizador Kahoot
            </h4>
            <p className="text-xs text-white/70 leading-relaxed font-semibold">
              Sonidos analógicos de tensión, colores de urgencia y multiplicador de velocidad de respuesta idéntico a Kahoot.
            </p>
          </div>
        </div>

        <div className="bg-black/30 p-6 rounded-3xl border border-white/10 flex items-start gap-4">
          <div className="p-3 bg-blue-500/20 text-blue-400 rounded-2xl flex-shrink-0">
            <KahootShapeIcon shape="diamond" size={28} />
          </div>
          <div>
            <h4 className="text-base font-black uppercase text-white mb-1">
              Ranking Privado para Admins
            </h4>
            <p className="text-xs text-white/70 leading-relaxed font-semibold">
              Los jugadores reciben su puntaje y resumen individual; la tabla general y analíticas quedan reservadas para el organizador.
            </p>
          </div>
        </div>

        <div className="bg-black/30 p-6 rounded-3xl border border-white/10 flex items-start gap-4">
          <div className="p-3 bg-yellow-500/20 text-yellow-400 rounded-2xl flex-shrink-0">
            <KahootShapeIcon shape="circle" size={28} />
          </div>
          <div>
            <h4 className="text-base font-black uppercase text-white mb-1">
              Escalable con Supabase
            </h4>
            <p className="text-xs text-white/70 leading-relaxed font-semibold">
              Soporte para agregar decenas de cuestionarios en el futuro, respaldados en base de datos PostgreSQL en la nube.
            </p>
          </div>
        </div>
      </div>

      {/* Nickname Modal before Solo Play */}
      {isJoinModalOpen && selectedQuiz && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-kahoot-purple-dark border-2 border-white/20 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl text-center text-white"
          >
            <h3 className="text-2xl font-black uppercase tracking-tight mb-2">
              ¡Casi listo para jugar!
            </h3>
            <p className="text-white/70 text-xs font-semibold mb-6">
              Ingresa el nombre con el que se registrará tu puntaje en el cuestionario:
              <br />
              <strong className="text-kahoot-yellow">{selectedQuiz.title}</strong>
            </p>

            <div className="space-y-4 mb-6">
              <div className="flex justify-center gap-2 flex-wrap">
                {AVATAR_OPTIONS.map(av => (
                  <button
                    key={av}
                    type="button"
                    onClick={() => setSelectedAvatar(av)}
                    className={`w-10 h-10 text-xl rounded-xl border-2 transition ${
                      selectedAvatar === av
                        ? 'border-kahoot-yellow bg-white/20 scale-110 shadow-lg'
                        : 'border-white/10 hover:border-white/30'
                    }`}
                  >
                    {av}
                  </button>
                ))}
              </div>

              <input
                type="text"
                placeholder="Tu apodo o nombre..."
                value={nickname}
                onChange={e => setNickname(e.target.value)}
                className="w-full text-center text-lg font-black py-3 px-4 rounded-2xl bg-black/40 border-2 border-white/20 focus:border-kahoot-yellow focus:outline-none transition text-white placeholder-white/40"
                autoFocus
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setIsJoinModalOpen(false)}
                className="flex-1 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase transition"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (!nickname.trim()) return;
                  handleSaveProfile(nickname.trim(), selectedAvatar);
                  setIsJoinModalOpen(false);
                  onStartQuiz(selectedQuiz, nickname.trim(), selectedAvatar);
                }}
                disabled={!nickname.trim()}
                className="flex-1 py-3 rounded-xl bg-kahoot-yellow hover:bg-amber-400 disabled:opacity-40 text-black font-black text-xs uppercase tracking-wider transition shadow-lg"
              >
                ¡Comenzar!
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
