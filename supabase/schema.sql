-- Run this once in your Supabase project's SQL Editor to set up cloud sync.

create table if not exists public.checklists (
  user_id uuid primary key references auth.users (id) on delete cascade,
  statuses jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.checklists enable row level security;

create policy "Users can read own checklist"
  on public.checklists for select
  using (auth.uid () = user_id);

create policy "Users can insert own checklist"
  on public.checklists for insert
  with check (auth.uid () = user_id);

create policy "Users can update own checklist"
  on public.checklists for update
  using (auth.uid () = user_id);
