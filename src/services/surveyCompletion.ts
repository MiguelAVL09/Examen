import { supabase } from './supabaseClient';

export const surveyCompletionKey = 'cinepolis-expertos.survey-completions.v1';

export function readSurveyCompletions(): Record<string, string[]> {
  const raw = localStorage.getItem(surveyCompletionKey);
  const data = raw ? JSON.parse(raw) : {};
  if (!data || typeof data !== 'object' || Array.isArray(data) ||
      Object.values(data).some(ids => !Array.isArray(ids) || ids.some(id => typeof id !== 'string'))) {
    throw new Error('No se pudo leer el avance de las encuestas.');
  }
  return data;
}

export async function loadSurveyCompletions(): Promise<Record<string, string[]>> {
  if (!supabase) return readSurveyCompletions();
  const completions: Record<string, string[]> = {};
  const pageSize = 500;
  for (let start = 0; ; start += pageSize) {
    const { data, error } = await supabase.from('employee_survey_completions').select('quiz_id, account_id')
      .order('quiz_id').order('account_id').range(start, start + pageSize - 1);
    if (error) throw error;
    for (const { quiz_id, account_id } of data) (completions[quiz_id] ??= []).push(account_id);
    if (data.length < pageSize) return completions;
  }
}

export async function saveCloudCompletions(rows: { quiz_id: string; account_id: string }[]) {
  if (!supabase || !rows.length) return;
  const { error } = await supabase.from('employee_survey_completions').upsert(rows, { onConflict: 'quiz_id,account_id', ignoreDuplicates: true });
  if (error) throw error;
}

export async function recordSurveyCompletion(quizId: string, accountId: string) {
  if (supabase) {
    await saveCloudCompletions([{ quiz_id: quizId, account_id: accountId }]);
    return;
  }
  const write = () => {
    const completions = readSurveyCompletions();
    const completed = new Set(completions[quizId]);
    if (completed.has(accountId)) return;
    completed.add(accountId);
    localStorage.setItem(surveyCompletionKey, JSON.stringify({ ...completions, [quizId]: [...completed].sort() }));
  };

  // Keep only account membership per survey, with no answer identifier or submission time.
  if (navigator.locks) await navigator.locks.request(surveyCompletionKey, write);
  else write();
}
