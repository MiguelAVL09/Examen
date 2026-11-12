import type { Quiz } from '../types/quiz';

export function isSurveyQuiz(quiz: Quiz) {
  return quiz.quizKind === 'survey' || quiz.isAnonymousSurvey === true ||
    (!quiz.quizKind && (quiz.questions.some(question => question.questionType === 'survey_rating') ||
      /\bencuestas?\b/i.test(quiz.title) || /\bencuestas?\b/i.test(quiz.category || '')));
}

export function canPracticeQuiz(quiz: Quiz) {
  return !isSurveyQuiz(quiz) && !quiz.questions.some(question => question.questionType === 'survey_rating');
}
