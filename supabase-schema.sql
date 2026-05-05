-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor > New Query)

-- Attendance table
create table attendance (
  date text not null,
  name text not null,
  status text not null check (status in ('home', 'away', 'unsure')),
  primary key (date, name)
);

-- Ideas table
create table ideas (
  id bigint generated always as identity primary key,
  date text not null,
  dish text not null,
  author text not null,
  tags jsonb default '[]',
  likes jsonb default '[]',
  comments jsonb default '[]',
  created_at timestamptz default now()
);

-- Meals table
create table meals (
  id bigint generated always as identity primary key,
  dish text not null,
  date text not null,
  cook text not null,
  tastiness integer default 7,
  effort integer default 5,
  cost decimal default 0,
  comment text default '',
  tags jsonb default '[]',
  created_at timestamptz default now()
);

-- Shopping list table
create table shopping_items (
  id bigint generated always as identity primary key,
  text text not null,
  added_by text not null,
  bought_by text default null,
  bought_at timestamptz default null,
  created_at timestamptz default now()
);

-- Enable Row Level Security with permissive policies
alter table attendance enable row level security;
alter table ideas enable row level security;
alter table meals enable row level security;
alter table shopping_items enable row level security;

create policy "Allow all" on attendance for all to anon using (true) with check (true);
create policy "Allow all" on ideas for all to anon using (true) with check (true);
create policy "Allow all" on meals for all to anon using (true) with check (true);
create policy "Allow all" on shopping_items for all to anon using (true) with check (true);

-- Enable real-time sync
alter publication supabase_realtime add table attendance;
alter publication supabase_realtime add table ideas;
alter publication supabase_realtime add table meals;
alter publication supabase_realtime add table shopping_items;

-- Required for Telegram webhook to receive full old_record on UPDATE (bought_by transition)
alter table public.shopping_items replica identity full;
