alter table public.quiz_sessions add column host_id uuid references public.employee_profiles(id) on delete cascade default auth.uid();
alter table public.participants add column owner_id uuid references public.employee_profiles(id) on delete set null default auth.uid();

create unique index quiz_sessions_open_pin on public.quiz_sessions (pin) where host_id is not null and status = 'lobby';
create index quiz_sessions_host_id on public.quiz_sessions (host_id);
create index participants_owner_id on public.participants (owner_id);

drop policy if exists "Public Manage Sessions" on public.quiz_sessions;
drop policy if exists "Public Read Sessions" on public.quiz_sessions;
drop policy if exists "Public Insert Participants" on public.participants;
drop policy if exists "Public Read Participants" on public.participants;
drop policy if exists "Public Update Participants" on public.participants;
drop policy if exists "Public Delete Participants" on public.participants;
drop policy if exists "Public Insert Answers" on public.participant_answers;
drop policy if exists "Public Read Answers" on public.participant_answers;
drop policy if exists "Public Delete Answers" on public.participant_answers;

revoke all on public.quiz_sessions, public.participants, public.participant_answers from public, anon, authenticated;
revoke select (id, participant_id, question_id, selected_option_id, is_correct, time_taken_ms, points_awarded, created_at)
  on public.participant_answers from public, anon, authenticated;
grant select, insert, update (status) on public.quiz_sessions to authenticated;
grant select, insert, update (nickname, total_score), delete on public.participants to authenticated;
grant select (id, participant_id, question_id, selected_option_id, is_correct, time_taken_ms, points_awarded, created_at),
  insert, delete on public.participant_answers to authenticated;

create policy session_host_read on public.quiz_sessions for select to authenticated
using ((host_id = (select auth.uid()) and (select private.employee_has_role(array['user','expert','admin'])))
  or (select private.employee_has_role(array['admin'])));
create policy session_host_create on public.quiz_sessions for insert to authenticated
with check (host_id = (select auth.uid()) and (select private.employee_has_role(array['user','expert','admin']))
  and status = 'lobby' and pin ~ '^[0-9]{6}$'
  and exists (select 1 from public.quizzes q where q.id = quiz_id and q.is_published));
create policy session_host_close on public.quiz_sessions for update to authenticated
using (host_id = (select auth.uid()) and (select private.employee_has_role(array['user','expert','admin'])))
with check (host_id = (select auth.uid()) and status = 'finished');

create function private.room_accepts_result(room_id uuid, activity_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.quiz_sessions s where s.id = room_id and s.quiz_id = activity_id
    and s.host_id is not null and s.status = 'lobby' and s.created_at > now() - interval '12 hours');
$$;

create policy participant_read on public.participants for select to authenticated
using ((select private.employee_has_role(array['admin'])) or (
  (select private.employee_has_role(array['user','expert','admin'])) and (
    owner_id = (select auth.uid()) or exists (select 1 from public.quiz_sessions s
      where s.id = session_id and s.host_id = (select auth.uid()))
  )
));
create policy participant_create on public.participants for insert to authenticated
with check ((select private.employee_has_role(array['user','expert','admin']))
  and (owner_id = (select auth.uid()) or (owner_id is null and nickname like 'Colaborador Anónimo #%'))
  and (session_id is null or private.room_accepts_result(session_id, quiz_id)));
create policy participant_admin_update on public.participants for update to authenticated
using ((select private.employee_has_role(array['admin']))) with check ((select private.employee_has_role(array['admin'])));
create policy participant_admin_delete on public.participants for delete to authenticated
using ((select private.employee_has_role(array['admin'])));

-- Older Android versions submit anonymous responses in two requests.
create function private.anonymize_legacy_participant()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.nickname ~ '^Colaborador Anónimo #[0-9]+$' then
    new.owner_id := null;
    new.department := null;
    new.branch := null;
    new.device_id := null;
  end if;
  return new;
end;
$$;
create trigger anonymize_legacy_participant before insert on public.participants
for each row execute function private.anonymize_legacy_participant();

create function private.can_attach_answer(attempt_id uuid, prompt_id uuid, option_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select (select private.employee_has_role(array['user','expert','admin'])) and exists (
    select 1 from public.participants p join public.questions q on q.quiz_id = p.quiz_id
    where p.id = attempt_id and q.id = prompt_id and (
      p.owner_id = (select auth.uid()) or (p.owner_id is null and p.nickname ~ '^Colaborador Anónimo #[0-9]+$'
        and p.created_at > now() - interval '15 minutes')
    ) and (option_id is null or exists (select 1 from public.question_options o where o.id = option_id and o.question_id = q.id))
  );
$$;
create policy answer_insert on public.participant_answers for insert to authenticated
with check (private.can_attach_answer(participant_id, question_id, selected_option_id));
create policy answer_admin_read on public.participant_answers for select to authenticated
using ((select private.employee_has_role(array['admin'])));
create policy answer_admin_delete on public.participant_answers for delete to authenticated
using ((select private.employee_has_role(array['admin'])));

create function private.find_quiz_room(room_pin text)
returns table(id uuid, quiz_id uuid) language sql stable security definer set search_path = '' as $$
  select s.id, s.quiz_id from public.quiz_sessions s join public.quizzes q on q.id = s.quiz_id
  where (select private.employee_has_role(array['user','expert','admin'])) and s.pin = room_pin
    and s.host_id is not null and s.status = 'lobby' and s.created_at > now() - interval '12 hours' and q.is_published;
$$;
create function public.find_quiz_room(room_pin text)
returns table(id uuid, quiz_id uuid) language sql stable security invoker set search_path = '' as $$
  select * from private.find_quiz_room(room_pin);
$$;

create function private.verify_quiz_result(attempt_id uuid)
returns table(id uuid, quiz_id uuid, nickname text, avatar text, total_score integer,
  correct_answers_count integer, total_questions_count integer, accuracy_percentage numeric, completed_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select p.id, p.quiz_id, p.nickname, p.avatar, p.total_score, p.correct_answers_count,
    p.total_questions_count, p.accuracy_percentage, p.completed_at from public.participants p
  where (select private.employee_has_role(array['user','expert','admin'])) and p.id = attempt_id
    and p.nickname not like 'Colaborador Anónimo #%'
    and p.nickname <> '__deleted__' and p.total_score >= 0;
$$;
create function public.verify_quiz_result(attempt_id uuid)
returns table(id uuid, quiz_id uuid, nickname text, avatar text, total_score integer,
  correct_answers_count integer, total_questions_count integer, accuracy_percentage numeric, completed_at timestamptz)
language sql stable security invoker set search_path = '' as $$
  select * from private.verify_quiz_result(attempt_id);
$$;

create function private.submit_employee_survey(result jsonb, responses jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare
  actor_id uuid := auth.uid();
  attempt public.participants%rowtype := jsonb_populate_record(null::public.participants, result);
  activity public.quizzes%rowtype;
  employee public.employee_profiles%rowtype;
  settings jsonb;
  anonymous boolean;
  response_count integer;
begin
  select * into employee from public.employee_profiles where id = actor_id and is_active;
  if not found then raise exception 'Inicia sesión para enviar la encuesta.' using errcode = '42501'; end if;
  select * into activity from public.quizzes where id = attempt.quiz_id and is_published;
  if not found or attempt.id is null then raise exception 'La encuesta no está disponible.'; end if;
  begin
    settings := substring(activity.description from '<!--SETTINGS:(.*)-->')::jsonb;
  exception when invalid_text_representation then
    settings := null;
  end;
  anonymous := coalesce(settings ->> 'isAnonymousSurvey' = 'true', false);
  if not coalesce((settings ->> 'quizKind' = 'survey' or anonymous or
    (settings ->> 'quizKind' is null and (activity.title ~* '\mencuestas?\M' or activity.category ~* '\mencuestas?\M' or
      exists (select 1 from public.questions where quiz_id = activity.id and question_type = 'survey_rating')))), false) then
    raise exception 'La actividad no es una encuesta.';
  end if;
  if attempt.session_id is not null and not private.room_accepts_result(attempt.session_id, activity.id) then
    raise exception 'La sala está cerrada.';
  end if;
  select count(*) into response_count from public.questions where quiz_id = activity.id;
  if jsonb_typeof(responses) is distinct from 'array' or response_count = 0 then
    raise exception 'Las respuestas de la encuesta no son válidas.';
  end if;
  if jsonb_array_length(responses) <> response_count or (
    select count(distinct a.question_id)
    from jsonb_populate_recordset(null::public.participant_answers, responses) a
    join public.questions q on q.id = a.question_id and q.quiz_id = activity.id
    where (a.selected_option_id is null or exists (select 1 from public.question_options o
      where o.id = a.selected_option_id and o.question_id = q.id))
  ) <> response_count then raise exception 'Las respuestas de la encuesta no son válidas.'; end if;

  insert into public.participants (id, quiz_id, session_id, owner_id, nickname, avatar, total_questions_count, department)
  values (attempt.id, activity.id, attempt.session_id, case when anonymous then null else actor_id end,
    case when anonymous then 'Colaborador Anónimo' else employee.name end,
    case when anonymous then '🛡️' else left(coalesce(attempt.avatar, '🦊'), 12) end,
    response_count, case when anonymous then null else employee.department end)
  on conflict (id) do nothing;
  if not found then
    if exists (select 1 from public.participants p where p.id = attempt.id and p.quiz_id = activity.id
      and (p.owner_id = actor_id or (anonymous and p.owner_id is null and p.nickname = 'Colaborador Anónimo')))
      and exists (select 1 from public.employee_survey_completions c where c.quiz_id = activity.id and c.account_id = actor_id)
    then return; end if;
    raise exception 'El folio de la encuesta ya existe.';
  end if;

  insert into public.participant_answers (participant_id, question_id, selected_option_id, submitted_text, time_taken_ms)
  select attempt.id, a.question_id, a.selected_option_id, left(a.submitted_text, 2000), greatest(a.time_taken_ms, 0)
  from jsonb_populate_recordset(null::public.participant_answers, responses) a;

  insert into public.employee_survey_completions (quiz_id, account_id)
  values (activity.id, actor_id) on conflict do nothing;
end;
$$;
create function public.submit_employee_survey(result jsonb, responses jsonb)
returns void language sql security invoker set search_path = '' as $$
  select private.submit_employee_survey(result, responses);
$$;

revoke all on function private.room_accepts_result(uuid, uuid), private.can_attach_answer(uuid, uuid, uuid),
  private.anonymize_legacy_participant(), private.find_quiz_room(text), public.find_quiz_room(text),
  private.verify_quiz_result(uuid), public.verify_quiz_result(uuid), private.submit_employee_survey(jsonb, jsonb),
  public.submit_employee_survey(jsonb, jsonb) from public, anon, authenticated;
grant execute on function private.room_accepts_result(uuid, uuid), private.can_attach_answer(uuid, uuid, uuid),
  private.find_quiz_room(text), public.find_quiz_room(text), private.verify_quiz_result(uuid), public.verify_quiz_result(uuid),
  private.submit_employee_survey(jsonb, jsonb), public.submit_employee_survey(jsonb, jsonb) to authenticated;
