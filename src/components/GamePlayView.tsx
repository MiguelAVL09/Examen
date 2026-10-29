import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Quiz, Question, Participant, ParticipantAnswer } from '../types/quiz';
import { KahootTimer } from './KahootTimer';
import { KahootOptionButton } from './KahootOptionButton';
import { soundEffects } from '../utils/soundEffects';
import { quizService } from '../services/quizService';
import { Flame, Trophy, CheckCircle, XCircle, ArrowRight, RotateCcw, Home, Sparkles, Clock, Target } from 'lucide-react';

interface GamePlayViewProps {
  quiz: Quiz;
  nickname: string;
  avatar: string;
  onExit: () => void;
  onPlayAgain: () => void;
}

export const GamePlayView: React.FC<GamePlayViewProps> = ({
  quiz,
  nickname,
  avatar,
  onExit,
  onPlayAgain,
}) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [isQuestionActive, setIsQuestionActive] = useState<boolean>(true);
  const [showFeedback, setShowFeedback] = useState<boolean>(false);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);

  // Stats & Scoring
  const [totalScore, setTotalScore] = useState<number>(0);
  const [streak, setStreak] = useState<number>(0);
  const [maxStreak, setMaxStreak] = useState<number>(0);
  const [correctCount, setCorrectCount] = useState<number>(0);
  const [lastPointsAwarded, setLastPointsAwarded] = useState<number>(0);
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState<boolean>(false);
  const [participantAnswers, setParticipantAnswers] = useState<ParticipantAnswer[]>([]);

  // Time tracking
  const questionStartTimeRef = useRef<number>(Date.now());
  const currentQuestion: Question = quiz.questions[currentQuestionIndex];
  const totalQuestions = quiz.questions.length;

  // Initialize start time on question change
  useEffect(() => {
    questionStartTimeRef.current = Date.now();
    setSelectedOptionId(null);
    setIsQuestionActive(true);
    setShowFeedback(false);
  }, [currentQuestionIndex]);

  // Handle Answer Selection
  const handleSelectOption = useCallback((optionId: string | null) => {
    if (!isQuestionActive) return;

    setIsQuestionActive(false);
    setSelectedOptionId(optionId);

    const timeTakenMs = Math.max(100, Date.now() - questionStartTimeRef.current);
    const totalTimeMs = (currentQuestion.timeLimit || 20) * 1000;

    let isCorrect = false;
    let pointsAwarded = 0;

    if (optionId !== null) {
      const chosen = currentQuestion.options.find(o => o.id === optionId);
      isCorrect = !!chosen?.isCorrect;
    }

    if (isCorrect) {
      // Kahoot score formula:
      // Base: (1 - (timeTaken / totalTime) / 2) * 1000 * multiplier
      const timeFactor = Math.max(0, 1 - (timeTakenMs / totalTimeMs) / 2);
      const basePoints = Math.round(timeFactor * 1000 * (currentQuestion.pointsMultiplier || 1.0));
      
      // Streak bonus: +100 per current streak level (capped at +500)
      const currentStreakBonus = Math.min(streak * 100, 500);
      pointsAwarded = basePoints + currentStreakBonus;

      const newStreak = streak + 1;
      setStreak(newStreak);
      if (newStreak > maxStreak) setMaxStreak(newStreak);
      setCorrectCount(prev => prev + 1);
      setTotalScore(prev => prev + pointsAwarded);
      setLastAnswerCorrect(true);
      setLastPointsAwarded(pointsAwarded);

      // Play sounds
      soundEffects.playCorrect();
      if (newStreak >= 2) {
        setTimeout(() => soundEffects.playStreakBonus(), 300);
      }
    } else {
      setStreak(0);
      setLastAnswerCorrect(false);
      setLastPointsAwarded(0);
      if (optionId !== null) {
        soundEffects.playWrong();
      }
    }

    // Save answer record
    const answerRecord: ParticipantAnswer = {
      questionId: currentQuestion.id,
      selectedOptionId: optionId,
      isCorrect,
      timeTakenMs,
      pointsAwarded,
    };
    setParticipantAnswers(prev => [...prev, answerRecord]);

    // Show feedback popup
    setShowFeedback(true);
  }, [isQuestionActive, currentQuestion, streak, maxStreak]);

  // Time expired handler
  const handleTimeUp = useCallback(() => {
    if (isQuestionActive) {
      handleSelectOption(null);
    }
  }, [isQuestionActive, handleSelectOption]);

  // Keyboard controls (Keys 1, 2, 3, 4)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isQuestionActive || showFeedback) return;
      if (['1', '2', '3', '4'].includes(e.key)) {
        const idx = parseInt(e.key, 10) - 1;
        if (currentQuestion.options[idx]) {
          handleSelectOption(currentQuestion.options[idx].id);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isQuestionActive, showFeedback, currentQuestion, handleSelectOption]);

  // Next question / Game Over
  const handleNextQuestion = () => {
    if (currentQuestionIndex + 1 < totalQuestions) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      // Finalize Game
      finishGame();
    }
  };

  const finishGame = async () => {
    setIsGameOver(true);
    soundEffects.playPodiumFanfare();

    // Trigger confetti explosion
    confetti({
      particleCount: 150,
      spread: 90,
      origin: { y: 0.6 },
      colors: ['#e21b3c', '#1368ce', '#ffa602', '#26890c', '#ffffff'],
    });

    const accuracy = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

    const participantData: Participant = {
      id: 'p-' + Date.now(),
      quizId: quiz.id,
      nickname,
      avatar,
      totalScore,
      streak,
      maxStreak,
      correctAnswersCount: correctCount,
      totalQuestionsCount: totalQuestions,
      accuracyPercentage: accuracy,
      completedAt: new Date().toISOString(),
      answers: participantAnswers,
    };

    // Save participant data to Supabase / LocalStorage
    try {
      await quizService.saveParticipantResult(participantData);
    } catch (err) {
      console.warn('Error saving participant result:', err);
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] flex flex-col justify-between p-4 md:p-8 max-w-6xl mx-auto">
      {/* Top Status Bar: Question Progress, Player Nickname & Score, Streaks */}
      <div className="flex items-center justify-between gap-4 mb-4 bg-kahoot-purple-dark/80 p-4 md:px-6 rounded-2xl border border-white/10 shadow-lg backdrop-blur-md">
        {/* Left: Question Counter & Category */}
        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 bg-white/10 rounded-xl text-xs md:text-sm font-black tracking-wider uppercase">
            Pregunta {currentQuestionIndex + 1} / {totalQuestions}
          </div>
          {currentQuestion.pointsMultiplier > 1 && (
            <span className="hidden sm:inline-flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-black text-xs rounded-full uppercase shadow">
              <Sparkles className="w-3.5 h-3.5" />
              {currentQuestion.pointsMultiplier}x Puntos Dobles
            </span>
          )}
        </div>

        {/* Center: Streak Flame Counter */}
        {streak > 1 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="flex items-center gap-1.5 px-3 py-1 bg-red-600/30 border border-red-500/40 rounded-full text-amber-300 font-black text-xs md:text-sm shadow-md"
          >
            <Flame className="w-5 h-5 text-amber-400 animate-bounce" />
            <span>¡Racha x{streak}!</span>
          </motion.div>
        )}

        {/* Right: Player Profile & Total Score */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-black/30 px-3 py-1.5 rounded-xl border border-white/10">
            <span className="text-xl">{avatar}</span>
            <span className="font-extrabold text-sm md:text-base text-white max-w-[120px] truncate">
              {nickname}
            </span>
          </div>
          <div className="bg-kahoot-yellow px-4 py-1.5 rounded-xl shadow-md text-black font-black text-sm md:text-lg">
            {totalScore.toLocaleString()} <span className="text-xs uppercase">pts</span>
          </div>
        </div>
      </div>

      {/* Main Game Card */}
      {!isGameOver ? (
        <div className="flex-1 flex flex-col justify-between">
          {/* Question Text Box with Timer and Optional Image */}
          <motion.div
            key={currentQuestion.id}
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative bg-white text-gray-900 rounded-3xl p-6 md:p-8 shadow-2xl mb-6 border-4 border-white/20 text-center flex flex-col items-center justify-center min-h-[160px] md:min-h-[220px]"
          >
            {/* Circular Timer absolute on left / top */}
            <div className="mb-4">
              <KahootTimer
                initialSeconds={currentQuestion.timeLimit || 20}
                onTimeUp={handleTimeUp}
                isPaused={!isQuestionActive}
              />
            </div>

            {/* Question Text */}
            <h2 className="text-xl md:text-3xl lg:text-4xl font-black tracking-tight text-gray-900 max-w-4xl leading-tight">
              {currentQuestion.questionText}
            </h2>

            {/* Question Image (if present) */}
            {currentQuestion.imageUrl && (
              <div className="mt-4 max-h-48 md:max-h-60 rounded-2xl overflow-hidden shadow-md border-2 border-gray-100">
                <img
                  src={currentQuestion.imageUrl}
                  alt="Pregunta"
                  className="w-full h-full object-cover max-w-md mx-auto"
                  loading="lazy"
                />
              </div>
            )}
          </motion.div>

          {/* Options Grid (4 for multiple choice, 2 for true/false) */}
          <div
            className={`grid gap-4 md:gap-5 ${
              currentQuestion.questionType === 'true_false'
                ? 'grid-cols-1 md:grid-cols-2'
                : 'grid-cols-1 md:grid-cols-2'
            }`}
          >
            {currentQuestion.options.map((opt, idx) => (
              <KahootOptionButton
                key={opt.id}
                option={opt}
                index={idx}
                isSelected={selectedOptionId === opt.id}
                isDisabled={!isQuestionActive}
                revealResult={showFeedback}
                onSelect={handleSelectOption}
              />
            ))}
          </div>

          {/* Instant Feedback Overlay Modal */}
          <AnimatePresence>
            {showFeedback && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
              >
                <div
                  className={`w-full max-w-md rounded-3xl p-8 text-center text-white shadow-2xl border-4 ${
                    lastAnswerCorrect
                      ? 'bg-gradient-to-b from-green-600 to-green-800 border-green-400'
                      : 'bg-gradient-to-b from-red-600 to-red-800 border-red-400'
                  }`}
                >
                  <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-white/20 flex items-center justify-center shadow-inner">
                    {lastAnswerCorrect ? (
                      <CheckCircle className="w-12 h-12 text-white stroke-[2.5]" />
                    ) : (
                      <XCircle className="w-12 h-12 text-white stroke-[2.5]" />
                    )}
                  </div>

                  <h3 className="text-3xl font-black uppercase tracking-tight mb-2">
                    {lastAnswerCorrect
                      ? '¡Correcto!'
                      : selectedOptionId === null
                      ? '¡Se acabó el tiempo!'
                      : '¡Incorrecto!'}
                  </h3>

                  {lastAnswerCorrect ? (
                    <div className="space-y-2 mb-6">
                      <div className="text-4xl font-black text-amber-300">
                        +{lastPointsAwarded.toLocaleString()}{' '}
                        <span className="text-lg text-white">pts</span>
                      </div>
                      {streak > 1 && (
                        <p className="text-sm font-bold text-emerald-200">
                          🔥 ¡Racha de {streak} respuestas seguidas! (+
                          {Math.min(streak * 100, 500)} bono de racha)
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="mb-6">
                      <p className="text-white/80 font-bold mb-2">
                        {streak > 0 ? 'Se rompió tu racha.' : '¡No te desanimes! Aún puedes remontar.'}
                      </p>
                      <div className="bg-black/30 p-3 rounded-xl border border-white/20 text-xs font-semibold">
                        Respuesta correcta:{' '}
                        <span className="text-amber-300 font-black">
                          {currentQuestion.options.find(o => o.isCorrect)?.text}
                        </span>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleNextQuestion}
                    className="w-full py-4 rounded-2xl bg-white text-gray-900 font-black text-lg uppercase tracking-wider shadow-xl hover:bg-gray-100 active:scale-95 transition flex items-center justify-center gap-2"
                  >
                    <span>
                      {currentQuestionIndex + 1 < totalQuestions ? 'Siguiente Pregunta' : 'Ver Resultados'}
                    </span>
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : (
        /* Game Over Final Celebration Screen */
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex-1 flex flex-col items-center justify-center text-center my-auto py-6"
        >
          <div className="bg-kahoot-purple-dark/90 border-2 border-white/20 rounded-3xl p-8 md:p-12 max-w-2xl w-full shadow-2xl backdrop-blur-md">
            {/* Trophy Icon */}
            <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-tr from-amber-400 to-yellow-300 rounded-3xl shadow-xl flex items-center justify-center transform -rotate-6">
              <Trophy className="w-14 h-14 text-kahoot-purple-dark" />
            </div>

            <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight uppercase mb-2">
              ¡Cuestionario Completado!
            </h2>
            <p className="text-white/80 font-semibold mb-8">
              Excelente esfuerzo, <span className="text-kahoot-yellow font-extrabold">{nickname}</span>
            </p>

            {/* Score Showcase */}
            <div className="bg-black/40 rounded-2xl p-6 mb-8 border border-white/10">
              <span className="text-xs uppercase font-black tracking-widest text-white/60">
                Puntaje Total Obtenido
              </span>
              <div className="text-5xl md:text-6xl font-black text-kahoot-yellow my-1">
                {totalScore.toLocaleString()}
              </div>
              <span className="text-sm font-bold text-white/80">puntos Kahoot</span>
            </div>

            {/* Performance Stats Grid */}
            <div className="grid grid-cols-3 gap-3 md:gap-4 mb-8">
              <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                <Target className="w-6 h-6 text-green-400 mx-auto mb-1" />
                <div className="text-xl md:text-2xl font-black text-white">
                  {correctCount}/{totalQuestions}
                </div>
                <div className="text-[11px] font-bold text-white/60 uppercase">Aciertos</div>
              </div>

              <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                <Clock className="w-6 h-6 text-blue-400 mx-auto mb-1" />
                <div className="text-xl md:text-2xl font-black text-white">
                  {totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0}%
                </div>
                <div className="text-[11px] font-bold text-white/60 uppercase">Precisión</div>
              </div>

              <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                <Flame className="w-6 h-6 text-amber-400 mx-auto mb-1" />
                <div className="text-xl md:text-2xl font-black text-white">
                  x{maxStreak}
                </div>
                <div className="text-[11px] font-bold text-white/60 uppercase">Mejor Racha</div>
              </div>
            </div>

            <div className="bg-kahoot-purple-light/20 p-4 rounded-xl border border-kahoot-purple-light/40 mb-8 text-xs text-white/80 text-left flex items-start gap-2.5">
              <Sparkles className="w-5 h-5 text-kahoot-yellow flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-white block font-black">Tu puntaje ha sido registrado exitosamente.</strong>
                Por configuración del cuestionario, la tabla de ranking general es administrada exclusivamente por los organizadores y admins.
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={onPlayAgain}
                className="flex-1 py-4 px-6 rounded-2xl bg-kahoot-yellow hover:bg-amber-400 text-black font-black uppercase tracking-wider text-sm shadow-xl active:scale-95 transition flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-5 h-5" />
                <span>Jugar de Nuevo</span>
              </button>

              <button
                onClick={onExit}
                className="flex-1 py-4 px-6 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-black uppercase tracking-wider text-sm border border-white/20 active:scale-95 transition flex items-center justify-center gap-2"
              >
                <Home className="w-5 h-5" />
                <span>Menú Principal</span>
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};
