with campaign as (
  select id
  from public.event_registration_campaigns
  where slug = 'student-connect-2026'
  limit 1
)
update public.event_registration_stands
set
  status = 'available',
  x = case stand_code
    when 'Standard 4' then 81.78
    when 'Standard 5' then 90.55
    when 'Standard 6' then 90.55
    else x
  end,
  y = case stand_code
    when 'Standard 4' then 28.70
    when 'Standard 5' then 29.28
    when 'Standard 6' then 32.47
    else y
  end,
  width = case stand_code
    when 'Standard 4' then 4.40
    when 'Standard 5' then 3.50
    when 'Standard 6' then 3.50
    else width
  end,
  height = case stand_code
    when 'Standard 4' then 2.18
    when 'Standard 5' then 2.94
    when 'Standard 6' then 2.94
    else height
  end,
  updated_at = now()
where campaign_id = (select id from campaign)
  and stand_code in ('Standard 4', 'Standard 5', 'Standard 6');
