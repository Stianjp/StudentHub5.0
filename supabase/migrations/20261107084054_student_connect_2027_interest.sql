create table public.student_connect_2027_interest (
  id uuid primary key default gen_random_uuid(),
  company_name text not null check (char_length(trim(company_name)) between 2 and 160),
  email text not null unique check (char_length(email) <= 254 and email = lower(trim(email))),
  consented_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.student_connect_2027_interest enable row level security;

-- Public submissions go through the server API. No anon/authenticated policies
-- expose the interest list or allow direct client writes.
grant all on public.student_connect_2027_interest to service_role;
