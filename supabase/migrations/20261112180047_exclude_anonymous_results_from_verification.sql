create or replace function private.verify_quiz_result(attempt_id uuid)
returns table(id uuid, quiz_id uuid, nickname text, avatar text, total_score integer,
  correct_answers_count integer, total_questions_count integer, accuracy_percentage numeric, completed_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select p.id, p.quiz_id, p.nickname, p.avatar, p.total_score, p.correct_answers_count,
    p.total_questions_count, p.accuracy_percentage, p.completed_at from public.participants p
  where (select private.employee_has_role(array['user','expert','admin'])) and p.id = attempt_id
    and p.nickname <> 'Colaborador Anónimo' and p.nickname not like 'Colaborador Anónimo #%'
    and p.nickname <> '__deleted__' and p.total_score >= 0;
$$;
