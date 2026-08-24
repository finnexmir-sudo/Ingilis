-- =====================================================================
--  05_grants.sql : huquqlar - HER MIQRASIYADAN SONRA ISLEDILIR
--
--  Yanasma: evvelce her seyi bagla, sonra yalniz lazim olani ver.
--  Bele olanda fayllarin isledilme sirasi ehemiyyet kesb etmir -
--  netice hemise eynidir. Siyahi ile "geri al" yanasmasi kovrek idi:
--  Supabase yeni cedvele avtomatik huquq verir ve siyahida olmayan
--  cedvel sessizce aciq qalirdi.
--
--  RLS ile birlikde iki qat mudafie: siyaset sizsa bele huquq yoxdur.
-- =====================================================================

-- ------------------------------------------------------- 1. hamisini bagla
revoke all on all tables    in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

-- Geleceke: Supabase yeni cedvele default huquq vermesin.
alter default privileges in schema public revoke all on tables    from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
do $$ begin
  execute 'alter default privileges for role postgres in schema public
             revoke all on tables from anon, authenticated';
  execute 'alter default privileges for role postgres in schema public
             revoke all on sequences from anon, authenticated';
exception when others then null;   -- lokal yoxlamada postgres rolu ferqli ola biler
end $$;

-- --------------------------------------------------- 2. kataloq - hamiya
-- Proqram/fenn/seviyye siyahisi giris etmeden de gorunmelidir.
grant select on public.programs, public.subjects, public.program_subjects,
                public.levels, public.topics, public.plans
  to anon, authenticated;

-- ------------------------------------------ 3. muellim/valideyn - oxumaq
-- RLS setirleri suzur; bu grant yalniz "cedvele baxa biler" deməkdir.
grant select on public.profiles, public.user_roles, public.accounts,
                public.account_members, public.schools, public.classes,
                public.students, public.consents, public.tests,
                public.questions, public.question_options,
                public.attempts, public.attempt_answers,
                public.subscriptions, public.payments
  to authenticated;

-- ------------------------------------------- 4. muellim - yazmaq huququ
grant insert, update, delete on public.classes, public.schools,
                                public.tests, public.questions,
                                public.question_options
  to authenticated;

grant update, delete on public.students to authenticated;
grant insert          on public.consents to authenticated;
grant update          on public.profiles to authenticated;
grant update          on public.accounts to authenticated;

-- students-e INSERT bilerekden verilmir: sagird yalniz rpc_add_student()
-- ile elave olunur ki, giris kodu hemise serverde yaransin.

-- ------------------------------------------------------- 5. baglі qalanlar
--  student_sessions  - yalniz SECURITY DEFINER funksiyalar
--  accounts INSERT   - yalniz rpc_create_account()
--  subscriptions/payments yazmaq - yalniz service_role (shluz webhook-u)
--  anon ucun HEC BIR cedvel - sagird terefi tamamile RPC ile isleyir

-- ------------------------------------------------------------ 6. hesabat
do $$
declare leak text;
begin
  select string_agg(distinct table_name, ', ') into leak
    from information_schema.role_table_grants
   where grantee = 'anon' and table_schema = 'public'
     and table_name not in ('programs','subjects','program_subjects',
                            'levels','topics','plans');
  if leak is not null then
    raise exception 'anon-a hele de aciq cedveller var: %', leak;
  end if;
  raise notice 'Huquqlar quruldu: anon yalniz kataloqu gorur.';
end $$;
