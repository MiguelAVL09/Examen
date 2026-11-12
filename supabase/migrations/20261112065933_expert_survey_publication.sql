alter table public.questions add column if not exists correct_order jsonb;
alter table public.questions add column if not exists accepted_answers jsonb;

drop policy if exists "Public Manage Quizzes" on public.quizzes;
drop policy if exists "Public Manage Questions" on public.questions;
drop policy if exists "Public Manage Options" on public.question_options;

grant insert, update, delete on public.quizzes, public.questions, public.question_options to authenticated;

create policy admin_manage_quizzes on public.quizzes for all to authenticated
using ((select private.employee_has_role(array['admin'])))
with check ((select private.employee_has_role(array['admin'])));

create policy admin_manage_questions on public.questions for all to authenticated
using ((select private.employee_has_role(array['admin'])))
with check ((select private.employee_has_role(array['admin'])));

create policy admin_manage_question_options on public.question_options for all to authenticated
using ((select private.employee_has_role(array['admin'])))
with check ((select private.employee_has_role(array['admin'])));

create table private.expert_survey_publications (
  quiz_id uuid primary key references public.quizzes (id) on delete cascade,
  author_id uuid references auth.users (id) on delete set null,
  request_hash text not null
);

alter table private.expert_survey_publications enable row level security;

create function private.publish_expert_survey(survey_id uuid, survey_title text, survey_description text,
  survey_anonymous boolean, survey_questions jsonb)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  payload_hash text;
  metadata text;
  prompt jsonb;
  options jsonb;
  question_number integer;
  question_id uuid;
begin
  if actor is null or not private.employee_has_role(array['expert', 'admin']) then
    raise exception 'Solo Cinepolito Experto o Administración puede publicar encuestas.' using errcode = '42501';
  end if;

  survey_title := btrim(coalesce(survey_title, ''));
  survey_description := btrim(coalesce(survey_description, ''));
  if survey_id is null or char_length(survey_title) not between 1 and 120 or
     char_length(survey_description) > 600 or strpos(survey_description, '<!--SETTINGS:') > 0 or
     survey_anonymous is null or jsonb_typeof(survey_questions) is distinct from 'array' then
    raise exception 'Revisa el título, la descripción y las preguntas.';
  end if;
  if jsonb_array_length(survey_questions) not between 1 and 30 then
    raise exception 'Agrega entre 1 y 30 preguntas.';
  end if;

  payload_hash := md5(jsonb_build_array(survey_title, survey_description, survey_anonymous, survey_questions)::text);
  metadata := jsonb_build_object('quizKind', 'survey', 'isAnonymousSurvey', survey_anonymous,
    'isExamOpen', true, 'shuffleQuestions', false, 'maxAttemptsPerUser', 0)::text;

  insert into public.quizzes (id, title, description, category, is_published)
  values (survey_id, survey_title, survey_description || '<!--SETTINGS:' || metadata || '-->', 'Encuesta', true)
  on conflict (id) do nothing;
  if not found then
    if exists (select 1 from private.expert_survey_publications
      where quiz_id = survey_id and author_id = actor and request_hash = payload_hash) then
      return survey_id;
    end if;
    raise exception 'Esta encuesta ya fue publicada. Vuelve a Cursos para verla.';
  end if;

  for prompt, question_number in select item, (position - 1)::integer
    from jsonb_array_elements(survey_questions) with ordinality as input(item, position)
  loop
    options := prompt -> 'options';
    if jsonb_typeof(prompt -> 'text') is distinct from 'string' or
       char_length(btrim(prompt ->> 'text')) not between 1 and 300 or
       jsonb_typeof(options) is distinct from 'array' then
      raise exception 'Escribe el texto y las opciones de cada pregunta.';
    end if;
    if jsonb_array_length(options) not between 2 and 5 or exists (
      select 1 from jsonb_array_elements(options) as option_value(value)
      where jsonb_typeof(value) <> 'string' or char_length(btrim(value #>> '{}')) not between 1 and 100
    ) or (select count(distinct lower(btrim(value))) from jsonb_array_elements_text(options) as option_text(value)) <> jsonb_array_length(options) then
      raise exception 'Cada pregunta debe tener de 2 a 5 opciones distintas.';
    end if;

    insert into public.questions (quiz_id, question_text, question_type, order_index)
    values (survey_id, btrim(prompt ->> 'text'), 'survey_rating', question_number)
    returning id into question_id;

    insert into public.question_options (question_id, option_text, is_correct, color, shape, order_index)
    select question_id, btrim(value), false,
      (array['red','blue','yellow','green','blue'])[position::integer],
      (array['triangle','diamond','circle','square','diamond'])[position::integer],
      (position - 1)::integer
    from jsonb_array_elements_text(options) with ordinality as choice(value, position);
  end loop;

  insert into private.expert_survey_publications (quiz_id, author_id, request_hash) values (survey_id, actor, payload_hash);
  return survey_id;
end;
$$;

create function public.publish_expert_survey(survey_id uuid, survey_title text, survey_description text,
  survey_anonymous boolean, survey_questions jsonb)
returns uuid
language sql security invoker set search_path = ''
as $$
  select private.publish_expert_survey(survey_id, survey_title, survey_description, survey_anonymous, survey_questions);
$$;

revoke all on function private.publish_expert_survey(uuid, text, text, boolean, jsonb) from public, anon, authenticated;
revoke all on function public.publish_expert_survey(uuid, text, text, boolean, jsonb) from public, anon, authenticated;
grant execute on function private.publish_expert_survey(uuid, text, text, boolean, jsonb) to authenticated;
grant execute on function public.publish_expert_survey(uuid, text, text, boolean, jsonb) to authenticated;
