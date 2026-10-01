-- PipelineMint initial schema (milestone 2 preview).
-- Tenant isolation: every business table carries workspace_id and is protected by RLS.
-- Not applied by the demo app yet: milestone 1 serves in-memory seed data.

create extension if not exists pgcrypto;

create type member_role as enum ('admin', 'manager', 'member');
create type lead_stage  as enum ('new', 'qualified', 'proposal', 'won');
create type lead_source as enum ('Website', 'Telegram', 'Referral', 'API');

create table workspaces (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (char_length(name) between 1 and 120),
  created_at timestamptz not null default now()
);

create table workspace_members (
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  role         member_role not null default 'member',
  created_at   timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table leads (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name         text not null check (char_length(name) between 1 and 120),
  company      text not null check (char_length(company) between 1 and 120),
  source       lead_source not null default 'API',
  value        numeric(12, 2) not null default 0 check (value >= 0),
  score        smallint not null default 0 check (score between 0 and 100),
  stage        lead_stage not null default 'new',
  next_action  text not null default '',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index leads_workspace_stage_idx on leads (workspace_id, stage);

create table tasks (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  lead_id      uuid not null references leads(id) on delete cascade,
  title        text not null,
  due_at       timestamptz,
  done_at      timestamptz,
  created_at   timestamptz not null default now()
);

create table activities (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  lead_id      uuid references leads(id) on delete set null,
  actor_id     uuid references auth.users(id) on delete set null,
  kind         text not null,
  payload      jsonb not null default '{}'::jsonb, -- never store secrets here
  created_at   timestamptz not null default now()
);

create table webhook_endpoints (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  url          text not null,
  secret_hash  text not null, -- store only a hash of the signing secret
  created_at   timestamptz not null default now()
);

-- Helper: is the current user a member of the workspace (optionally with one of the given roles)?
create function is_workspace_member(ws uuid, roles member_role[] default null)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from workspace_members m
    where m.workspace_id = ws
      and m.user_id = auth.uid()
      and (roles is null or m.role = any (roles))
  );
$$;

alter table workspaces        enable row level security;
alter table workspace_members enable row level security;
alter table leads             enable row level security;
alter table tasks             enable row level security;
alter table activities        enable row level security;
alter table webhook_endpoints enable row level security;

create policy workspaces_select on workspaces
  for select using (is_workspace_member(id));

create policy members_select on workspace_members
  for select using (is_workspace_member(workspace_id));
create policy members_admin_write on workspace_members
  for all using (is_workspace_member(workspace_id, array['admin']::member_role[]))
  with check (is_workspace_member(workspace_id, array['admin']::member_role[]));

create policy leads_select on leads
  for select using (is_workspace_member(workspace_id));
create policy leads_insert on leads
  for insert with check (is_workspace_member(workspace_id));
create policy leads_update on leads
  for update using (is_workspace_member(workspace_id, array['admin', 'manager']::member_role[]))
  with check (is_workspace_member(workspace_id, array['admin', 'manager']::member_role[]));
create policy leads_delete on leads
  for delete using (is_workspace_member(workspace_id, array['admin']::member_role[]));

create policy tasks_select on tasks
  for select using (is_workspace_member(workspace_id));
create policy tasks_write on tasks
  for all using (is_workspace_member(workspace_id))
  with check (is_workspace_member(workspace_id));

-- Activities are append-only: no update/delete policies are defined.
create policy activities_select on activities
  for select using (is_workspace_member(workspace_id));
create policy activities_insert on activities
  for insert with check (is_workspace_member(workspace_id));

create policy webhooks_admin on webhook_endpoints
  for all using (is_workspace_member(workspace_id, array['admin']::member_role[]))
  with check (is_workspace_member(workspace_id, array['admin']::member_role[]));
