import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import type { Quiz, Question, Participant } from '../types/quiz';
import { KahootTimer } from './KahootTimer';
import { KahootShapeIcon } from './KahootShapes';
import { soundEffects } from '../utils/soundEffects';
import { quizService } from '../services/quizService';
import { Users, Play, ArrowRight, Home, Shield, Keyboard, Music, QrCode } from 'lucide-react';

interface HostGameViewProps {
  quiz: Quiz;
  onExit: () => void;
  onOpenAdmin: () => void;
}

export const HostGameView: React.FC<HostGameViewProps> = ({
  quiz,
  onExit,
  onOpenAdmin,
}) => {
  const [pin, setPin] = useState<string>('');
  const [gameStatus, setGameStatus] = useState<'lobby' | 'question' | 'reveal' | 'podium'>('lobby');
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState<number>(0);
  const [joinedPlayers, setJoinedPlayers] = useState<Participant[]>([]);
  const [isMusicPlaying, setIsMusicPlaying] = useState<boolean>(false);

  useEffect(() => {
    const generatedPin = Math.floor(100000 + Math.random() * 900000).toString();
    setPin(generatedPin);

    const initialDemoPlayers: Participant[] = [
      {
        id: 'p-demo-1',
        quizId: quiz.id,
        nickname: 'Alex_Gamer',
        avatar: '🚀',
        totalScore: 0,
        streak: 0,
        maxStreak: 0,
        correctAnswersCount: 0,
        totalQuestionsCount: quiz.questions.length,
        accuracyPercentage: 0,
        completedAt: new Date().toISOString(),
      },
      {
        id: 'p-demo-2',
        quizId: quiz.id,
        nickname: 'Maria_Dev',
        avatar: '🦄',
        totalScore: 0,
        streak: 0,
        maxStreak: 0,
        correctAnswersCount: 0,
        totalQuestionsCount: quiz.questions.length,
        accuracyPercentage: 0,
        completedAt: new Date().toISOString(),
      },
      {
        id: 'p-demo-3',
        quizId: quiz.id,
        nickname: 'Carlos_Pro',
        avatar: '🦁',
        totalScore: 0,
        streak: 0,
        maxStreak: 0,
        correctAnswersCount: 0,
        totalQuestionsCount: quiz.questions.length,
        accuracyPercentage: 0,
        completedAt: new Date().toISOString(),
      },
    ];
    setJoinedPlayers(initialDemoPlayers);

    return () => {
      soundEffects.stopLobbyMusic();
    };
  }, [quiz]);

  const currentQuestion: Question = quiz.questions[currentQuestionIdx];
  const totalQuestions = quiz.questions.length;

  const handleToggleLobbyMusic = () => {
    if (isMusicPlaying) {
      soundEffects.stopLobbyMusic();
      setIsMusicPlaying(false);
    } else {
      soundEffects.startLobbyMusic();
      setIsMusicPlaying(true);
    }
  };

  const handleStartGame = () => {
    soundEffects.stopLobbyMusic();
    setIsMusicPlaying(false);
    setGameStatus('question');
    setCurrentQuestionIdx(0);
  };

  const handleRevealAnswers = () => {
    setGameStatus('reveal');
    soundEffects.playCorrect();

    setJoinedPlayers(prev =>
      prev.map(p => {
        const isCorrect = Math.random() > 0.3;
        const points = isCorrect ? Math.floor(700 + Math.random() * 300) : 0;
        return {
          ...p,
          totalScore: p.totalScore + points,
          correctAnswersCount: p.correctAnswersCount + (isCorrect ? 1 : 0),
          streak: isCorrect ? p.streak + 1 : 0,
          maxStreak: Math.max(p.maxStreak, isCorrect ? p.streak + 1 : p.maxStreak),
          accuracyPercentage: Math.round(((p.correctAnswersCount + (isCorrect ? 1 : 0)) / (currentQuestionIdx + 1)) * 100),
        };
      })
    );
  };

  const handleNextQuestion = () => {
    if (currentQuestionIdx + 1 < totalQuestions) {
      setCurrentQuestionIdx(prev => prev + 1);
      setGameStatus('question');
    } else {
      setGameStatus('podium');
      soundEffects.playPodiumFanfare();

      confetti({
        particleCount: 200,
        spread: 100,
        origin: { y: 0.5 },
      });

      joinedPlayers.forEach(p => {
        quizService.saveParticipantResult(p).catch(() => {});
      });
    }
  };

  const sortedPlayers = [...joinedPlayers].sort((a, b) => b.totalScore - a.totalScore);

  return (
    <div className="min-h-[calc(100vh-80px)] flex flex-col justify-between p-4 md:p-8 max-w-7xl mx-auto">
      {/* LOBBY SCREEN */}
      {gameStatus === 'lobby' && (
        <div className="flex-1 flex flex-col justify-between items-center text-center py-6">
          {/* Top Banner: PIN Box & Controls */}
          <div className="w-full max-w-4xl bg-white text-gray-900 rounded-3xl p-6 md:p-8 shadow-2xl border-4 border-white/20 mb-8 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-left flex-1">
              <span className="text-xs uppercase font-black text-kahoot-purple tracking-widest block mb-1">
                Únete en tu dispositivo con el código PIN
              </span>
              <div className="text-5xl sm:text-7xl md:text-8xl font-black text-gray-900 tracking-wider my-1 font-mono">
                {pin}
              </div>
              <p className="text-xs sm:text-sm font-bold text-gray-500">
                Cuestionario: <span className="text-kahoot-purple font-extrabold">{quiz.title}</span>
              </p>
            </div>

            {/* QR Code and Music Action */}
            <div className="flex flex-col items-center gap-3 bg-gray-50 p-4 rounded-2xl border border-gray-200">
              <div className="w-24 h-24 bg-white p-2 rounded-xl shadow-inner border border-gray-200 flex items-center justify-center">
                <QrCode className="w-20 h-20 text-kahoot-purple" />
              </div>
              <button
                type="button"
                onClick={handleToggleLobbyMusic}
                className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition ${
                  isMusicPlaying
                    ? 'bg-amber-400 text-black shadow animate-pulse'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                }`}
              >
                <Music className="w-3.5 h-3.5" />
                <span>{isMusicPlaying ? 'Música Activa 🎵' : 'Poner Música 🎵'}</span>
              </button>
            </div>
          </div>

          {/* Joined Players Roster */}
          <div className="w-full max-w-4xl bg-black/40 border border-white/10 rounded-3xl p-6 md:p-8 mb-8 backdrop-blur-md">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Users className="w-6 h-6 text-kahoot-yellow" />
                <span className="text-xl font-black uppercase text-white">
                  Jugadores en Sala ({joinedPlayers.length})
                </span>
              </div>
              <span className="text-xs text-white/60 font-semibold">
                Esperando a que todos se conecten...
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {joinedPlayers.map(player => (
                <motion.div
                  key={player.id}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: [0.8, 1.05, 1], opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  className="bg-white/10 border border-white/20 rounded-2xl p-4 flex items-center gap-3 shadow-md"
                >
                  <span className="text-3xl">{player.avatar}</span>
                  <span className="font-black text-base text-white truncate">
                    {player.nickname}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Host Controls Footer */}
          <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
            <button
              onClick={onExit}
              className="py-4 px-6 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold uppercase tracking-wider text-sm transition"
            >
              Cancelar
            </button>
            <button
              onClick={handleStartGame}
              className="flex-1 py-4 px-6 rounded-2xl bg-kahoot-yellow hover:bg-amber-400 text-black font-black uppercase tracking-wider text-base shadow-2xl active:scale-95 transition flex items-center justify-center gap-2"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>¡Iniciar Juego!</span>
            </button>
          </div>
        </div>
      )}

      {/* QUESTION & REVEAL SCREEN */}
      {(gameStatus === 'question' || gameStatus === 'reveal') && (
        <div className="flex-1 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4 bg-kahoot-purple-dark/80 p-4 rounded-2xl border border-white/10">
            <div className="flex items-center gap-3">
              <span className="text-sm font-black text-white uppercase tracking-wider">
                Pregunta {currentQuestionIdx + 1} de {totalQuestions}
              </span>
              <span className="px-3 py-1 bg-white/10 rounded-full text-xs font-bold text-amber-300 uppercase">
                {currentQuestion.questionType === 'puzzle' && '🧩 Puzzle (Ordenar)'}
                {currentQuestion.questionType === 'type_answer' && '⌨️ Escribir Respuesta'}
                {currentQuestion.questionType === 'true_false' && '⚖️ Verdadero / Falso'}
                {currentQuestion.questionType === 'multiple_choice' && '🔘 Opción Múltiple'}
              </span>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-xs font-bold text-white/70">
                PIN: <strong className="text-kahoot-yellow font-mono text-base">{pin}</strong>
              </span>

              {gameStatus === 'question' ? (
                <button
                  onClick={handleRevealAnswers}
                  className="px-4 py-2 rounded-xl bg-kahoot-yellow hover:bg-amber-400 text-black font-black text-xs uppercase tracking-wider transition"
                >
                  Revelar Respuestas
                </button>
              ) : (
                <button
                  onClick={handleNextQuestion}
                  className="px-5 py-2 rounded-xl bg-white text-gray-900 font-black text-xs uppercase tracking-wider transition flex items-center gap-1.5 shadow-lg"
                >
                  <span>{currentQuestionIdx + 1 < totalQuestions ? 'Siguiente' : 'Ver Podio'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Central Question Box */}
          <div className="bg-white text-gray-900 rounded-3xl p-8 shadow-2xl mb-6 border-4 border-white/20 text-center flex flex-col items-center justify-center min-h-[220px]">
            {gameStatus === 'question' && (
              <div className="mb-4">
                <KahootTimer
                  initialSeconds={currentQuestion.timeLimit || 20}
                  onTimeUp={handleRevealAnswers}
                />
              </div>
            )}

            <h2 className="text-2xl sm:text-4xl font-black text-gray-900 max-w-4xl leading-tight">
              {currentQuestion.questionText}
            </h2>

            {currentQuestion.imageUrl && (
              <div className="mt-4 max-h-60 sm:max-h-72 rounded-2xl overflow-hidden shadow-xl border-4 border-white/80 bg-black/10">
                <img
                  src={currentQuestion.imageUrl}
                  alt="Pregunta"
                  className="w-full h-full object-contain max-w-lg mx-auto"
                />
              </div>
            )}
          </div>

          {/* DYNAMIC DISPLAY ACCORDING TO QUESTION TYPE */}
          {['multiple_choice', 'true_false'].includes(currentQuestion.questionType) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {currentQuestion.options.map(opt => {
                const colorClasses = {
                  red: 'kahoot-btn-red text-white',
                  blue: 'kahoot-btn-blue text-white',
                  yellow: 'kahoot-btn-yellow text-white',
                  green: 'kahoot-btn-green text-white',
                }[opt.color];

                let borderClass = 'border-2 border-white/20';
                let opacityClass = 'opacity-100';

                if (gameStatus === 'reveal') {
                  if (opt.isCorrect) {
                    borderClass = 'border-4 border-white ring-4 ring-green-400 scale-[1.02] shadow-2xl';
                  } else {
                    opacityClass = 'opacity-40 filter grayscale-[40%]';
                  }
                }

                return (
                  <div
                    key={opt.id}
                    className={`min-h-[100px] p-6 rounded-2xl flex items-center gap-4 ${colorClasses} ${borderClass} ${opacityClass} transition-all duration-300`}
                  >
                    <div className="p-2.5 bg-black/20 rounded-xl">
                      <KahootShapeIcon shape={opt.shape} size={32} />
                    </div>
                    <span className="text-xl md:text-2xl font-black tracking-wide">
                      {opt.text}
                    </span>
                    {gameStatus === 'reveal' && opt.isCorrect && (
                      <span className="ml-auto px-3 py-1 bg-white text-green-700 rounded-full text-xs font-black uppercase">
                        Correcta
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {currentQuestion.questionType === 'puzzle' && (
            <div className="bg-black/40 border-2 border-white/20 rounded-3xl p-6 backdrop-blur-md">
              <div className="text-center mb-4">
                <span className="text-sm uppercase font-black text-amber-300 tracking-wider">
                  {gameStatus === 'reveal' ? '✅ Secuencia Ordenada Correcta:' : '🧩 Elementos a Ordenar:'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {currentQuestion.options.map((opt, idx) => {
                  const colorClasses = {
                    red: 'bg-kahoot-red',
                    blue: 'bg-kahoot-blue',
                    yellow: 'bg-kahoot-yellow',
                    green: 'bg-kahoot-green',
                  }[opt.color];

                  return (
                    <div
                      key={opt.id}
                      className={`p-4 rounded-2xl border-2 flex flex-col justify-between ${
                        gameStatus === 'reveal'
                          ? 'border-white ring-4 ring-green-400 shadow-xl'
                          : 'border-white/20'
                      } ${colorClasses} text-white`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="w-8 h-8 rounded-xl bg-black/30 font-black text-sm flex items-center justify-center">
                          #{idx + 1}
                        </span>
                        <KahootShapeIcon shape={opt.shape} size={22} />
                      </div>
                      <span className="font-extrabold text-base md:text-lg leading-tight">
                        {opt.text}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {currentQuestion.questionType === 'type_answer' && (
            <div className="bg-black/40 border-2 border-white/20 rounded-3xl p-8 backdrop-blur-md text-center max-w-3xl mx-auto w-full">
              {gameStatus === 'question' ? (
                <div className="space-y-3">
                  <Keyboard className="w-12 h-12 text-kahoot-yellow mx-auto animate-pulse" />
                  <h3 className="text-2xl font-black uppercase text-white">
                    Los jugadores están escribiendo su respuesta...
                  </h3>
                  <p className="text-xs text-white/60 font-semibold">
                    Se evaluará coincidencia ortográfica y numérica.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <span className="text-xs uppercase font-bold text-white/60">Respuesta(s) Aceptada(s):</span>
                  <div className="text-3xl md:text-5xl font-black text-kahoot-yellow uppercase tracking-wider">
                    {(currentQuestion.acceptedAnswers || []).join('  /  ')}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* PODIUM FINAL SCREEN */}
      {gameStatus === 'podium' && (
        <div className="flex-1 flex flex-col justify-between items-center text-center py-6">
          <div className="mb-6">
            <h2 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tight">
              ¡Podio de Ganadores!
            </h2>
            <p className="text-white/70 font-semibold mt-1">
              {quiz.title}
            </p>
          </div>

          <div className="w-full max-w-3xl flex items-end justify-center gap-4 md:gap-6 my-auto pt-16">
            {sortedPlayers[1] && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 200, opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.7 }}
                className="flex-1 bg-gradient-to-t from-slate-400 to-slate-200 text-gray-900 rounded-t-3xl p-4 flex flex-col items-center justify-between shadow-2xl relative"
              >
                <div className="absolute -top-14 flex flex-col items-center">
                  <span className="text-4xl">{sortedPlayers[1].avatar}</span>
                  <span className="font-black text-sm text-white mt-1 drop-shadow truncate max-w-[100px]">
                    {sortedPlayers[1].nickname}
                  </span>
                </div>
                <div className="w-10 h-10 rounded-full bg-white/60 flex items-center justify-center font-black text-xl shadow">
                  2
                </div>
                <div className="font-black text-base text-gray-900">
                  {sortedPlayers[1].totalScore.toLocaleString()} pts
                </div>
              </motion.div>
            )}

            {sortedPlayers[0] && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 270, opacity: 1 }}
                transition={{ delay: 0.7, duration: 0.8 }}
                className="flex-1 bg-gradient-to-t from-amber-500 via-amber-300 to-yellow-200 text-gray-900 rounded-t-3xl p-4 flex flex-col items-center justify-between shadow-2xl relative border-t-4 border-yellow-100"
              >
                <div className="absolute -top-16 flex flex-col items-center">
                  <span className="text-5xl">{sortedPlayers[0].avatar}</span>
                  <span className="font-black text-base text-amber-300 mt-1 drop-shadow truncate max-w-[120px]">
                    {sortedPlayers[0].nickname}
                  </span>
                </div>
                <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center font-black text-2xl text-amber-600 shadow-lg">
                  👑 1
                </div>
                <div className="font-black text-xl text-gray-900">
                  {sortedPlayers[0].totalScore.toLocaleString()} pts
                </div>
              </motion.div>
            )}

            {sortedPlayers[2] && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 160, opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.6 }}
                className="flex-1 bg-gradient-to-t from-amber-800 to-amber-600 text-white rounded-t-3xl p-4 flex flex-col items-center justify-between shadow-2xl relative"
              >
                <div className="absolute -top-14 flex flex-col items-center">
                  <span className="text-4xl">{sortedPlayers[2].avatar}</span>
                  <span className="font-black text-sm text-white mt-1 drop-shadow truncate max-w-[100px]">
                    {sortedPlayers[2].nickname}
                  </span>
                </div>
                <div className="w-10 h-10 rounded-full bg-white/40 flex items-center justify-center font-black text-xl shadow">
                  3
                </div>
                <div className="font-black text-base text-white">
                  {sortedPlayers[2].totalScore.toLocaleString()} pts
                </div>
              </motion.div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-4 mt-8 w-full max-w-lg">
            <button
              onClick={onOpenAdmin}
              className="flex-1 py-4 px-6 rounded-2xl bg-kahoot-yellow hover:bg-amber-400 text-black font-black uppercase tracking-wider text-sm shadow-xl active:scale-95 transition flex items-center justify-center gap-2"
            >
              <Shield className="w-5 h-5" />
              <span>Ver Rankings en Panel Admin</span>
            </button>
            <button
              onClick={onExit}
              className="py-4 px-6 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold uppercase tracking-wider text-sm transition flex items-center justify-center gap-2"
            >
              <Home className="w-5 h-5" />
              <span>Salir</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
