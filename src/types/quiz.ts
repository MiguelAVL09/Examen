export type OptionColor = 'red' | 'blue' | 'yellow' | 'green';
export type OptionShape = 'triangle' | 'diamond' | 'circle' | 'square';
export type QuestionType = 'multiple_choice' | 'true_false';

export interface QuestionOption {
  id: string;
  text: string;
  isCorrect: boolean;
  color: OptionColor;
  shape: OptionShape;
}

export interface Question {
  id: string;
  quizId?: string;
  questionText: string;
  imageUrl?: string;
  timeLimit: number; // in seconds (e.g. 10, 20, 30, 60)
  pointsMultiplier: number; // 1 = 1000 standard, 2 = 2000 double, 0 = 0 no points
  questionType: QuestionType;
  options: QuestionOption[];
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
  selectedOptionId: string | null;
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
