create or replace function public.sync_student_public_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.student_public_profiles (
    student_id,
    study_program,
    study_level,
    graduation_year,
    study_year,
    job_types,
    interests,
    values,
    preferred_locations,
    willing_to_relocate,
    liked_company_ids,
    work_style,
    social_profile,
    team_size,
    updated_at
  ) values (
    new.id,
    new.study_program,
    new.study_level,
    new.graduation_year,
    new.study_year,
    new.job_types,
    new.interests,
    new.values,
    new.preferred_locations,
    new.willing_to_relocate,
    new.liked_company_ids,
    new.work_style,
    new.social_profile,
    new.team_size,
    now()
  )
  on conflict (student_id) do update
  set
    study_program = excluded.study_program,
    study_level = excluded.study_level,
    graduation_year = excluded.graduation_year,
    study_year = excluded.study_year,
    job_types = excluded.job_types,
    interests = excluded.interests,
    values = excluded.values,
    preferred_locations = excluded.preferred_locations,
    willing_to_relocate = excluded.willing_to_relocate,
    liked_company_ids = excluded.liked_company_ids,
    work_style = excluded.work_style,
    social_profile = excluded.social_profile,
    team_size = excluded.team_size,
    updated_at = now();

  return new;
end;
$$;
