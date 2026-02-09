do $$
begin
  alter type public.lead_source add value if not exists 'ticket';
exception when duplicate_object then null;
end $$;

do $$
begin
  alter type public.consent_source add value if not exists 'ticket';
exception when duplicate_object then null;
end $$;
