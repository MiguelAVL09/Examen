export type OptionColor = 'red' | 'blue' | 'yellow' | 'green';
export type OptionShape = 'triangle' | 'diamond' | 'circle' | 'square';

export type QuestionType =
  | 'multiple_choice' // 4 opciones clásicas de Kahoot
  | 'true_false'       // Verdadero o Falso (2 opciones)
  | 'puzzle'           // Ordenar elementos en la secuencia correcta
  | 'type_answer';     // Escribir la respuesta exacta o numérica

export interface QuestionOption {
  id: string;
  text: string;
  isCorrect: boolean;
  color: OptionColor;
  shape: OptionShape;
  orderIndex?: number; // Para preguntas tipo Puzzle (orden correcto)
}

export interface Question {
  id: string;
  quizId?: string;
  orderIndex?: number;
  questionText: string;
  imageUrl?: string;
  timeLimit: number; // en segundos (10, 15, 20, 30, 60, etc.)
  pointsMultiplier: number; // 1 = 1000 standard, 2 = 2000 double, 0 = 0 no points
  questionType: QuestionType;
  options: QuestionOption[];
  // Campos específicos según tipo de pregunta
  correctOrder?: string[];      // Para 'puzzle': lista de IDs de opciones en orden correcto (1°, 2°, 3°, 4°)
  acceptedAnswers?: string[];   // Para 'type_answer': lista de respuestas válidas en texto
}

export interface Quiz {
  id: string;
  title: string;
  description: string;
  coverImage?: string;
  category: string;
  timePerQuestion?: number;
  questions: Question[];
  createdAt: string;
  updatedAt?: string;
  isPublished?: boolean;
}

export interface ParticipantAnswer {
  questionId: string;
  questionType: QuestionType;
  selectedOptionId: string | null;
  submittedSequence?: string[]; // Para puzzle
  submittedText?: string;       // Para type_answer
  isCorrect: boolean;
  timeTakenMs: number;
  pointsAwarded: number;
}

export interface Participant {
  id: string;
  quizId: string;
  sessionId?: string;
  nickname: string;
  avatar: string;
  totalScore: number;
  streak: number;
  maxStreak: number;
  correctAnswersCount: number;
  totalQuestionsCount: number;
  accuracyPercentage: number;
  completedAt: string;
  answers?: ParticipantAnswer[];
}

export interface QuizSession {
  id: string;
  quizId: string;
  pin: string;
  status: 'lobby' | 'question' | 'answers_reveal' | 'leaderboard' | 'finished';
  currentQuestionIndex: number;
  questionStartedAt?: string;
  participants: Participant[];
  createdAt: string;
}
