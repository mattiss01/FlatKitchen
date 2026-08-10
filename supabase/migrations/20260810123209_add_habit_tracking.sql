create table public.habits (
  id bigint generated always as identity primary key,
  owner_name text not null check (char_length(btrim(owner_name)) between 1 and 80),
  title text not null check (char_length(btrim(title)) between 1 and 120),
  habit_type text not null check (habit_type in ('simple', 'routine')),
  schedule_type text not null check (schedule_type in ('daily', 'fixed_weekdays', 'weekly_target')),
  weekdays smallint[] not null default '{}',
  weekly_target smallint,
  start_date date not null,
  sort_order integer not null default 0,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint habits_schedule_configuration check (
    (
      schedule_type = 'daily'
      and cardinality(weekdays) = 0
      and weekly_target is null
    ) or (
      schedule_type = 'fixed_weekdays'
      and cardinality(weekdays) between 1 and 7
      and weekdays <@ array[1, 2, 3, 4, 5, 6, 7]::smallint[]
      and weekly_target is null
    ) or (
      schedule_type = 'weekly_target'
      and cardinality(weekdays) = 0
      and weekly_target between 1 and 7
    )
  )
);

create table public.habit_steps (
  id bigint generated always as identity primary key,
  habit_id bigint not null references public.habits(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 120),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.habit_entries (
  id bigint generated always as identity primary key,
  habit_id bigint not null references public.habits(id) on delete cascade,
  entry_date date not null,
  completed boolean not null default false,
  step_state jsonb not null default '[]'::jsonb check (jsonb_typeof(step_state) = 'array'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (habit_id, entry_date)
);

create index habits_owner_active_order_idx
  on public.habits (owner_name, is_archived, sort_order, created_at);
create index habit_steps_habit_order_idx
  on public.habit_steps (habit_id, sort_order);
create index habit_entries_habit_date_idx
  on public.habit_entries (habit_id, entry_date desc);

alter table public.habits enable row level security;
alter table public.habit_steps enable row level security;
alter table public.habit_entries enable row level security;

-- Flat Kitchen currently identifies a flatmate by a locally selected name and has
-- no Supabase Auth session. These policies deliberately match that existing shared,
-- anonymous access model; owner_name is a UI filter, not a privacy boundary.
create policy "Allow anonymous habit access"
  on public.habits for all to anon using (true) with check (true);
create policy "Allow anonymous habit step access"
  on public.habit_steps for all to anon using (true) with check (true);
create policy "Allow anonymous habit entry access"
  on public.habit_entries for all to anon using (true) with check (true);

grant usage on schema public to anon;
grant select, insert, update, delete on table public.habits to anon;
grant select, insert, update, delete on table public.habit_steps to anon;
grant select, insert, update, delete on table public.habit_entries to anon;
grant usage, select on sequence public.habits_id_seq to anon;
grant usage, select on sequence public.habit_steps_id_seq to anon;
grant usage, select on sequence public.habit_entries_id_seq to anon;

alter publication supabase_realtime add table public.habits;
alter publication supabase_realtime add table public.habit_steps;
alter publication supabase_realtime add table public.habit_entries;
