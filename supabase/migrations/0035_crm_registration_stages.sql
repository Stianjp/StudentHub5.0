-- Add registration pipeline stages to crm_pipeline_stage enum

alter type public.crm_pipeline_stage add value if not exists 'Venter kontrakt';
alter type public.crm_pipeline_stage add value if not exists 'Venter faktura';
alter type public.crm_pipeline_stage add value if not exists 'Betalt';
