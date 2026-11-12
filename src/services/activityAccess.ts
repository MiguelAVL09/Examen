import type { Quiz } from '../types/quiz';
import { quizService } from './quizService';

export async function getActivityStartError(quiz: Quiz, name: string) {
  if (!name) return 'Escribe tu nombre y apellido para continuar.';
  if (!quiz.questions.length) return 'Esta actividad todavía no tiene preguntas.';
  const access = quizService.isExamAccessible(quiz);
  if (!access.accessible) return access.reason || 'Esta actividad está cerrada.';

  try {
    const attempt = await quizService.checkParticipantCanAttempt(quiz, name);
    if (!attempt.canAttempt) return attempt.reason || 'Alcanzaste el límite de intentos para esta actividad.';
  } catch {
    return 'No se pudo abrir la actividad. Intenta nuevamente.';
  }
}
