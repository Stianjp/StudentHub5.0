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
    when 'Standard 4' then 81.99
    when 'Standard 5' then 89.53
    when 'Standard 6' then 89.48
    else x
  end,
  y = case stand_code
    when 'Standard 4' then 28.23
    when 'Standard 5' then 29.69
    when 'Standard 6' then 32.88
    else y
  end,
  width = case stand_code
    when 'Standard 4' then 3.56
    when 'Standard 5' then 5.84
    when 'Standard 6' then 5.84
    else width
  end,
  height = case stand_code
    when 'Standard 4' then 3.07
    when 'Standard 5' then 1.91
    when 'Standard 6' then 1.87
    else height
  end,
  updated_at = now()
where campaign_id = (select id from campaign)
  and stand_code in ('Standard 4', 'Standard 5', 'Standard 6');
