-- ============================================================
-- Cremona CRM — Initial Schema
-- ============================================================

-- Workspaces (cada empresa é um workspace isolado)
create table if not exists workspaces (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  slug             text unique not null,
  owner_id         uuid references auth.users(id) on delete set null,
  whatsapp_phone   text,
  whatsapp_token   text,
  plan             text default 'trial',
  trial_ends_at    timestamptz,
  created_at       timestamptz default now()
);

-- Membros por workspace
create table if not exists workspace_members (
  id             uuid primary key default gen_random_uuid(),
  workspace_id   uuid references workspaces(id) on delete cascade not null,
  user_id        uuid references auth.users(id) on delete cascade not null,
  role           text default 'member' check (role in ('owner', 'admin', 'member')),
  created_at     timestamptz default now(),
  unique (workspace_id, user_id)
);

-- Etapas do funil (configuráveis por workspace)
create table if not exists pipeline_stages (
  id             uuid primary key default gen_random_uuid(),
  workspace_id   uuid references workspaces(id) on delete cascade not null,
  name           text not null,
  color          text default '#378ADD',
  position       integer not null,
  created_at     timestamptz default now()
);

-- Contatos / clientes
create table if not exists contacts (
  id                  uuid primary key default gen_random_uuid(),
  workspace_id        uuid references workspaces(id) on delete cascade not null,
  name                text not null,
  phone               text,
  email               text,
  company             text,
  position            text,
  notes               text,
  custom_fields       jsonb default '{}',
  tags                text[] default '{}',
  pipeline_stage_id   uuid references pipeline_stages(id) on delete set null,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

-- Oportunidades de venda
create table if not exists deals (
  id             uuid primary key default gen_random_uuid(),
  workspace_id   uuid references workspaces(id) on delete cascade not null,
  contact_id     uuid references contacts(id) on delete cascade not null,
  title          text not null,
  value          numeric(10,2),
  stage_id       uuid references pipeline_stages(id) on delete set null,
  status         text default 'open' check (status in ('open', 'won', 'lost')),
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

-- Vendas fechadas
create table if not exists sales (
  id               uuid primary key default gen_random_uuid(),
  workspace_id     uuid references workspaces(id) on delete cascade not null,
  contact_id       uuid references contacts(id) on delete set null,
  product_name     text not null,
  value            numeric(10,2) not null,
  payment_method   text,
  status           text default 'paid' check (status in ('paid', 'pending', 'cancelled')),
  sale_date        date default current_date,
  notes            text,
  created_at       timestamptz default now()
);

-- Tarefas vinculadas a contatos
create table if not exists tasks (
  id             uuid primary key default gen_random_uuid(),
  workspace_id   uuid references workspaces(id) on delete cascade not null,
  contact_id     uuid references contacts(id) on delete set null,
  assigned_to    uuid references auth.users(id) on delete set null,
  title          text not null,
  description    text,
  priority       text default 'medium' check (priority in ('high', 'medium', 'low')),
  due_date       timestamptz,
  completed_at   timestamptz,
  created_at     timestamptz default now()
);

-- Mensagens do WhatsApp
create table if not exists messages (
  id                    uuid primary key default gen_random_uuid(),
  workspace_id          uuid references workspaces(id) on delete cascade not null,
  contact_id            uuid references contacts(id) on delete set null,
  whatsapp_message_id   text unique,
  direction             text not null check (direction in ('inbound', 'outbound')),
  content               text,
  media_url             text,
  media_type            text,
  status                text default 'sent',
  created_at            timestamptz default now()
);

-- Histórico de atividades por contato
create table if not exists activities (
  id             uuid primary key default gen_random_uuid(),
  workspace_id   uuid references workspaces(id) on delete cascade not null,
  contact_id     uuid references contacts(id) on delete set null,
  user_id        uuid references auth.users(id) on delete set null,
  type           text not null check (type in ('note', 'call', 'email', 'whatsapp', 'task', 'sale', 'stage_change')),
  content        text,
  created_at     timestamptz default now()
);

-- ============================================================
-- Trigger: atualizar updated_at automaticamente
-- ============================================================

create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger contacts_updated_at
  before update on contacts
  for each row execute function update_updated_at();

create trigger deals_updated_at
  before update on deals
  for each row execute function update_updated_at();

-- ============================================================
-- Row Level Security
-- ============================================================

alter table workspaces         enable row level security;
alter table workspace_members  enable row level security;
alter table pipeline_stages    enable row level security;
alter table contacts           enable row level security;
alter table deals              enable row level security;
alter table sales              enable row level security;
alter table tasks              enable row level security;
alter table messages           enable row level security;
alter table activities         enable row level security;

-- Helper: workspaces do usuário autenticado
create or replace function user_workspace_ids()
returns setof uuid
language sql security definer stable as $$
  select workspace_id from workspace_members where user_id = auth.uid()
$$;

-- ---- workspaces ----
create policy "workspaces_select" on workspaces
  for select using (id in (select user_workspace_ids()));

create policy "workspaces_insert" on workspaces
  for insert with check (owner_id = auth.uid());

create policy "workspaces_update" on workspaces
  for update using (id in (select user_workspace_ids()));

create policy "workspaces_delete" on workspaces
  for delete using (owner_id = auth.uid());

-- ---- workspace_members ----
create policy "workspace_members_select" on workspace_members
  for select using (workspace_id in (select user_workspace_ids()));

create policy "workspace_members_insert" on workspace_members
  for insert with check (workspace_id in (select user_workspace_ids()));

create policy "workspace_members_update" on workspace_members
  for update using (workspace_id in (select user_workspace_ids()));

create policy "workspace_members_delete" on workspace_members
  for delete using (workspace_id in (select user_workspace_ids()));

-- ---- pipeline_stages ----
create policy "pipeline_stages_select" on pipeline_stages
  for select using (workspace_id in (select user_workspace_ids()));

create policy "pipeline_stages_insert" on pipeline_stages
  for insert with check (workspace_id in (select user_workspace_ids()));

create policy "pipeline_stages_update" on pipeline_stages
  for update using (workspace_id in (select user_workspace_ids()));

create policy "pipeline_stages_delete" on pipeline_stages
  for delete using (workspace_id in (select user_workspace_ids()));

-- ---- contacts ----
create policy "contacts_select" on contacts
  for select using (workspace_id in (select user_workspace_ids()));

create policy "contacts_insert" on contacts
  for insert with check (workspace_id in (select user_workspace_ids()));

create policy "contacts_update" on contacts
  for update using (workspace_id in (select user_workspace_ids()));

create policy "contacts_delete" on contacts
  for delete using (workspace_id in (select user_workspace_ids()));

-- ---- deals ----
create policy "deals_select" on deals
  for select using (workspace_id in (select user_workspace_ids()));

create policy "deals_insert" on deals
  for insert with check (workspace_id in (select user_workspace_ids()));

create policy "deals_update" on deals
  for update using (workspace_id in (select user_workspace_ids()));

create policy "deals_delete" on deals
  for delete using (workspace_id in (select user_workspace_ids()));

-- ---- sales ----
create policy "sales_select" on sales
  for select using (workspace_id in (select user_workspace_ids()));

create policy "sales_insert" on sales
  for insert with check (workspace_id in (select user_workspace_ids()));

create policy "sales_update" on sales
  for update using (workspace_id in (select user_workspace_ids()));

create policy "sales_delete" on sales
  for delete using (workspace_id in (select user_workspace_ids()));

-- ---- tasks ----
create policy "tasks_select" on tasks
  for select using (workspace_id in (select user_workspace_ids()));

create policy "tasks_insert" on tasks
  for insert with check (workspace_id in (select user_workspace_ids()));

create policy "tasks_update" on tasks
  for update using (workspace_id in (select user_workspace_ids()));

create policy "tasks_delete" on tasks
  for delete using (workspace_id in (select user_workspace_ids()));

-- ---- messages ----
create policy "messages_select" on messages
  for select using (workspace_id in (select user_workspace_ids()));

create policy "messages_insert" on messages
  for insert with check (workspace_id in (select user_workspace_ids()));

create policy "messages_update" on messages
  for update using (workspace_id in (select user_workspace_ids()));

create policy "messages_delete" on messages
  for delete using (workspace_id in (select user_workspace_ids()));

-- ---- activities ----
create policy "activities_select" on activities
  for select using (workspace_id in (select user_workspace_ids()));

create policy "activities_insert" on activities
  for insert with check (workspace_id in (select user_workspace_ids()));

create policy "activities_update" on activities
  for update using (workspace_id in (select user_workspace_ids()));

create policy "activities_delete" on activities
  for delete using (workspace_id in (select user_workspace_ids()));
