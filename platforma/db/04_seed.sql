-- =====================================================================
--  04_seed.sql : baslangic kataloqu
--  Tekrar isledile biler (on conflict do nothing / update).
-- =====================================================================

insert into public.programs (slug, name, sort) values
  ('ibtidai',       'Ibtidai sinifler (1-4)',        10),
  ('orta',          'Orta mekteb (5-8)',             20),
  ('buraxilis',     'Buraxilis imtahani (9-11)',     30),
  ('miq',           'MIQ - muellimlerin ise qebulu', 40),
  ('sertifikasiya', 'Muellim sertifikasiyasi',       50)
on conflict (slug) do update set name = excluded.name, sort = excluded.sort;

insert into public.subjects (slug, name, sort) values
  ('riyaziyyat',   'Riyaziyyat',       10),
  ('az-dili',      'Azerbaycan dili',  20),
  ('ingilis-dili', 'Ingilis dili',     30),
  ('hayat-bilgisi','Heyat bilgisi',    40),
  ('informatika',  'Informatika',      50),
  ('fizika',       'Fizika',           60),
  ('kimya',        'Kimya',            70),
  ('biologiya',    'Biologiya',        80),
  ('tarix',        'Tarix',            90),
  ('cografiya',    'Cografiya',       100),
  ('kurikulum',    'Kurikulum',       110)
on conflict (slug) do update set name = excluded.name, sort = excluded.sort;

-- Ibtidai: 1-4 sinif
insert into public.levels (program_id, code, name, sort)
select p.id, g::text, g::text || '-ci sinif', g * 10
  from public.programs p, generate_series(1, 4) g
 where p.slug = 'ibtidai'
on conflict (program_id, code) do nothing;

-- Orta: 5-8
insert into public.levels (program_id, code, name, sort)
select p.id, g::text, g::text || '-ci sinif', g * 10
  from public.programs p, generate_series(5, 8) g
 where p.slug = 'orta'
on conflict (program_id, code) do nothing;

-- Buraxilis: 9-11
insert into public.levels (program_id, code, name, sort)
select p.id, g::text, g::text || '-ci sinif', g * 10
  from public.programs p, generate_series(9, 11) g
 where p.slug = 'buraxilis'
on conflict (program_id, code) do nothing;

-- MIQ ve sertifikasiya: sinif yox, ixtisas pilleleri
insert into public.levels (program_id, code, name, sort)
select p.id, v.code, v.name, v.sort
  from public.programs p,
       (values ('ibtidai-muellimi','Ibtidai sinif muellimi',10),
               ('riyaziyyat',      'Riyaziyyat muellimi',   20),
               ('az-dili',         'Azerbaycan dili muellimi',30),
               ('ingilis-dili',    'Ingilis dili muellimi', 40)) as v(code,name,sort)
 where p.slug in ('miq','sertifikasiya')
on conflict (program_id, code) do nothing;

-- Hansi fenn hansi programda var
insert into public.program_subjects (program_id, subject_id)
select p.id, s.id from public.programs p, public.subjects s
 where (p.slug = 'ibtidai'  and s.slug in ('riyaziyyat','az-dili','ingilis-dili','hayat-bilgisi'))
    or (p.slug = 'orta'     and s.slug in ('riyaziyyat','az-dili','ingilis-dili','informatika','fizika','biologiya','tarix','cografiya'))
    or (p.slug = 'buraxilis'and s.slug in ('riyaziyyat','az-dili','ingilis-dili','fizika','kimya','biologiya','tarix','cografiya','informatika'))
    or (p.slug in ('miq','sertifikasiya') and s.slug in ('kurikulum','riyaziyyat','az-dili','ingilis-dili'))
on conflict do nothing;

-- ----------------------------------------------------------------- paketler
--  price_minor ve price_per_seat_minor QEPIKLEDIR (999 = 9.99 AZN).
--  Reqemler yer tutucudur - satisdan evvel deqiqlesdirilecek.
insert into public.plans (slug, name, audience, price_minor, price_per_seat_minor,
                          max_students, period, sort, features) values
  ('pulsuz', 'Pulsuz', 'parent', 0, 0, 2, 'month', 10,
   '{"reports":false,"history_days":7,"weak_topics":false}'::jsonb),

  ('valideyn-aylik', 'Valideyn - aylik', 'parent', 990, 0, 3, 'month', 20,
   '{"reports":true,"history_days":365,"weak_topics":true}'::jsonb),

  ('valideyn-illik', 'Valideyn - illik', 'parent', 9900, 0, 3, 'year', 30,
   '{"reports":true,"history_days":null,"weak_topics":true}'::jsonb),

  ('repetitor-25', 'Repetitor - 25 sagird', 'tutor', 2900, 0, 25, 'month', 40,
   '{"reports":true,"own_tests":true,"weak_topics":true,"class_analytics":true}'::jsonb),

  ('repetitor-60', 'Repetitor - 60 sagird', 'tutor', 5900, 0, 60, 'month', 50,
   '{"reports":true,"own_tests":true,"weak_topics":true,"class_analytics":true}'::jsonb),

  ('repetitor-acik', 'Repetitor - sagird sayina gore', 'tutor', 1500, 120, null, 'month', 60,
   '{"reports":true,"own_tests":true,"weak_topics":true,"class_analytics":true}'::jsonb),

  ('mekteb', 'Mekteb lisenziyasi', 'school', 0, 90, null, 'year', 70,
   '{"reports":true,"own_tests":true,"weak_topics":true,"class_analytics":true,"multi_teacher":true}'::jsonb)
on conflict (slug) do update
  set name = excluded.name, audience = excluded.audience,
      price_minor = excluded.price_minor,
      price_per_seat_minor = excluded.price_per_seat_minor,
      max_students = excluded.max_students,
      period = excluded.period, sort = excluded.sort,
      features = excluded.features;
