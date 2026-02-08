create table if not exists public.event_tickets (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  student_id uuid references public.students(id) on delete set null,
  ticket_number text not null unique,
  status text not null default 'active',
  checked_in_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_event_tickets_event on public.event_tickets(event_id);
create index if not exists idx_event_tickets_student on public.event_tickets(student_id);

alter table public.event_tickets enable row level security;

create policy "EventTickets: admin manage"
on public.event_tickets
for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

create policy "EventTickets: student read own"
on public.event_tickets
for select
to authenticated
using (
  exists (
    select 1
    from public.students s
    where s.id = student_id and s.user_id = auth.uid()
  )
);
