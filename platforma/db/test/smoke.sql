-- =====================================================================
--  smoke.sql : tehlukesizlik ve mentiq yoxlamalari
--  Isletmek:  psql -d tehsil -f test/smoke.sql
--  Her yoxlama ugursuz olsa skript dayanir.
-- =====================================================================
\set ON_ERROR_STOP on
set client_min_messages = warning;

-- ------------------------------------------------------------ hazirliq
-- (postgres superuser kimi - RLS tetbiq olunmur, melumat yigiriq)
truncate public.attempt_answers, public.attempts, public.student_sessions,
         public.consents, public.students, public.question_options,
         public.questions, public.tests, public.classes, public.subscriptions,
         public.payments, public.account_members, public.accounts,
         public.user_roles, public.profiles cascade;
delete from auth.users;

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111','muellim.a@test.az'),
  ('22222222-2222-2222-2222-222222222222','muellim.b@test.az'),
  ('33333333-3333-3333-3333-333333333333','repetitor@test.az'),
  ('44444444-4444-4444-4444-444444444444','valideyn@test.az');

-- Profiller trg_auth_user_created trigger-i ile artiq yaranib; adi yaziriq.
update public.profiles set full_name = v.nm from (values
  ('11111111-1111-1111-1111-111111111111'::uuid,'Muellim A'),
  ('22222222-2222-2222-2222-222222222222'::uuid,'Muellim B'),
  ('33333333-3333-3333-3333-333333333333'::uuid,'Repetitor R'),
  ('44444444-4444-4444-4444-444444444444'::uuid,'Valideyn V')) as v(id,nm)
 where profiles.id = v.id;

do $$
declare n int;
begin
  select count(*) into n from public.profiles;
  assert n = 4, format('Trigger 4 profil yaratmali idi: %s', n);
end $$;

insert into public.user_roles values
  ('11111111-1111-1111-1111-111111111111','teacher'),
  ('22222222-2222-2222-2222-222222222222','teacher'),
  ('33333333-3333-3333-3333-333333333333','tutor'),
  ('44444444-4444-4444-4444-444444444444','parent');

insert into public.accounts (id, type, name, owner_id) values
  ('aaaaaaaa-0000-0000-0000-000000000001','school','Mekteb 1','11111111-1111-1111-1111-111111111111'),
  ('aaaaaaaa-0000-0000-0000-000000000002','school','Mekteb 2','22222222-2222-2222-2222-222222222222'),
  ('aaaaaaaa-0000-0000-0000-000000000003','tutor','Repetitor R','33333333-3333-3333-3333-333333333333');

insert into public.account_members values
  ('aaaaaaaa-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111',true),
  ('aaaaaaaa-0000-0000-0000-000000000002','22222222-2222-2222-2222-222222222222',true),
  ('aaaaaaaa-0000-0000-0000-000000000003','33333333-3333-3333-3333-333333333333',true);

insert into public.classes (id, account_id, teacher_id, kind, name, join_code) values
  ('cccccccc-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001',
   '11111111-1111-1111-1111-111111111111','school_class','3-B','SINIF3B'),
  ('cccccccc-0000-0000-0000-000000000002','aaaaaaaa-0000-0000-0000-000000000002',
   '22222222-2222-2222-2222-222222222222','school_class','4-A','SINIF4A'),
  ('cccccccc-0000-0000-0000-000000000003','aaaaaaaa-0000-0000-0000-000000000003',
   '33333333-3333-3333-3333-333333333333','tutor_group','Cume qrupu','REPQRUP1');

insert into public.students (id, account_id, class_id, created_by, parent_id,
                             full_name, display_name, birth_year, login_code) values
  ('55555555-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001',
   'cccccccc-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111',
   '44444444-4444-4444-4444-444444444444','Aysu Memmedova','Aysu',2017,'AYSU2024'),
  ('55555555-0000-0000-0000-000000000002','aaaaaaaa-0000-0000-0000-000000000001',
   'cccccccc-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111',
   null,'Kenan Aliyev','Kenan',2017,'KENAN123'),
  ('55555555-0000-0000-0000-000000000003','aaaaaaaa-0000-0000-0000-000000000002',
   'cccccccc-0000-0000-0000-000000000002','22222222-2222-2222-2222-222222222222',
   null,'Nurlan Huseynov','Nurlan',2016,'NURLAN99');

-- Platforma testi: 1 pulsuz, 1 odenisli
insert into public.tests (id, owner_type, program_id, subject_id, title, is_free, status, pass_percent)
select 'ffffffff-0000-0000-0000-000000000001','platform', p.id, s.id,
       'Vurma cedveli - 1', true, 'published', 60
  from public.programs p, public.subjects s
 where p.slug='ibtidai' and s.slug='riyaziyyat';

insert into public.tests (id, owner_type, program_id, subject_id, title, is_free, status)
select 'ffffffff-0000-0000-0000-000000000002','platform', p.id, s.id,
       'Genis analiz testi', false, 'published'
  from public.programs p, public.subjects s
 where p.slug='ibtidai' and s.slug='riyaziyyat';

-- Repetitorun oz testi, yalniz oz qrupuna
insert into public.tests (id, owner_type, owner_id, class_id, program_id, subject_id, title, status)
select 'ffffffff-0000-0000-0000-000000000003','educator',
       '33333333-3333-3333-3333-333333333333','cccccccc-0000-0000-0000-000000000003',
       p.id, s.id, 'Repetitor testi', 'published'
  from public.programs p, public.subjects s
 where p.slug='ibtidai' and s.slug='riyaziyyat';

insert into public.questions (id, test_id, ord, kind, body, explanation, points) values
  ('99999999-0000-0000-0000-000000000001','ffffffff-0000-0000-0000-000000000001',1,'single','6 x 7 = ?','Alti defe yeddi qirx iki eder.',1),
  ('99999999-0000-0000-0000-000000000002','ffffffff-0000-0000-0000-000000000001',2,'single','9 x 8 = ?','Doqquz defe sekkiz yetmis iki eder.',1),
  ('99999999-0000-0000-0000-000000000003','ffffffff-0000-0000-0000-000000000001',3,'text','5 x 5 = ?','',1);

insert into public.question_options (question_id, ord, body, is_correct) values
  ('99999999-0000-0000-0000-000000000001',1,'42',true),
  ('99999999-0000-0000-0000-000000000001',2,'36',false),
  ('99999999-0000-0000-0000-000000000001',3,'48',false),
  ('99999999-0000-0000-0000-000000000002',1,'64',false),
  ('99999999-0000-0000-0000-000000000002',2,'72',true),
  ('99999999-0000-0000-0000-000000000002',3,'81',false),
  ('99999999-0000-0000-0000-000000000003',1,'25',true);

-- Yoxlama skriptinin ozune lazim olan id-ler. Anon cavab acarini
-- oxuya bilmediyi ucun onlari burada, imtiyazli rolda hazirlayiriq.
drop table if exists public.test_fixtures;
create table public.test_fixtures (k text primary key, v uuid);
insert into public.test_fixtures
  select 'ok1',   id from public.question_options
   where question_id = '99999999-0000-0000-0000-000000000001' and is_correct;
insert into public.test_fixtures
  select 'bad2',  id from public.question_options
   where question_id = '99999999-0000-0000-0000-000000000002' and not is_correct limit 1;
grant select on public.test_fixtures to anon, authenticated;

\echo '--- hazirliq tamam'

-- =====================================================================
--  1. MUELLIM A oz sagirdini gorur, MUELLIM B-nin sagirdini gormur
-- =====================================================================
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

do $$
declare n int;
begin
  select count(*) into n from public.students;
  assert n = 2, format('Muellim A 2 sagird gormeli idi, gordu: %s', n);

  select count(*) into n from public.students where id = '55555555-0000-0000-0000-000000000003';
  assert n = 0, 'Muellim A basqa mektebin sagirdini GORDU - RLS sizir!';
end $$;
\echo 'OK  1 · muellim yalniz oz sagirdlerini gorur'

-- =====================================================================
--  2. VALIDEYN yalniz oz usagini gorur
-- =====================================================================
set request.jwt.claim.sub = '44444444-4444-4444-4444-444444444444';
do $$
declare n int; nm text;
begin
  select count(*) into n from public.students;
  assert n = 1, format('Valideyn 1 usaq gormeli idi, gordu: %s', n);
  select full_name into nm from public.students;
  assert nm = 'Aysu Memmedova', 'Valideyn sehv usagi gordu';
end $$;
\echo 'OK  2 · valideyn yalniz oz usagini gorur'

-- =====================================================================
--  3. ANON sagird cedvelini ve cavab acarini gore bilmir
-- =====================================================================
set role anon;
reset request.jwt.claim.sub;
do $$
declare n int;
begin
  begin
    select count(*) into n from public.students;
    assert false, 'ANON students cedvelini oxudu - TEHLUKE!';
  exception when insufficient_privilege then null;
  end;

  begin
    select count(*) into n from public.question_options;
    assert false, 'ANON cavab acarini oxudu - TEHLUKE!';
  exception when insufficient_privilege then null;
  end;

  begin
    insert into public.attempts (student_id, test_id, score, max_score, percent)
    values ('55555555-0000-0000-0000-000000000001','ffffffff-0000-0000-0000-000000000001',100,100,100);
    assert false, 'ANON birbasa bal yazdi - SAXTAKARLIQ MUMKUNDUR!';
  exception when insufficient_privilege then null;
  end;
end $$;
\echo 'OK  3 · anon: sagird cedveli, cavab acari ve bal yazmaq baglidir'

-- =====================================================================
--  4. Sagird girisi + suallarda cavab acari YOXDUR
-- =====================================================================
do $$
declare
  v_login jsonb; v_token text; v_start jsonb; v_txt text;
begin
  v_login := public.rpc_student_login('AYSU2024');
  v_token := v_login->>'token';
  assert v_token is not null and length(v_token) = 64, 'Token alinmadi';
  assert v_login->'student'->>'display_name' = 'Aysu', 'Sehv sagird';

  v_start := public.rpc_start_attempt(v_token, 'ffffffff-0000-0000-0000-000000000001');
  v_txt := v_start::text;
  assert v_txt not like '%is_correct%', 'CAVAB ACARI SIZDI - is_correct qaytarildi!';
  assert v_txt not like '%explanation%', 'Izah cavabdan evvel sizdi!';
  assert jsonb_array_length(v_start->'questions') = 3, 'Sual sayi sehv';
  assert (v_start->'questions'->0->'options') is not null, 'Variantlar gelmedi';
end $$;
\echo 'OK  4 · sagird girisi isleyir, cavab acari sizmir'

-- =====================================================================
--  5. Bal SERVERDE hesablanir
-- =====================================================================
do $$
declare
  v_token text; v_start jsonb; v_res jsonb;
  v_ok1 uuid; v_wrong2 uuid;
begin
  v_token := public.rpc_student_login('AYSU2024')->>'token';
  v_start := public.rpc_start_attempt(v_token, 'ffffffff-0000-0000-0000-000000000001');

  -- 1-ci sual duz, 2-ci sual sehv, 3-cu (metn) duz  ->  2/3 = 66.67%
  select v into v_ok1    from public.test_fixtures where k = 'ok1';
  select v into v_wrong2 from public.test_fixtures where k = 'bad2';

  v_res := public.rpc_submit_attempt(v_token, (v_start->>'attempt_id')::uuid,
    jsonb_build_array(
      jsonb_build_object('q','99999999-0000-0000-0000-000000000001','o',jsonb_build_array(v_ok1)),
      jsonb_build_object('q','99999999-0000-0000-0000-000000000002','o',jsonb_build_array(v_wrong2)),
      jsonb_build_object('q','99999999-0000-0000-0000-000000000003','t','25')
    ));

  assert (v_res->>'score')::numeric = 2, format('Bal 2 olmali idi: %s', v_res->>'score');
  assert (v_res->>'max_score')::numeric = 3, 'Maksimum bal sehv';
  assert (v_res->>'percent')::numeric between 66 and 67, format('Faiz sehv: %s', v_res->>'percent');
  assert (v_res->>'passed')::boolean = true, 'passed sehv';
  assert jsonb_array_length(v_res->'wrong') = 1, 'Sehv sual sayi yanlis';
end $$;
\echo 'OK  5 · bal serverde duzgun hesablanir (2/3 = 66.67%)'

-- =====================================================================
--  6. Sagird ozune 100 bal yaza bilmir (cavab uydursa da)
-- =====================================================================
do $$
declare v_token text; v_start jsonb; v_res jsonb; v_fake uuid;
begin
  v_token := public.rpc_student_login('KENAN123')->>'token';
  v_start := public.rpc_start_attempt(v_token, 'ffffffff-0000-0000-0000-000000000001');
  v_fake  := gen_random_uuid();

  -- butun suallara uydurma variant id gonderir
  v_res := public.rpc_submit_attempt(v_token, (v_start->>'attempt_id')::uuid,
    jsonb_build_array(
      jsonb_build_object('q','99999999-0000-0000-0000-000000000001','o',jsonb_build_array(v_fake)),
      jsonb_build_object('q','99999999-0000-0000-0000-000000000002','o',jsonb_build_array(v_fake)),
      jsonb_build_object('q','99999999-0000-0000-0000-000000000003','t','yalan')));

  assert (v_res->>'score')::numeric = 0, format('Uydurma cavab bal aldi: %s', v_res->>'score');
end $$;
\echo 'OK  6 · uydurma cavab bal qazandirmir'

-- =====================================================================
--  7. Odenisli test abunesiz baglidir, abune ile acilir
-- =====================================================================
do $$
declare v_token text; ok boolean := false;
begin
  v_token := public.rpc_student_login('AYSU2024')->>'token';
  begin
    perform public.rpc_start_attempt(v_token, 'ffffffff-0000-0000-0000-000000000002');
  exception when insufficient_privilege then ok := true;
  end;
  assert ok, 'Odenisli test abunesiz acildi!';
end $$;
\echo 'OK  7 · odenisli test abunesiz baglidir'

reset role;
insert into public.subscriptions (account_id, plan_id, status, current_period_end)
select 'aaaaaaaa-0000-0000-0000-000000000001', id, 'active', now() + interval '30 days'
  from public.plans where slug = 'valideyn-aylik';
set role anon;

do $$
declare v_token text; v_start jsonb;
begin
  v_token := public.rpc_student_login('AYSU2024')->>'token';
  v_start := public.rpc_start_attempt(v_token, 'ffffffff-0000-0000-0000-000000000002');
  assert v_start->>'attempt_id' is not null, 'Abune ile de acilmadi';
end $$;
\echo 'OK  7b · abune ile odenisli test acilir'

-- =====================================================================
--  8. Basqa qrupun testi baglidir
-- =====================================================================
do $$
declare v_token text; ok boolean := false;
begin
  v_token := public.rpc_student_login('AYSU2024')->>'token';
  begin
    perform public.rpc_start_attempt(v_token, 'ffffffff-0000-0000-0000-000000000003');
  exception when insufficient_privilege then ok := true;
  end;
  assert ok, 'Basqa qrupun testi acildi!';
end $$;
\echo 'OK  8 · basqa qrupun testi baglidir'

-- =====================================================================
--  9. Liderler lovhesi yalniz oz sinfini gosterir
-- =====================================================================
do $$
declare v_token text; v_lb jsonb;
begin
  v_token := public.rpc_student_login('AYSU2024')->>'token';
  v_lb := public.rpc_leaderboard(v_token, 'ffffffff-0000-0000-0000-000000000001');
  assert jsonb_array_length(v_lb) = 2, format('Lovhede 2 nefer olmali idi: %s', v_lb::text);
  assert v_lb->0->>'name' = 'Aysu', 'Sirlama sehv';
  assert (v_lb->0->>'is_me')::boolean = true, 'is_me isaresi sehv';
  assert v_lb::text not like '%Memmedova%', 'Lovhede tam ad sizdi!';
  assert v_lb::text not like '%Nurlan%', 'Basqa sinfin sagirdi lovhede gorundu!';
end $$;
\echo 'OK  9 · lovhe yalniz oz sinfi, yalniz gorunen ad'

-- =====================================================================
-- 10. Repetitor paketi: yer limiti bazada tetbiq olunur
-- =====================================================================
reset role;
do $$
declare i int; ok boolean := false;
begin
  -- pulsuz hedd 5-dir; repetitor hesabinda hele abune yoxdur
  for i in 1..5 loop
    insert into public.students (account_id, class_id, created_by, full_name, display_name, login_code)
    values ('aaaaaaaa-0000-0000-0000-000000000003','cccccccc-0000-0000-0000-000000000003',
            '33333333-3333-3333-3333-333333333333', 'Sagird '||i, 'S'||i, 'REPKOD'||i);
  end loop;

  begin
    insert into public.students (account_id, class_id, created_by, full_name, display_name, login_code)
    values ('aaaaaaaa-0000-0000-0000-000000000003','cccccccc-0000-0000-0000-000000000003',
            '33333333-3333-3333-3333-333333333333','Sagird 6','S6','REPKOD6');
    assert false, 'Pulsuz hedd asildi, limit islemedi!';
  exception when check_violation then ok := true;
  end;
  assert ok, 'Limit xetasi gelmedi';
end $$;
\echo 'OK 10 · pulsuz hedd (5 sagird) bazada tetbiq olunur'

insert into public.subscriptions (account_id, plan_id, status, current_period_end)
select 'aaaaaaaa-0000-0000-0000-000000000003', id, 'active', now() + interval '30 days'
  from public.plans where slug = 'repetitor-25';

do $$
declare i int;
begin
  for i in 6..25 loop
    insert into public.students (account_id, class_id, created_by, full_name, display_name, login_code)
    values ('aaaaaaaa-0000-0000-0000-000000000003','cccccccc-0000-0000-0000-000000000003',
            '33333333-3333-3333-3333-333333333333','Sagird '||i,'S'||i,'REPKOD'||i);
  end loop;
  assert app.account_student_count('aaaaaaaa-0000-0000-0000-000000000003') = 25, 'Sagird sayi sehv';
end $$;

do $$
declare ok boolean := false;
begin
  begin
    insert into public.students (account_id, class_id, created_by, full_name, display_name, login_code)
    values ('aaaaaaaa-0000-0000-0000-000000000003','cccccccc-0000-0000-0000-000000000003',
            '33333333-3333-3333-3333-333333333333','Sagird 26','S26','REPKOD26');
    assert false, 'repetitor-25 paketi 26-ci sagirdi qebul etdi!';
  exception when check_violation then ok := true;
  end;
  assert ok, 'Paket limiti islemedi';
end $$;
\echo 'OK 10b · repetitor-25 paketi 25-de dayanir'

-- =====================================================================
-- 11. Sagird silinende butun izi gedir (huquqi teleb)
-- =====================================================================
do $$
declare n_att int; n_ans int; n_ses int;
begin
  delete from public.students where id = '55555555-0000-0000-0000-000000000001';
  select count(*) into n_att from public.attempts        where student_id = '55555555-0000-0000-0000-000000000001';
  select count(*) into n_ans from public.attempt_answers aa
    join public.attempts a on a.id = aa.attempt_id where a.student_id = '55555555-0000-0000-0000-000000000001';
  select count(*) into n_ses from public.student_sessions where student_id = '55555555-0000-0000-0000-000000000001';
  assert n_att = 0 and n_ans = 0 and n_ses = 0,
    format('Silinmeden sonra qaliq var: cehd=%s cavab=%s sessiya=%s', n_att, n_ans, n_ses);
end $$;
\echo 'OK 11 · sagird silinende cehdler, cavablar ve sessiyalar da silinir'

reset role;
drop table if exists public.test_fixtures;

\echo ''
\echo '=============================='
\echo ' BUTUN YOXLAMALAR KECDI'
\echo '=============================='
