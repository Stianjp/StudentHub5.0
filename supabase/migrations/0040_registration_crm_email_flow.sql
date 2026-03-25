alter table public.event_registration_campaigns
add column if not exists email_group_prefix text;

update public.event_registration_campaigns
set email_group_prefix = 'SC26'
where slug = 'student-connect-2026'
  and (email_group_prefix is null or btrim(email_group_prefix) = '');
