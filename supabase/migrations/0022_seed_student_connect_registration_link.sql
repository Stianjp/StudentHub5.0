alter table public.events
add column if not exists registration_form_url text;

update public.events
set registration_form_url = 'https://www.oslostudenthub.no/registreringsside-student-hub-2026',
    updated_at = now()
where lower(name) = 'student connect 2026'
   or lower(slug) = 'student-connect-2026';
