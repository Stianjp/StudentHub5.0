alter table public.feedback_forms
add column if not exists can_share_answers_with_partners boolean not null default false;
