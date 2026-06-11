drop policy if exists "Users can read tasks" on public.tasks;
drop policy if exists "Users can update task status" on public.tasks;

create policy "Users can read their tasks"
on public.tasks
for select
to authenticated
using (
  auth.jwt() ->> 'email' = created_by
  or auth.jwt() ->> 'email' = assigned_to
);

create policy "Users can update their tasks"
on public.tasks
for update
to authenticated
using (
  auth.jwt() ->> 'email' = created_by
  or auth.jwt() ->> 'email' = assigned_to
)
with check (
  status in ('pending', 'completed')
  and (
    auth.jwt() ->> 'email' = created_by
    or auth.jwt() ->> 'email' = assigned_to
  )
);
