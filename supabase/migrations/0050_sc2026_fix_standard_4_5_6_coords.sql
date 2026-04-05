with campaign as (
  select id
  from public.event_registration_campaigns
  where slug = 'student-connect-2026'
  limit 1
)
update public.event_registration_stands
set
  x = case stand_code
    when 'Standard 4' then 80.05
    when 'Standard 5' then 91.00
    when 'Standard 6' then 90.47
    else x
  end,
  y = case stand_code
    when 'Standard 4' then 24.28
    when 'Standard 5' then 27.33
    when 'Standard 6' then 24.72
    else y
  end,
  width = case stand_code
    when 'Standard 4' then 5.72
    when 'Standard 5' then 1.83
    when 'Standard 6' then 3.39
    else width
  end,
  height = case stand_code
    when 'Standard 4' then 1.83
    when 'Standard 5' then 5.61
    when 'Standard 6' then 3.00
    else height
  end,
  updated_at = now()
where campaign_id = (select id from campaign)
  and stand_code in ('Standard 4', 'Standard 5', 'Standard 6');
