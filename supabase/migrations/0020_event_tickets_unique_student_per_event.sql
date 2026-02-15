with ranked as (
  select
    id,
    row_number() over (
      partition by event_id, student_id
      order by (checked_in_at is not null) desc, checked_in_at desc nulls last, created_at asc, id asc
    ) as rn
  from public.event_tickets
  where student_id is not null
)
delete from public.event_tickets t
using ranked r
where t.id = r.id
  and r.rn > 1;

create unique index if not exists idx_event_tickets_unique_student_event
  on public.event_tickets (event_id, student_id)
  where student_id is not null;
