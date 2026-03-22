-- Email groups and members for bulk email sending

create type public.email_group_member_type as enum ('company', 'student');

create table if not exists public.email_groups (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  member_type public.email_group_member_type not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.email_group_members (
  id           uuid primary key default gen_random_uuid(),
  group_id     uuid not null references public.email_groups(id) on delete cascade,
  company_id   uuid references public.companies(id) on delete cascade,
  student_id   uuid references public.students(id) on delete cascade,
  email        text not null,
  display_name text,
  created_at   timestamptz not null default now(),
  constraint email_group_members_company_unique unique (group_id, company_id),
  constraint email_group_members_student_unique unique (group_id, student_id),
  constraint email_group_members_exclusive_target check (
    (company_id is not null and student_id is null) or
    (company_id is null and student_id is not null)
  )
);

create index if not exists idx_email_group_members_group
  on public.email_group_members(group_id);

create trigger trg_email_groups_updated_at
before update on public.email_groups
for each row execute function public.set_updated_at();

alter table public.email_groups enable row level security;
alter table public.email_group_members enable row level security;

create policy "EmailGroups: admin full access"
on public.email_groups for all to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

create policy "EmailGroupMembers: admin full access"
on public.email_group_members for all to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));
