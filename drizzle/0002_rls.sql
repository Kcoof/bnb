-- 0002_rls.sql — auth FK + Row Level Security (plan §2.4)
-- Applied by `npm run db:migrate` (drizzle-kit migrate, then this script).

-- profiles.id → auth.users.id (cross-schema FK drizzle-kit cannot express)
do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_id_auth_users_fkey'
  ) then
    alter table public.profiles
      add constraint profiles_id_auth_users_fkey
      foreign key (id) references auth.users(id) on delete cascade;
  end if;
end $$;

-- Helper functions (SECURITY DEFINER to avoid recursion on profiles' own RLS)
create or replace function public.current_org_id() returns uuid
language sql stable security definer set search_path = public as $$
  select p.org_id from public.profiles p where p.id = auth.uid();
$$;

create or replace function public.current_user_role() returns public.user_role
language sql stable security definer set search_path = public as $$
  select p.role from public.profiles p where p.id = auth.uid();
$$;

-- Enable RLS everywhere. No anonymous policies: guest/cleaner paths use the
-- service-role connection from token-validated server code only (§3.4).
alter table public.organizations      enable row level security;
alter table public.profiles           enable row level security;
alter table public.properties         enable row level security;
alter table public.property_knowledge enable row level security;
alter table public.reservations       enable row level security;
alter table public.conversations      enable row level security;
alter table public.messages           enable row level security;
alter table public.escalations        enable row level security;
alter table public.cleaners           enable row level security;
alter table public.tasks              enable row level security;
alter table public.scheduled_messages enable row level security;
alter table public.email_templates    enable row level security;
alter table public.events             enable row level security;

-- Reusable predicates:
--   member rows : org_id = public.current_org_id()
--   privileged  : org_id = public.current_org_id()
--                 and public.current_user_role() in ('owner','admin')
-- Privileged branches ALWAYS include the org predicate — role alone must
-- never cross an org boundary.

drop policy if exists org_select on public.organizations;
create policy org_select on public.organizations
  for select using (id = public.current_org_id());

drop policy if exists org_update on public.organizations;
create policy org_update on public.organizations
  for update using (
    id = public.current_org_id()
    and public.current_user_role() in ('owner','admin')
  )
  with check (
    id = public.current_org_id()
    and public.current_user_role() in ('owner','admin')
  );

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select using (id = auth.uid() or org_id = public.current_org_id());

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update using (
    id = auth.uid()
    or (
      org_id = public.current_org_id()
      and public.current_user_role() in ('owner','admin')
    )
  )
  with check (
    id = auth.uid()
    or (
      org_id = public.current_org_id()
      and public.current_user_role() in ('owner','admin')
    )
  );

drop policy if exists profiles_delete on public.profiles;
create policy profiles_delete on public.profiles
  for delete using (
    org_id = public.current_org_id()
    and public.current_user_role() in ('owner','admin')
  );

-- Generic org-scoped policies for the org-denormalized tables.
-- property_knowledge is NOT here: it has no org_id column (keyed by
-- property_id) and gets its own EXISTS-based policies below.
do $$
declare t text;
begin
  foreach t in array array[
    'properties','reservations','conversations','messages',
    'escalations','cleaners','tasks','scheduled_messages','email_templates','events'
  ] loop
    execute format('drop policy if exists %I_member_select on public.%I', t, t);
    execute format(
      'create policy %I_member_select on public.%I for select using (org_id = public.current_org_id())', t, t);
    execute format('drop policy if exists %I_member_insert on public.%I', t, t);
    execute format(
      'create policy %I_member_insert on public.%I for insert with check (org_id = public.current_org_id())', t, t);
    execute format('drop policy if exists %I_member_update on public.%I', t, t);
    execute format(
      'create policy %I_member_update on public.%I for update using (org_id = public.current_org_id()) with check (org_id = public.current_org_id())', t, t);
    execute format('drop policy if exists %I_admin_delete on public.%I', t, t);
    execute format(
      'create policy %I_admin_delete on public.%I for delete using (org_id = public.current_org_id() and public.current_user_role() in (''owner'',''admin''))', t, t);
  end loop;
end $$;

-- property_knowledge: org scoping via the owning property (SECURITY DEFINER
-- helpers prevent recursion through properties' own RLS).
drop policy if exists kb_select on public.property_knowledge;
create policy kb_select on public.property_knowledge
  for select using (
    exists (
      select 1 from public.properties p
      where p.id = property_knowledge.property_id
        and p.org_id = public.current_org_id()
    )
  );

drop policy if exists kb_insert on public.property_knowledge;
create policy kb_insert on public.property_knowledge
  for insert with check (
    exists (
      select 1 from public.properties p
      where p.id = property_knowledge.property_id
        and p.org_id = public.current_org_id()
    )
  );

drop policy if exists kb_update on public.property_knowledge;
create policy kb_update on public.property_knowledge
  for update using (
    exists (
      select 1 from public.properties p
      where p.id = property_knowledge.property_id
        and p.org_id = public.current_org_id()
    )
  )
  with check (
    exists (
      select 1 from public.properties p
      where p.id = property_knowledge.property_id
        and p.org_id = public.current_org_id()
    )
  );

drop policy if exists kb_admin_delete on public.property_knowledge;
create policy kb_admin_delete on public.property_knowledge
  for delete using (
    exists (
      select 1 from public.properties p
      where p.id = property_knowledge.property_id
        and p.org_id = public.current_org_id()
        and public.current_user_role() in ('owner','admin')
    )
  );

-- AUTOMI v2 tables
alter table public.appliance_templates   enable row level security;
alter table public.property_appliances   enable row level security;
alter table public.custom_faqs           enable row level security;
alter table public.notifications         enable row level security;
alter table public.subscriptions         enable row level security;

-- shared preset content: readable by any authenticated user, never written via API
drop policy if exists templates_select on public.appliance_templates;
create policy templates_select on public.appliance_templates
  for select using (auth.uid() is not null);

do $$
declare t text;
begin
  foreach t in array array['property_appliances','custom_faqs','notifications','subscriptions'] loop
    execute format('drop policy if exists %I_v2_select on public.%I', t, t);
    execute format(
      'create policy %I_v2_select on public.%I for select using (org_id = public.current_org_id())', t, t);
    execute format('drop policy if exists %I_v2_insert on public.%I', t, t);
    execute format(
      'create policy %I_v2_insert on public.%I for insert with check (org_id = public.current_org_id())', t, t);
    execute format('drop policy if exists %I_v2_update on public.%I', t, t);
    execute format(
      'create policy %I_v2_update on public.%I for update using (org_id = public.current_org_id()) with check (org_id = public.current_org_id())', t, t);
  end loop;
end $$;
