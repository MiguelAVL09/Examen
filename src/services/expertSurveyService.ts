import { authService } from './authService';
import { generateUUID, quizService } from './quizService';
import { supabase } from './supabaseClient';
import type { OptionColor, OptionShape } from '../types/quiz';

export interface SurveyDraft {
  id: string;
  title: string;
  description: string;
  anonymous: boolean;
  questions: { text: string; options: string[] }[];
}

const colors: OptionColor[] = ['red', 'blue', 'yellow', 'green', 'blue'];
const shapes: OptionShape[] = ['triangle', 'diamond', 'circle', 'square', 'diamond'];

export async function publishExpertSurvey(draft: SurveyDraft) {
  const user = authService.getCurrentUser();
  if (!user?.isActive || (user.role !== 'expert' && user.role !== 'admin')) {
    throw new Error('Solo Cinepolito Experto o Administración puede publicar encuestas.');
  }
  const title = draft.title.trim();
  const description = draft.description.trim();
  const questions = draft.questions.map(question => ({ text: question.text.trim(), options: question.options.map(option => option.trim()) }));
  if (!title || !questions.length || questions.some(question => !question.text || question.options.some(option => !option))) {
    throw new Error('Completa el título, las preguntas y todas las opciones.');
  }
  if (questions.some(question => new Set(question.options.map(option => option.toLocaleLowerCase('es-MX'))).size !== question.options.length)) {
    throw new Error('Cada pregunta debe tener opciones distintas.');
  }
  if (description.includes('<!--SETTINGS:')) throw new Error('Revisa la descripción de la encuesta.');

  if (supabase) {
    const { error } = await supabase.rpc('publish_expert_survey', {
      survey_id: draft.id, survey_title: title, survey_description: description,
      survey_anonymous: draft.anonymous, survey_questions: questions,
    });
    if (error) throw new Error(['P0001', '42501'].includes(error.code)
      ? error.message : 'No se pudo publicar la encuesta. Revisa tu conexión e inténtalo de nuevo.');
    return;
  }

  if (quizService.getCachedQuizzes().some(quiz => quiz.title.trim().toLowerCase() === title.toLowerCase())) {
    throw new Error('Ya existe una actividad con ese título. Elige otro.');
  }
  await quizService.saveQuiz({
    id: draft.id, title, description, category: 'Encuesta', quizKind: 'survey',
    isAnonymousSurvey: draft.anonymous, isPublished: true, isExamOpen: true,
    shuffleQuestions: false, maxAttemptsPerUser: 0, createdAt: new Date().toISOString(),
    questions: questions.map((question, orderIndex) => ({
      id: generateUUID(), quizId: draft.id, orderIndex, questionText: question.text, questionType: 'survey_rating',
      timeLimit: 20, pointsMultiplier: 1, options: question.options.map((option, index) => ({
        id: generateUUID(), text: option, isCorrect: false, color: colors[index], shape: shapes[index], orderIndex: index,
      })),
    })),
  });
}
