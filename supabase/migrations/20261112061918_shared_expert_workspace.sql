create table public.employee_training_workspace (
  id smallint primary key default 1 check (id = 1),
  revision uuid not null default gen_random_uuid(),
  workspace jsonb not null default '{"people":[],"courses":[],"tasks":[],"updatedAt":null}'::jsonb,
  check (jsonb_typeof(workspace) = 'object' and workspace ?& array['people','courses','tasks']
    and jsonb_typeof(workspace -> 'people') = 'array'
    and jsonb_typeof(workspace -> 'courses') = 'array'
    and jsonb_typeof(workspace -> 'tasks') = 'array')
);

insert into public.employee_training_workspace (id) values (1);

alter table public.employee_training_workspace enable row level security;
revoke all on public.employee_training_workspace from public, anon, authenticated;
grant select, update (workspace, revision) on public.employee_training_workspace to authenticated;

create policy employee_training_workspace_read on public.employee_training_workspace for select to authenticated
using ((select private.employee_has_role(array['expert', 'admin'])));

create policy employee_training_workspace_update on public.employee_training_workspace for update to authenticated
using ((select private.employee_has_role(array['expert', 'admin'])))
with check ((select private.employee_has_role(array['expert', 'admin'])));
