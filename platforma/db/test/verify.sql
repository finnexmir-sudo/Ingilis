-- =====================================================================
--  verify.sql - qurulusun duzgunluyunu yoxlayir.
--  Supabase SQL Editor-a yapisdirib isletmek olar: hec ne deyismir,
--  yalniz oxuyur.
-- =====================================================================
with
tabs as (
  select count(*)::int n from information_schema.tables
   where table_schema='public' and table_type='BASE TABLE'),
norls as (
  select coalesce(string_agg(relname, ', '), '-') s
    from pg_class c join pg_namespace n on n.oid=c.relnamespace
   where n.nspname='public' and c.relkind='r' and not c.relrowsecurity),
pol as (select count(*)::int n from pg_policies where schemaname='public'),
expected(fn) as (values
  ('rpc_student_login'),('rpc_student_tests'),('rpc_start_attempt'),
  ('rpc_submit_attempt'),('rpc_leaderboard'),
  ('rpc_my_context'),('rpc_create_account'),('rpc_create_class'),
  ('rpc_add_student'),('rpc_reset_student_code')),
missing as (
  select coalesce(string_agg(fn, ', '), '-') s from expected
   where fn not in (select p.proname from pg_proc p
                      join pg_namespace n on n.oid=p.pronamespace
                     where n.nspname='public')),
trg as (
  select count(*)::int n from pg_trigger
   where tgname in ('trg_auth_user_created','trg_students_seat_limit')
     and not tgisinternal),
seed as (
  select (select count(*) from public.programs)::int p,
         (select count(*) from public.subjects)::int s,
         (select count(*) from public.levels)::int l,
         (select count(*) from public.plans)::int pl),
leak as (
  select coalesce(string_agg(distinct table_name, ', '), '-') s
    from information_schema.role_table_grants
   where grantee='anon' and table_schema='public'
     and table_name in ('students','question_options','questions',
                        'attempts','attempt_answers','student_sessions','consents'))
select * from (
  select 1 ord, 'Cedvel sayi'          k, tabs.n::text v,
         case when tabs.n=22 then 'OK' else 'GOZLENILEN 22' end d from tabs
  union all select 2, 'RLS acilmayan',   norls.s,
         case when norls.s='-' then 'OK' else 'PROBLEM' end from norls
  union all select 3, 'RLS siyaseti',    pol.n::text,
         case when pol.n>=38 then 'OK' else 'AZDIR - 02 islenmeyib?' end from pol
  union all select 4, 'Catismayan RPC',  missing.s,
         case when missing.s='-' then 'OK' else 'PROBLEM - 03/06 islenmeyib?' end from missing
  union all select 5, 'Trigerler',       trg.n::text,
         case when trg.n=2 then 'OK' else 'PROBLEM - 06 islenmeyib?' end from trg
  union all select 6, 'Seed: proqram/fenn/seviyye/paket',
         seed.p||' / '||seed.s||' / '||seed.l||' / '||seed.pl,
         case when seed.p>=5 and seed.s>=10 and seed.l>=15 and seed.pl>=7
              then 'OK' else 'PROBLEM - 04 islenmeyib?' end from seed
  union all select 7, 'anon-a acilan hessas cedvel', leak.s,
         case when leak.s='-' then 'OK' else 'TEHLUKE - 05 EN SONDA islenmelidir' end from leak
) z order by ord;
