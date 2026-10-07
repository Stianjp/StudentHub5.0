-- Normalize existing student school values after moving registration to a fixed school picker.

update public.students
set school = 'OsloMet'
where school is not null
  and trim(school) in (
    'Met Oslo',
    'Oslmet',
    'Oslomer',
    'Oslomey',
    'Kjemiingeniør,Oslomet'
  );

update public.students
set school = 'Høyskolen Kristiania'
where school is not null
  and trim(school) in (
    'HK',
    'Høyskolen Kristianina',
    'Høyskolen Kristianka',
    'Høyskolen Kristiannia',
    'Kristiana University'
  );

update public.students
set school = 'BI'
where school is not null
  and trim(school) in (
    'BI handelsskole',
    'BI Handelsskole',
    'BI Handelssskole',
    'BI Handelshøyskole',
    'Handelsskole BI',
    'Handelshøyskolen BI',
    'BI Norwegian Business School - Oslo campus'
  );

update public.students
set school = 'UiO'
where school is not null
  and trim(school) = 'Universitetet og Oslo';

update public.students
set school = 'UiS'
where school is not null
  and trim(school) = 'Universitet i Stavanger';

update public.students
set school = 'UiA'
where school is not null
  and trim(school) = 'Universitetet i Agder';

update public.students
set school = 'Other'
where school is not null
  and trim(school) in (
    'Dnipro University of Technology',
    'EADA Business School Barcelona',
    'Gokstad Akademiet',
    'Hanze University of Applied Sciences',
    'Imperial College London',
    'Karunakaran',
    'London School of Business and Finance',
    'LTU (Sweden)',
    'LTU, (Sweden)',
    'LUT',
    'NHH',
    'nito',
    'Nybakk',
    'Oslo Nye Fagskole',
    'Oslo ny høyskole',
    'Stambulov',
    'The Open University',
    'University College London',
    'University of Sydney',
    'Vtu',
    'Wayu',
    'Xyz'
  );
