drop trigger sync_cinepolis_employee_profile on auth.users;

create or replace function private.sync_employee_profile()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  identity auth.users%rowtype;
  profile jsonb;
  next_revision uuid;
begin
  if tg_op = 'UPDATE' and old.email is not distinct from new.email
    and old.raw_app_meta_data is not distinct from new.raw_app_meta_data then
    return new;
  end if;

  -- Auth writes the identity and its admin metadata in separate statements.
  select * into identity from auth.users where id = new.id;
  if not found then return new; end if;
  profile := identity.raw_app_meta_data -> 'cinepolis_employee';

  if profile is null then
    if lower(identity.email) like '%@employee.cinepolis.invalid' then
      raise exception 'Employee aliases require administrator provisioning';
    end if;
    return new;
  end if;
  if identity.email is distinct from profile ->> 'email_alias' then
    raise exception 'Employee alias must match the directory';
  end if;

  next_revision := (profile ->> 'revision')::uuid;
  if exists (select 1 from public.employee_profiles where id = identity.id and revision = next_revision) then
    return new;
  end if;

  if tg_op = 'INSERT' then
    insert into public.employee_profiles (id, employee_number, name, department, role, is_active, is_master, created_at, revision)
    values (identity.id, profile ->> 'employee_number', profile ->> 'name', profile ->> 'department', profile ->> 'role',
      (profile ->> 'is_active')::boolean, (profile ->> 'is_master')::boolean, identity.created_at, next_revision);
  else
    update public.employee_profiles set
      employee_number = profile ->> 'employee_number',
      name = profile ->> 'name',
      department = profile ->> 'department',
      role = profile ->> 'role',
      is_active = (profile ->> 'is_active')::boolean,
      revision = next_revision
    where id = identity.id and revision = (profile ->> 'expected_revision')::uuid;
    if not found then
      raise exception 'Employee profile changed concurrently';
    end if;
  end if;
  return new;
end;
$$;

create constraint trigger sync_cinepolis_employee_profile
after insert or update on auth.users deferrable initially deferred
for each row execute function private.sync_employee_profile();
