drop policy if exists "Users can read their tasks" on public.tasks;
drop policy if exists "Users can update their tasks" on public.tasks;

create policy "Users can read assigned tasks"
on public.tasks
for select
to authenticated
using (auth.jwt() ->> 'email' = assigned_to);

create policy "Users can update assigned tasks"
on public.tasks
for update
to authenticated
using (auth.jwt() ->> 'email' = assigned_to)
with check (
  auth.jwt() ->> 'email' = assigned_to
  and status in ('pending', 'completed')
);
