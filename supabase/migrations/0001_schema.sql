-- Esquema do dashboard de projetos: enums, tabelas e índices.

create type public.access_level  as enum ('owner', 'member', 'none');
create type public.project_kind  as enum ('projeto', 'colaboracao', 'gadget');
create type public.status_level  as enum ('on', 'half', 'off');
create type public.task_status   as enum ('todo', 'doing', 'done');
create type public.item_kind     as enum ('scope', 'test');

create table public.people (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  name       text not null,
  role       text,
  area       text,
  email      text unique,
  access     public.access_level not null default 'none'
);

create table public.projects (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz default now(),
  position     int not null,
  number       text not null,
  title        text not null,
  kind         public.project_kind not null default 'projeto',
  status_level public.status_level not null default 'off',
  status_label text not null default 'A definir',
  summary      text,
  deadline     text,
  facts        jsonb not null default '[]',
  sections     jsonb not null default '[]'
);

create table public.project_members (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  project_id uuid not null references public.projects (id) on delete cascade,
  person_id  uuid not null references public.people (id) on delete cascade,
  role       text,
  is_lead    boolean not null default false,
  unique (project_id, person_id)
);

create table public.sprints (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  name       text not null,
  starts_on  date,
  ends_on    date
);

create table public.tasks (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz default now(),
  project_id  uuid not null references public.projects (id) on delete cascade,
  title       text not null,
  description text,
  status      public.task_status not null default 'todo',
  assignee_id uuid references public.people (id) on delete set null,
  sprint_id   uuid references public.sprints (id) on delete set null,
  due_on      date,
  position    int not null default 0
);

create table public.task_items (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  task_id    uuid not null references public.tasks (id) on delete cascade,
  kind       public.item_kind not null,
  text       text not null,
  done       boolean not null default false,
  position   int not null default 0
);

create table public.pages (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  position   int not null,
  slug       text unique not null,
  title      text not null,
  blocks     jsonb not null default '[]'
);

-- Índices em todas as chaves estrangeiras
-- (unique (project_id, person_id) já cobre project_id; person_id precisa do seu).
create index project_members_person_id_idx on public.project_members (person_id);
create index tasks_project_id_idx          on public.tasks (project_id);
create index tasks_assignee_id_idx         on public.tasks (assignee_id);
create index tasks_sprint_id_idx           on public.tasks (sprint_id);
create index task_items_task_id_idx        on public.task_items (task_id);
