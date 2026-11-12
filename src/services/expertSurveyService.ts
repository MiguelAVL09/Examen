import { authService } from './authService';
import { quizService } from './quizService';
import { supabase } from './supabaseClient';
import type { Quiz } from '../types/quiz';

export async function publishExpertSurvey(draft: Quiz) {
  const user = authService.getCurrentUser();
  if (!user?.isActive || (user.role !== 'expert' && user.role !== 'admin')) {
    throw new Error('Solo Cinepolito Experto o Administración puede publicar encuestas.');
  }

  const title = draft.title.trim();
  const description = draft.description.trim();
  const category = draft.category.trim() || 'Encuesta';
  if (!title || !draft.questions.length || draft.questions.length > 30 || description.includes('<!--SETTINGS:')) {
    throw new Error('Revisa el título, la descripción y las preguntas.');
  }
  const questions = draft.questions.map((question, index) => {
    const text = question.questionText.trim();
    const kind = question.questionType;
    const options = question.options.map(option => option.text.trim());
    if (!text || (kind !== 'survey_rating' && kind !== 'type_answer')) throw new Error(`Revisa la pregunta ${index + 1}.`);
    if (kind === 'survey_rating' && (options.length < 2 || options.length > 5 || options.some(option => !option) ||
        new Set(options.map(option => option.toLocaleLowerCase('es-MX'))).size !== options.length)) {
      throw new Error(`La pregunta ${index + 1} debe tener de 2 a 5 opciones distintas.`);
    }
    return { text, kind, options: kind === 'type_answer' ? [] : options, image: question.imageUrl?.trim() || '' };
  });
  const anonymous = draft.isAnonymousSurvey ?? true;
  const maxAttempts = anonymous ? 0 : draft.maxAttemptsPerUser ?? 0;

  if (supabase) {
    const { error } = await supabase.rpc('publish_expert_survey', {
      survey_id: draft.id, survey_title: title, survey_description: description,
      survey_category: category, survey_cover: draft.coverImage?.trim() || '', survey_attempts: maxAttempts,
      survey_anonymous: anonymous, survey_questions: questions,
    });
    if (error) throw new Error(['P0001', '42501'].includes(error.code)
      ? error.message : 'No se pudo publicar la encuesta. Revisa tu conexión e inténtalo de nuevo.');
    return;
  }

  if (quizService.getCachedQuizzes().some(quiz => quiz.id !== draft.id && quiz.title.trim().toLowerCase() === title.toLowerCase())) {
    throw new Error('Ya existe una actividad con ese título. Elige otro.');
  }
  await quizService.saveQuiz({
    ...draft, title, description, category, quizKind: 'survey',
    isAnonymousSurvey: anonymous, isPublished: true, isExamOpen: true,
    shuffleQuestions: false, maxAttemptsPerUser: maxAttempts,
    questions: draft.questions.map((question, index) => ({
      ...question, questionText: questions[index].text, imageUrl: questions[index].image,
      options: question.options.map((option, optionIndex) => ({ ...option, text: questions[index].options[optionIndex], isCorrect: false })),
    })),
  });
}
