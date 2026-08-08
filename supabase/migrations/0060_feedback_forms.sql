create table if not exists public.feedback_folders (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  description text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (slug)
);

create table if not exists public.feedback_forms (
  id uuid primary key default gen_random_uuid(),
  folder_id uuid not null references public.feedback_folders(id) on delete cascade,
  title text not null,
  slug text not null,
  description text,
  intro_text text,
  cta_label text not null default 'Start',
  thank_you_text text not null default 'Takk for tilbakemeldingen.',
  is_published boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (folder_id, slug)
);

create table if not exists public.feedback_questions (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.feedback_forms(id) on delete cascade,
  label text not null,
  help_text text,
  kind text not null default 'short_text' check (
    kind in (
      'short_text',
      'long_text',
      'rating',
      'single_choice',
      'multi_choice',
      'number',
      'email',
      'yes_no'
    )
  ),
  required boolean not null default false,
  options jsonb not null default '[]'::jsonb,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.feedback_responses (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.feedback_forms(id) on delete cascade,
  answers jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists feedback_forms_folder_id_idx on public.feedback_forms(folder_id);
create index if not exists feedback_forms_is_published_idx on public.feedback_forms(is_published);
create index if not exists feedback_questions_form_id_idx on public.feedback_questions(form_id);
create index if not exists feedback_responses_form_id_idx on public.feedback_responses(form_id);
create index if not exists feedback_responses_submitted_at_idx on public.feedback_responses(submitted_at desc);

alter table public.feedback_folders enable row level security;
alter table public.feedback_forms enable row level security;
alter table public.feedback_questions enable row level security;
alter table public.feedback_responses enable row level security;

create policy "FeedbackFolders: public read active"
on public.feedback_folders
for select
using (is_active = true);

create policy "FeedbackFolders: admin manage"
on public.feedback_folders
for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

create policy "FeedbackForms: public read published"
on public.feedback_forms
for select
using (is_published = true);

create policy "FeedbackForms: admin manage"
on public.feedback_forms
for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

create policy "FeedbackQuestions: public read published form"
on public.feedback_questions
for select
using (
  exists (
    select 1
    from public.feedback_forms f
    where f.id = form_id and f.is_published = true
  )
);

create policy "FeedbackQuestions: admin manage"
on public.feedback_questions
for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

create policy "FeedbackResponses: public insert published form"
on public.feedback_responses
for insert
with check (
  exists (
    select 1
    from public.feedback_forms f
    where f.id = form_id and f.is_published = true
  )
);

create policy "FeedbackResponses: admin manage"
on public.feedback_responses
for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));
