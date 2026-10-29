import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import type { Quiz, Question, Participant, ParticipantAnswer, QuestionOption } from '../types/quiz';
import { KahootTimer } from './KahootTimer';
import { KahootOptionButton } from './KahootOptionButton';
import { KahootShapeIcon } from './KahootShapes';
import { soundEffects } from '../utils/soundEffects';
import { quizService, generateUUID } from '../services/quizService';
import {
  Flame,
  Trophy,
  CheckCircle,
  XCircle,
  ArrowRight,
  RotateCcw,
  Home,
  Sparkles,
  Clock,
  Target,
  Send,
  Shuffle
} from 'lucide-react';

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

  // State for multiple_choice & true_false
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);

  // State for puzzle (ordering)
  const [shuffledPuzzlePool, setShuffledPuzzlePool] = useState<QuestionOption[]>([]);
  const [userPuzzleSequence, setUserPuzzleSequence] = useState<QuestionOption[]>([]);

  // State for type_answer
  const [typedAnswer, setTypedAnswer] = useState<string>('');

  // Time tracking
  const questionStartTimeRef = useRef<number>(Date.now());
  const currentQuestion: Question = quiz.questions[currentQuestionIndex];
  const totalQuestions = quiz.questions.length;

  // Initialize or reset question states
  useEffect(() => {
    questionStartTimeRef.current = Date.now();
    setSelectedOptionId(null);
    setTypedAnswer('');
    setIsQuestionActive(true);
    setShowFeedback(false);

    // If question is a puzzle, shuffle the options so player can order them
    if (currentQuestion.questionType === 'puzzle' && currentQuestion.options.length > 0) {
      const copy = [...currentQuestion.options];
      // Shuffle array
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      setShuffledPuzzlePool(copy);
      setUserPuzzleSequence([]);
    }
  }, [currentQuestionIndex]);

  // Master answer evaluation logic
  const evaluateAnswer = useCallback((
    isCorrect: boolean,
    details: {
      optionId?: string | null;
      puzzleSequence?: string[];
      typedText?: string;
    }
  ) => {
    if (!isQuestionActive) return;

    setIsQuestionActive(false);

    const timeTakenMs = Math.max(100, Date.now() - questionStartTimeRef.current);
    const totalTimeMs = (currentQuestion.timeLimit || 20) * 1000;
    let pointsAwarded = 0;

    if (isCorrect) {
      // Kahoot score formula based on speed
      const timeFactor = Math.max(0, 1 - (timeTakenMs / totalTimeMs) / 2);
      const basePoints = Math.round(timeFactor * 1000 * (currentQuestion.pointsMultiplier || 1.0));
      const currentStreakBonus = Math.min(streak * 100, 500);
      pointsAwarded = basePoints + currentStreakBonus;

      const newStreak = streak + 1;
      setStreak(newStreak);
      if (newStreak > maxStreak) setMaxStreak(newStreak);
      setCorrectCount(prev => prev + 1);
      setTotalScore(prev => prev + pointsAwarded);
      setLastAnswerCorrect(true);
      setLastPointsAwarded(pointsAwarded);

      soundEffects.playCorrect();
      if (newStreak >= 2) {
        setTimeout(() => soundEffects.playStreakBonus(), 300);
      }
    } else {
      setStreak(0);
      setLastAnswerCorrect(false);
      setLastPointsAwarded(0);
      soundEffects.playWrong();
    }

    const answerRecord: ParticipantAnswer = {
      questionId: currentQuestion.id,
      questionType: currentQuestion.questionType,
      selectedOptionId: details.optionId || null,
      submittedSequence: details.puzzleSequence,
      submittedText: details.typedText,
      isCorrect,
      timeTakenMs,
      pointsAwarded,
    };
    setParticipantAnswers(prev => [...prev, answerRecord]);
    setShowFeedback(true);
  }, [isQuestionActive, currentQuestion, streak, maxStreak]);

  // Handler for Multiple Choice & True/False
  const handleSelectOption = useCallback((optionId: string | null) => {
    if (!isQuestionActive) return;
    setSelectedOptionId(optionId);

    let isCorrect = false;
    if (optionId !== null) {
      const chosen = currentQuestion.options.find(o => o.id === optionId);
      isCorrect = !!chosen?.isCorrect;
    }
    evaluateAnswer(isCorrect, { optionId });
  }, [isQuestionActive, currentQuestion, evaluateAnswer]);

  // Handler for Puzzle Submit
  const handlePuzzleSubmit = () => {
    if (!isQuestionActive) return;
    if (userPuzzleSequence.length !== currentQuestion.options.length) return;

    // Check if the user sequence IDs match the correct order
    const userIds = userPuzzleSequence.map(item => item.id);
    const targetOrder = currentQuestion.correctOrder || currentQuestion.options.map(o => o.id);
    const isCorrect = userIds.every((id, idx) => id === targetOrder[idx]);

    evaluateAnswer(isCorrect, { puzzleSequence: userIds });
  };

  // Handler for Puzzle Tile Click (Add to sequence)
  const handleAddPuzzleTile = (option: QuestionOption) => {
    if (!isQuestionActive) return;
    setUserPuzzleSequence(prev => [...prev, option]);
    setShuffledPuzzlePool(prev => prev.filter(o => o.id !== option.id));
    soundEffects.playTick(1.2);
  };

  // Handler for Puzzle Tile Remove from sequence
  const handleRemovePuzzleTile = (option: QuestionOption) => {
    if (!isQuestionActive) return;
    setUserPuzzleSequence(prev => prev.filter(o => o.id !== option.id));
    setShuffledPuzzlePool(prev => [...prev, option]);
    soundEffects.playTick(0.9);
  };

  // Handler for Type Answer Submit
  const handleTypeAnswerSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isQuestionActive || !typedAnswer.trim()) return;

    const normalize = (str: string) =>
      str
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();

    const normalizedUser = normalize(typedAnswer);
    const accepted = (currentQuestion.acceptedAnswers || []).map(normalize);

    const isCorrect = accepted.some(ans => ans === normalizedUser || normalizedUser.includes(ans));
    evaluateAnswer(isCorrect, { typedText: typedAnswer.trim() });
  };

  // Time Up handler
  const handleTimeUp = useCallback(() => {
    if (isQuestionActive) {
      evaluateAnswer(false, { optionId: null });
    }
  }, [isQuestionActive, evaluateAnswer]);

  // Keyboard shortcut for Multiple Choice & True/False
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isQuestionActive || showFeedback) return;
      if (['multiple_choice', 'true_false'].includes(currentQuestion.questionType)) {
        if (['1', '2', '3', '4'].includes(e.key)) {
          const idx = parseInt(e.key, 10) - 1;
          if (currentQuestion.options[idx]) {
            handleSelectOption(currentQuestion.options[idx].id);
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isQuestionActive, showFeedback, currentQuestion, handleSelectOption]);

  const handleNextQuestion = () => {
    if (currentQuestionIndex + 1 < totalQuestions) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      finishGame();
    }
  };

  const finishGame = async () => {
    setIsGameOver(true);
    soundEffects.playPodiumFanfare();

    confetti({
      particleCount: 150,
      spread: 90,
      origin: { y: 0.6 },
      colors: ['#e21b3c', '#1368ce', '#ffa602', '#26890c', '#ffffff'],
    });

    const accuracy = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

    const participantData: Participant = {
      id: generateUUID(),
      quizId: generateUUID(quiz.id),
      nickname: nickname && nickname.trim() ? nickname.trim() : 'Participante',
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

    try {
      await quizService.saveParticipantResult(participantData);
    } catch (err) {
      console.warn('Error saving participant result:', err);
    }
  };

  return (
    <div className="min-h-[calc(100vh-70px)] flex flex-col justify-between p-2 sm:p-4 md:p-8 max-w-5xl mx-auto w-full">
      {/* Top Status Bar */}
      <div className="flex items-center justify-between gap-2 sm:gap-4 mb-3 sm:mb-4 bg-kahoot-purple-dark/80 p-2.5 sm:p-4 md:px-6 rounded-xl sm:rounded-2xl border border-white/10 shadow-lg backdrop-blur-md">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="px-2.5 sm:px-3.5 py-1 bg-white/10 rounded-lg sm:rounded-xl text-[11px] sm:text-xs md:text-sm font-black tracking-wider uppercase">
            Pregunta {currentQuestionIndex + 1} / {totalQuestions}
          </div>
          {currentQuestion.pointsMultiplier > 1 && (
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-black text-[11px] sm:text-xs rounded-full uppercase shadow">
              <Sparkles className="w-3.5 h-3.5" />
              {currentQuestion.pointsMultiplier}x Puntos
            </span>
          )}
          <span className="hidden md:inline-flex items-center px-3 py-1 bg-white/5 border border-white/10 text-white/80 rounded-full text-xs font-bold uppercase">
            {currentQuestion.questionType === 'puzzle' && '🧩 Puzzle (Ordenar)'}
            {currentQuestion.questionType === 'type_answer' && '⌨️ Escribir Respuesta'}
            {currentQuestion.questionType === 'true_false' && '⚖️ Verdadero / Falso'}
            {currentQuestion.questionType === 'multiple_choice' && '🔘 Opción Múltiple'}
          </span>
        </div>

        {streak > 1 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="flex items-center gap-1 px-2 sm:px-3 py-0.5 sm:py-1 bg-red-600/30 border border-red-500/40 rounded-full text-amber-300 font-black text-[11px] sm:text-xs md:text-sm shadow-md"
          >
            <Flame className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 animate-bounce" />
            <span>x{streak}</span>
          </motion.div>
        )}

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 sm:gap-2 bg-black/30 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl border border-white/10">
            <span className="text-lg sm:text-xl">{avatar}</span>
            <span className="font-extrabold text-xs sm:text-sm md:text-base text-white max-w-[80px] sm:max-w-[120px] truncate">
              {nickname}
            </span>
          </div>
          <div className="bg-kahoot-yellow px-2.5 sm:px-4 py-1 sm:py-1.5 rounded-lg sm:rounded-xl shadow-md text-black font-black text-xs sm:text-sm md:text-lg">
            {totalScore.toLocaleString()} <span className="text-[10px] sm:text-xs uppercase">pts</span>
          </div>
        </div>
      </div>

      {!isGameOver ? (
        <motion.div
          animate={!lastAnswerCorrect && showFeedback ? { x: [-10, 10, -7, 7, -3, 3, 0] } : {}}
          transition={{ duration: 0.35 }}
          className="flex-1 flex flex-col justify-between"
        >
          {/* Question Text Box with Timer and Optional Image */}
          <motion.div
            key={currentQuestion.id}
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative bg-white text-gray-900 rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 shadow-2xl mb-3 sm:mb-5 border-2 sm:border-4 border-white/20 text-center flex flex-col items-center justify-center min-h-[140px] sm:min-h-[180px] overflow-hidden"
          >
            {/* Top Linear Tension Bar */}
            <div className="absolute top-0 left-0 right-0 h-2 bg-gray-100 overflow-hidden">
              <motion.div
                initial={{ width: '100%' }}
                animate={{ width: isQuestionActive ? '0%' : '100%' }}
                transition={{ duration: currentQuestion.timeLimit || 20, ease: 'linear' }}
                className="h-full bg-gradient-to-r from-emerald-500 via-yellow-400 to-red-500"
              />
            </div>
            <div className="mb-2 sm:mb-3">
              <KahootTimer
                initialSeconds={currentQuestion.timeLimit || 20}
                onTimeUp={handleTimeUp}
                isPaused={!isQuestionActive}
                size={76}
              />
            </div>

            <h2 className="text-base sm:text-xl md:text-2xl lg:text-3xl font-black tracking-tight text-gray-900 max-w-4xl leading-snug px-1">
              {currentQuestion.questionText}
            </h2>

            {/* Question Image (Kahoot Style Card) */}
            {currentQuestion.imageUrl && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-3 max-h-36 sm:max-h-52 md:max-h-60 rounded-xl sm:rounded-2xl overflow-hidden shadow-lg border-2 sm:border-4 border-white/80 bg-black/5 group cursor-pointer"
              >
                <img
                  src={currentQuestion.imageUrl}
                  alt="Pregunta"
                  className="w-full h-full object-contain max-w-md mx-auto group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
              </motion.div>
            )}
          </motion.div>

          {/* DYNAMIC ANSWER INTERACTION PER QUESTION TYPE */}

          {/* 1. Multiple Choice (4 Buttons) */}
          {currentQuestion.questionType === 'multiple_choice' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-4 md:gap-5 pb-2">
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
          )}

          {/* 2. True / False (2 Giant Buttons) */}
          {currentQuestion.questionType === 'true_false' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-4 pb-2">
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
          )}

          {/* 3. Puzzle / Ordering Sequence */}
          {currentQuestion.questionType === 'puzzle' && (
            <div className="space-y-6">
              {/* Target Sequence Slots (1st, 2nd, 3rd, 4th) */}
              <div className="bg-black/40 border-2 border-white/20 rounded-3xl p-5 md:p-6 backdrop-blur-md">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs uppercase font-black text-amber-300 tracking-wider flex items-center gap-1.5">
                    <Shuffle className="w-4 h-4" />
                    <span>Tu Secuencia (Haz clic en los elementos para colocarlos en orden):</span>
                  </span>
                  {userPuzzleSequence.length > 0 && isQuestionActive && (
                    <button
                      onClick={() => {
                        setShuffledPuzzlePool([...shuffledPuzzlePool, ...userPuzzleSequence]);
                        setUserPuzzleSequence([]);
                      }}
                      className="text-xs text-white/60 hover:text-white flex items-center gap-1 font-bold"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reiniciar</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 min-h-[90px]">
                  {currentQuestion.options.map((_, slotIdx) => {
                    const item = userPuzzleSequence[slotIdx];
                    return (
                      <div
                        key={slotIdx}
                        className={`rounded-2xl border-2 p-3 flex flex-col justify-between transition-all ${
                          item
                            ? 'bg-kahoot-purple-light/40 border-white shadow-lg'
                            : 'border-dashed border-white/20 bg-black/20 text-white/40 items-center justify-center'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full mb-1">
                          <span className="text-xs font-black text-kahoot-yellow">
                            #{slotIdx + 1}
                          </span>
                          {item && isQuestionActive && (
                            <button
                              onClick={() => handleRemovePuzzleTile(item)}
                              className="text-xs text-red-300 hover:text-white font-bold"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                        {item ? (
                          <div className="flex items-center gap-2">
                            <KahootShapeIcon shape={item.shape} size={20} />
                            <span className="font-extrabold text-sm text-white line-clamp-2">
                              {item.text}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs font-bold uppercase tracking-wider">
                            Vacío
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Pool of Available Shuffled Tiles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {shuffledPuzzlePool.map(opt => {
                  const colorClasses = {
                    red: 'kahoot-btn-red text-white',
                    blue: 'kahoot-btn-blue text-white',
                    yellow: 'kahoot-btn-yellow text-white',
                    green: 'kahoot-btn-green text-white',
                  }[opt.color];

                  return (
                    <button
                      key={opt.id}
                      onClick={() => handleAddPuzzleTile(opt)}
                      disabled={!isQuestionActive}
                      className={`p-4 rounded-2xl flex items-center gap-3 font-extrabold text-base md:text-lg transition-transform active:scale-95 shadow-lg border-2 border-white/20 text-left ${colorClasses}`}
                    >
                      <KahootShapeIcon shape={opt.shape} size={24} />
                      <span className="flex-1">{opt.text}</span>
                      <span className="text-xs bg-black/20 px-2.5 py-1 rounded-lg uppercase font-black">
                        + Colocar
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Submit Sequence Button */}
              {userPuzzleSequence.length === currentQuestion.options.length && isQuestionActive && (
                <motion.button
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  onClick={handlePuzzleSubmit}
                  className="w-full py-4 rounded-2xl bg-kahoot-yellow hover:bg-amber-400 text-black font-black uppercase text-lg tracking-wider shadow-2xl active:scale-95 transition flex items-center justify-center gap-2"
                >
                  <Send className="w-5 h-5" />
                  <span>¡Enviar Secuencia!</span>
                </motion.button>
              )}
            </div>
          )}

          {/* 4. Type Answer Open Text Input */}
          {currentQuestion.questionType === 'type_answer' && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-2xl mx-auto w-full space-y-4"
            >
              <form onSubmit={handleTypeAnswerSubmit} className="space-y-4">
                <input
                  type="text"
                  autoFocus
                  disabled={!isQuestionActive}
                  placeholder="Escribe tu respuesta aquí..."
                  value={typedAnswer}
                  onChange={e => setTypedAnswer(e.target.value)}
                  className="w-full text-center text-2xl md:text-3xl font-black py-5 px-6 rounded-3xl bg-white text-gray-900 shadow-2xl border-4 border-white/30 focus:border-kahoot-yellow focus:outline-none transition uppercase placeholder-gray-400 disabled:opacity-60"
                />

                <button
                  type="submit"
                  disabled={!isQuestionActive || !typedAnswer.trim()}
                  className="w-full py-4 rounded-2xl bg-kahoot-yellow hover:bg-amber-400 disabled:opacity-40 text-black font-black uppercase text-lg tracking-wider shadow-2xl active:scale-95 transition flex items-center justify-center gap-2"
                >
                  <Send className="w-5 h-5" />
                  <span>Enviar Respuesta</span>
                </button>
              </form>
            </motion.div>
          )}

          {/* Instant Feedback Overlay Modal */}
          <AnimatePresence>
            {showFeedback && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto"
              >
                <div
                  className={`w-full max-w-md rounded-2xl sm:rounded-3xl p-5 sm:p-8 text-center text-white shadow-2xl border-2 sm:border-4 my-auto ${
                    lastAnswerCorrect
                      ? 'bg-gradient-to-b from-green-600 to-green-800 border-green-400'
                      : 'bg-gradient-to-b from-red-600 to-red-800 border-red-400'
                  }`}
                >
                  <div className="w-14 h-14 sm:w-20 sm:h-20 mx-auto mb-3 sm:mb-4 rounded-full bg-white/20 flex items-center justify-center shadow-inner">
                    {lastAnswerCorrect ? (
                      <CheckCircle className="w-9 h-9 sm:w-12 sm:h-12 text-white stroke-[2.5]" />
                    ) : (
                      <XCircle className="w-9 h-9 sm:w-12 sm:h-12 text-white stroke-[2.5]" />
                    )}
                  </div>

                  <h3 className="text-2xl sm:text-3xl font-black uppercase tracking-tight mb-1 sm:mb-2">
                    {lastAnswerCorrect ? '¡Correcto!' : '¡Incorrecto!'}
                  </h3>

                  {lastAnswerCorrect ? (
                    <div className="space-y-1 sm:space-y-2 mb-4 sm:mb-6">
                      <div className="text-3xl sm:text-4xl font-black text-amber-300">
                        +{lastPointsAwarded.toLocaleString()}{' '}
                        <span className="text-base sm:text-lg text-white">pts</span>
                      </div>
                      {streak > 1 && (
                        <p className="text-xs sm:text-sm font-bold text-emerald-200">
                          🔥 ¡Racha de {streak} respuestas seguidas!
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="mb-4 sm:mb-6 space-y-1.5 sm:space-y-2">
                      <p className="text-white/80 text-xs sm:text-sm font-bold">
                        {streak > 0 ? 'Se rompió tu racha.' : '¡Ánimo! Sigue intentándolo.'}
                      </p>

                      {/* Display correct solution per type */}
                      {currentQuestion.questionType === 'type_answer' && (
                        <div className="bg-black/30 p-2.5 sm:p-3 rounded-xl border border-white/20 text-xs font-semibold">
                          Respuesta esperada:{' '}
                          <span className="text-amber-300 font-black">
                            {(currentQuestion.acceptedAnswers || []).join(' o ')}
                          </span>
                        </div>
                      )}

                      {currentQuestion.questionType === 'puzzle' && (
                        <div className="bg-black/30 p-2.5 sm:p-3 rounded-xl border border-white/20 text-xs font-semibold text-left">
                          <strong className="block text-amber-300 font-bold mb-1">Orden Correcto:</strong>
                          <ol className="list-decimal list-inside space-y-0.5">
                            {currentQuestion.options.map(o => (
                              <li key={o.id} className="truncate">{o.text}</li>
                            ))}
                          </ol>
                        </div>
                      )}

                      {['multiple_choice', 'true_false'].includes(currentQuestion.questionType) && (
                        <div className="bg-black/30 p-2.5 sm:p-3 rounded-xl border border-white/20 text-xs font-semibold">
                          Respuesta correcta:{' '}
                          <span className="text-amber-300 font-black">
                            {currentQuestion.options.find(o => o.isCorrect)?.text}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    onClick={handleNextQuestion}
                    className="w-full py-3.5 sm:py-4 rounded-xl sm:rounded-2xl bg-white text-gray-900 font-black text-base sm:text-lg uppercase tracking-wider shadow-xl hover:bg-gray-100 active:scale-95 transition flex items-center justify-center gap-2 min-h-[48px]"
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
        </motion.div>
      ) : (
        /* Game Over Screen */
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex-1 flex flex-col items-center justify-center text-center my-auto py-3 sm:py-6 w-full"
        >
          <div className="bg-kahoot-purple-dark/90 border border-white/20 rounded-2xl sm:rounded-3xl p-5 sm:p-8 md:p-12 max-w-xl w-full shadow-2xl backdrop-blur-md">
            <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 mx-auto mb-3 sm:mb-6 bg-gradient-to-tr from-amber-400 to-yellow-300 rounded-2xl sm:rounded-3xl shadow-xl flex items-center justify-center transform -rotate-6">
              <Trophy className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 text-kahoot-purple-dark" />
            </div>

            <h2 className="text-2xl sm:text-3xl md:text-5xl font-black text-white tracking-tight uppercase mb-1 sm:mb-2">
              ¡Cuestionario Completado!
            </h2>
            <p className="text-white/80 font-semibold mb-4 sm:mb-8 text-xs sm:text-base">
              Gran trabajo, <span className="text-kahoot-yellow font-extrabold">{nickname}</span>
            </p>

            <div className="bg-black/40 rounded-xl sm:rounded-2xl p-3.5 sm:p-6 mb-4 sm:mb-8 border border-white/10">
              <span className="text-[10px] sm:text-xs uppercase font-black tracking-widest text-white/60">
                Puntaje Total Obtenido
              </span>
              <div className="text-4xl sm:text-5xl md:text-6xl font-black text-kahoot-yellow my-0.5 sm:my-1">
                {totalScore.toLocaleString()}
              </div>
              <span className="text-xs sm:text-sm font-bold text-white/80">puntos Kahoot</span>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-8">
              <div className="bg-white/5 p-2.5 sm:p-4 rounded-xl border border-white/10">
                <Target className="w-5 h-5 sm:w-6 sm:h-6 text-green-400 mx-auto mb-1" />
                <div className="text-base sm:text-xl md:text-2xl font-black text-white">
                  {correctCount}/{totalQuestions}
                </div>
                <div className="text-[10px] sm:text-[11px] font-bold text-white/60 uppercase">Aciertos</div>
              </div>

              <div className="bg-white/5 p-2.5 sm:p-4 rounded-xl border border-white/10">
                <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400 mx-auto mb-1" />
                <div className="text-base sm:text-xl md:text-2xl font-black text-white">
                  {totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0}%
                </div>
                <div className="text-[10px] sm:text-[11px] font-bold text-white/60 uppercase">Precisión</div>
              </div>

              <div className="bg-white/5 p-2.5 sm:p-4 rounded-xl border border-white/10">
                <Flame className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400 mx-auto mb-1" />
                <div className="text-base sm:text-xl md:text-2xl font-black text-white">
                  x{maxStreak}
                </div>
                <div className="text-[10px] sm:text-[11px] font-bold text-white/60 uppercase">Mejor Racha</div>
              </div>
            </div>

            <div className="bg-kahoot-purple-light/20 p-3 sm:p-4 rounded-xl border border-kahoot-purple-light/40 mb-5 sm:mb-6 text-xs text-white/80 text-left flex items-start gap-2 sm:gap-2.5">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-kahoot-yellow flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-white block font-black">Resultados guardados correctamente.</strong>
                Los rankings y posiciones generales quedan reservados para el panel de administradores.
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-4 justify-center">
              <button
                onClick={onPlayAgain}
                className="w-full sm:flex-1 py-3.5 sm:py-4 px-6 rounded-xl sm:rounded-2xl bg-kahoot-yellow hover:bg-amber-400 text-black font-black uppercase tracking-wider text-xs sm:text-sm shadow-xl active:scale-95 transition flex items-center justify-center gap-2 min-h-[48px]"
              >
                <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>Jugar de Nuevo</span>
              </button>

              <button
                onClick={onExit}
                className="w-full sm:flex-1 py-3.5 sm:py-4 px-6 rounded-xl sm:rounded-2xl bg-white/10 hover:bg-white/20 text-white font-black uppercase tracking-wider text-xs sm:text-sm border border-white/20 active:scale-95 transition flex items-center justify-center gap-2 min-h-[48px]"
              >
                <Home className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>Menú Principal</span>
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};
