-- Older clients use INSERT ... ON CONFLICT DO NOTHING, which also checks SELECT policy.
-- Let the write see its own new row without persisting a link from anonymous answers to the employee.
create or replace function private.anonymize_legacy_participant()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.nickname ~ '^Colaborador Anónimo #[0-9]+$' then
    new.owner_id := null;
    new.department := null;
    new.branch := null;
    new.device_id := null;
    perform set_config('cinepolis.participant_write_id', new.id::text, true);
  end if;
  return new;
end;
$$;

create policy participant_legacy_upsert on public.participants for select to authenticated
using (id = nullif(current_setting('cinepolis.participant_write_id', true), '')::uuid);

create function private.allow_answer_upsert()
returns trigger language plpgsql set search_path = '' as $$
begin
  if private.can_attach_answer(new.participant_id, new.question_id, new.selected_option_id) then
    perform set_config('cinepolis.answer_write_id', new.id::text, true);
  end if;
  return new;
end;
$$;
create trigger allow_answer_upsert before insert on public.participant_answers
for each row execute function private.allow_answer_upsert();
create policy answer_upsert on public.participant_answers for select to authenticated
using (id = nullif(current_setting('cinepolis.answer_write_id', true), '')::uuid);

create function private.clear_submission_write_id()
returns trigger language plpgsql set search_path = '' as $$
begin
  perform set_config(tg_argv[0], '', true);
  return null;
end;
$$;
create trigger clear_participant_write_id after insert on public.participants
for each statement execute function private.clear_submission_write_id('cinepolis.participant_write_id');
create trigger clear_answer_write_id after insert on public.participant_answers
for each statement execute function private.clear_submission_write_id('cinepolis.answer_write_id');

revoke all on function private.allow_answer_upsert(), private.clear_submission_write_id() from public, anon, authenticated;
