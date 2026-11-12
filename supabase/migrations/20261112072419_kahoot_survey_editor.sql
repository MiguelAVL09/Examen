create function private.valid_kahoot_survey_image(image text)
returns boolean
language sql immutable set search_path = ''
as $$
  select image = '' or (char_length(image) <= 250000 and (
    image ~ '^https://[^[:space:]]+$' or image ~ '^data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$'
  ));
$$;

revoke all on function private.valid_kahoot_survey_image(text) from public, anon, authenticated;

create function private.publish_expert_survey(survey_id uuid, survey_title text, survey_description text,
  survey_anonymous boolean, survey_questions jsonb, survey_category text, survey_cover text, survey_attempts integer)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  payload_hash text;
  metadata text;
  prompt jsonb;
  options jsonb;
  kind text;
  image text;
  question_number integer;
  saved_question_id uuid;
begin
  if actor is null or not private.employee_has_role(array['expert', 'admin']) then
    raise exception 'Solo Cinepolito Experto o Administración puede publicar encuestas.' using errcode = '42501';
  end if;

  survey_title := btrim(coalesce(survey_title, ''));
  survey_description := btrim(coalesce(survey_description, ''));
  survey_category := btrim(coalesce(survey_category, ''));
  survey_cover := btrim(coalesce(survey_cover, ''));
  if survey_id is null or char_length(survey_title) not between 1 and 120 or
     char_length(survey_category) not between 1 and 80 or char_length(survey_description) > 600 or
     strpos(survey_description, '<!--SETTINGS:') > 0 or survey_anonymous is null or survey_attempts is null or
     survey_attempts not between 0 and 3 or jsonb_typeof(survey_questions) is distinct from 'array' then
    raise exception 'Revisa el título, la categoría, la descripción y las preguntas.';
  end if;
  if not private.valid_kahoot_survey_image(survey_cover) then
    raise exception 'Usa una imagen de portada más pequeña o un enlace HTTPS.';
  end if;
  if jsonb_array_length(survey_questions) not between 1 and 30 then
    raise exception 'Agrega entre 1 y 30 preguntas.';
  end if;
  if survey_anonymous then survey_attempts := 0; end if;

  -- Keep retries from clients that sent the original survey format working.
  if survey_category = 'Encuesta' and survey_cover = '' and survey_attempts = 0 and not exists (
    select 1 from jsonb_array_elements(survey_questions) as input(item) where item ?| array['kind', 'image']
  ) then
    payload_hash := md5(jsonb_build_array(survey_title, survey_description, survey_anonymous, survey_questions)::text);
  else
    payload_hash := md5(jsonb_build_array(survey_title, survey_description, survey_anonymous,
      survey_questions, survey_category, survey_cover, survey_attempts)::text);
  end if;
  metadata := jsonb_build_object('quizKind', 'survey', 'isAnonymousSurvey', survey_anonymous,
    'isExamOpen', true, 'shuffleQuestions', false, 'maxAttemptsPerUser', survey_attempts)::text;

  insert into public.quizzes (id, title, description, category, cover_image, is_published)
  values (survey_id, survey_title, survey_description || '<!--SETTINGS:' || metadata || '-->', survey_category, survey_cover, true)
  on conflict (id) do nothing;
  if not found then
    if exists (select 1 from private.expert_survey_publications
      where quiz_id = survey_id and author_id = actor and request_hash = payload_hash) then
      return survey_id;
    end if;
    raise exception 'Esta encuesta ya fue publicada. Puedes verla en Encuestas de Kahoot.';
  end if;

  for prompt, question_number in select item, (position - 1)::integer
    from jsonb_array_elements(survey_questions) with ordinality as input(item, position)
  loop
    kind := coalesce(prompt ->> 'kind', 'survey_rating');
    image := btrim(coalesce(prompt ->> 'image', ''));
    options := prompt -> 'options';
    if kind not in ('survey_rating', 'type_answer') or jsonb_typeof(prompt -> 'text') is distinct from 'string' or
       char_length(btrim(prompt ->> 'text')) not between 1 and 300 or jsonb_typeof(options) is distinct from 'array' then
      raise exception 'Revisa el tipo, el texto y las opciones de cada pregunta.';
    end if;
    if not private.valid_kahoot_survey_image(image) then
      raise exception 'Usa una imagen de pregunta más pequeña o un enlace HTTPS.';
    end if;

    insert into public.questions (quiz_id, question_text, question_type, image_url, points_multiplier, order_index)
    values (survey_id, btrim(prompt ->> 'text'), kind, image, 0, question_number)
    returning id into saved_question_id;

    if kind = 'type_answer' then
      if jsonb_array_length(options) <> 0 then raise exception 'La respuesta abierta no admite opciones.'; end if;
      continue;
    end if;
    if jsonb_array_length(options) not between 2 and 5 or exists (
      select 1 from jsonb_array_elements(options) as option_value(value)
      where jsonb_typeof(value) <> 'string' or char_length(btrim(value #>> '{}')) not between 1 and 100
    ) or (select count(distinct lower(btrim(value))) from jsonb_array_elements_text(options) as option_text(value)) <> jsonb_array_length(options) then
      raise exception 'Cada pregunta de opción múltiple debe tener de 2 a 5 opciones distintas.';
    end if;

    insert into public.question_options (question_id, option_text, is_correct, color, shape, order_index)
    select saved_question_id, btrim(value), false,
      (array['red','blue','yellow','green','blue'])[position::integer],
      (array['triangle','diamond','circle','square','diamond'])[position::integer],
      (position - 1)::integer
    from jsonb_array_elements_text(options) with ordinality as choice(value, position);
  end loop;

  insert into private.expert_survey_publications (quiz_id, author_id, request_hash) values (survey_id, actor, payload_hash);
  return survey_id;
end;
$$;

create or replace function private.publish_expert_survey(survey_id uuid, survey_title text, survey_description text,
  survey_anonymous boolean, survey_questions jsonb)
returns uuid
language sql security invoker set search_path = ''
as $$
  select private.publish_expert_survey(survey_id, survey_title, survey_description, survey_anonymous, survey_questions, 'Encuesta', '', 0);
$$;

create function public.publish_expert_survey(survey_id uuid, survey_title text, survey_description text,
  survey_anonymous boolean, survey_questions jsonb, survey_category text, survey_cover text, survey_attempts integer)
returns uuid
language sql security invoker set search_path = ''
as $$
  select private.publish_expert_survey(survey_id, survey_title, survey_description, survey_anonymous,
    survey_questions, survey_category, survey_cover, survey_attempts);
$$;

revoke all on function private.publish_expert_survey(uuid, text, text, boolean, jsonb, text, text, integer) from public, anon, authenticated;
revoke all on function public.publish_expert_survey(uuid, text, text, boolean, jsonb, text, text, integer) from public, anon, authenticated;
grant execute on function private.publish_expert_survey(uuid, text, text, boolean, jsonb, text, text, integer) to authenticated;
grant execute on function public.publish_expert_survey(uuid, text, text, boolean, jsonb, text, text, integer) to authenticated;

alter table public.participant_answers add column if not exists submitted_text text check (char_length(submitted_text) <= 2000);
revoke select on public.participant_answers from public, anon, authenticated;
grant select (id, participant_id, question_id, selected_option_id, is_correct, time_taken_ms, points_awarded, created_at)
  on public.participant_answers to anon, authenticated;

create function private.read_survey_comments(attempt_id uuid)
returns table (question_id uuid, response text)
language sql stable security definer set search_path = ''
as $$
  select answer.question_id, answer.submitted_text
  from public.participant_answers as answer
  where (select private.employee_has_role(array['admin']))
    and answer.participant_id = attempt_id and answer.submitted_text is not null;
$$;

create function public.read_survey_comments(attempt_id uuid)
returns table (question_id uuid, response text)
language sql stable security invoker set search_path = ''
as $$
  select * from private.read_survey_comments(attempt_id);
$$;

revoke all on function private.read_survey_comments(uuid) from public, anon, authenticated;
revoke all on function public.read_survey_comments(uuid) from public, anon, authenticated;
grant execute on function private.read_survey_comments(uuid) to authenticated;
grant execute on function public.read_survey_comments(uuid) to authenticated;
