create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  assigned_to text not null,
  created_by text not null,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  constraint tasks_status_check check (status in ('pending', 'completed'))
);

alter table public.tasks enable row level security;

create policy "Users can read tasks"
on public.tasks
for select
to authenticated
using (true);

create policy "Users can create tasks"
on public.tasks
for insert
to authenticated
with check (auth.jwt() ->> 'email' = created_by);

create policy "Users can update task status"
on public.tasks
for update
to authenticated
using (true)
with check (status in ('pending', 'completed'));
