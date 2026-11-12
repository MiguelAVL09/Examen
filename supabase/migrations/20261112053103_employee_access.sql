create schema if not exists private;

create table public.employee_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  employee_number text not null unique check (char_length(employee_number) between 1 and 30),
  name text not null check (char_length(name) between 1 and 100),
  department text not null check (char_length(department) between 1 and 60),
  role text not null check (role in ('user', 'expert', 'admin')),
  is_active boolean not null default true,
  is_master boolean not null default false,
  revision uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  check (not is_master or (role = 'admin' and is_active))
);

create unique index employee_profiles_single_master on public.employee_profiles (is_master) where is_master;

create table public.employee_survey_completions (
  quiz_id uuid not null,
  account_id uuid not null references public.employee_profiles (id) on delete cascade,
  primary key (quiz_id, account_id)
);

create index employee_survey_completions_account_id on public.employee_survey_completions (account_id);

create table public.employee_setup_tokens (
  token_hash text primary key check (token_hash ~ '^[0-9a-f]{64}$'),
  expires_at timestamptz not null
);

alter table public.employee_profiles enable row level security;
alter table public.employee_survey_completions enable row level security;
alter table public.employee_setup_tokens enable row level security;

revoke all on public.employee_profiles, public.employee_survey_completions, public.employee_setup_tokens from public, anon, authenticated;
grant select on public.employee_profiles to authenticated;
grant select, insert on public.employee_survey_completions to authenticated;
grant select on public.employee_profiles to service_role;
grant select, delete on public.employee_setup_tokens to service_role;

create function private.employee_has_role(allowed_roles text[])
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.employee_profiles
    where id = (select auth.uid()) and is_active and role = any(allowed_roles)
  );
$$;

revoke all on function private.employee_has_role(text[]) from public;
grant usage on schema private to authenticated;
grant execute on function private.employee_has_role(text[]) to authenticated;

create policy employee_profiles_read on public.employee_profiles for select to authenticated
using (id = (select auth.uid()) or (select private.employee_has_role(array['expert', 'admin'])));

create policy employee_survey_completions_read on public.employee_survey_completions for select to authenticated
using (account_id = (select auth.uid()) or (select private.employee_has_role(array['expert', 'admin'])));

create policy employee_survey_completions_insert on public.employee_survey_completions for insert to authenticated
with check (
  (account_id = (select auth.uid()) and (select private.employee_has_role(array['user', 'expert', 'admin'])))
  or (select private.employee_has_role(array['admin']))
);

create function private.sync_employee_profile()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  profile jsonb := new.raw_app_meta_data -> 'cinepolis_employee';
begin
  if profile is null then
    if lower(new.email) like '%@employee.cinepolis.invalid' then
      raise exception 'Employee aliases require administrator provisioning';
    end if;
    return new;
  end if;
  if new.email is distinct from profile ->> 'email_alias' then
    raise exception 'Employee alias must match the directory';
  end if;
  if tg_op = 'INSERT' then
    insert into public.employee_profiles (id, employee_number, name, department, role, is_active, is_master, created_at)
    values (new.id, profile ->> 'employee_number', profile ->> 'name', profile ->> 'department',
      profile ->> 'role', (profile ->> 'is_active')::boolean, coalesce((profile ->> 'is_master')::boolean, false), new.created_at);
  elsif profile is distinct from old.raw_app_meta_data -> 'cinepolis_employee' then
    update public.employee_profiles set
      employee_number = profile ->> 'employee_number',
      name = profile ->> 'name',
      department = profile ->> 'department',
      role = profile ->> 'role',
      is_active = (profile ->> 'is_active')::boolean,
      revision = gen_random_uuid()
    where id = new.id and revision = (profile ->> 'expected_revision')::uuid;
    if not found then
      raise exception 'Employee profile changed concurrently';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function private.sync_employee_profile() from public;

create trigger sync_cinepolis_employee_profile
after insert or update of email, raw_app_meta_data on auth.users
for each row execute function private.sync_employee_profile();
