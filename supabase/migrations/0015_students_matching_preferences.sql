alter table public.students
add column if not exists study_year int,
add column if not exists work_style text,
add column if not exists social_profile text,
add column if not exists team_size text;

alter table public.student_public_profiles
add column if not exists study_year int,
add column if not exists work_style text,
add column if not exists social_profile text,
add column if not exists team_size text;
