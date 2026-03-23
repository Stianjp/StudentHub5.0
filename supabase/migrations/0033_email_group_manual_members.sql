-- Allow manual email entries in groups (no company_id or student_id required)
-- Replace the exclusive-target constraint with a "not-both-set" constraint

alter table public.email_group_members
  drop constraint if exists email_group_members_exclusive_target;

alter table public.email_group_members
  add constraint email_group_members_exclusive_target check (
    NOT (company_id is not null and student_id is not null)
  );
