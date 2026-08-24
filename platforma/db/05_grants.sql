-- =====================================================================
--  05_grants.sql : huquqlar - EN SONDA islenmelidir
--
--  Supabase public sxemdeki her seyi default olaraq anon/authenticated-e
--  verir. Bu fayl o defaultlari geri alir. RLS ile birlikde iki qat
--  mudafie: siyaset sizsa bele huquq yoxdur.
--
--  DIQQET: bu fayl her migrasiyadan SONRA yeniden islenmelidir - yeni
--  cedvel elave olunanda Supabase ona da default huquq verir.
-- =====================================================================

revoke insert, update, delete on public.programs, public.subjects,
       public.program_subjects, public.levels, public.topics, public.plans,
       public.subscriptions, public.payments, public.user_roles,
       public.attempts, public.attempt_answers
  from anon, authenticated;

revoke all on public.student_sessions from anon, authenticated;
revoke all on public.question_options from anon;
revoke all on public.questions        from anon;
revoke all on public.students         from anon;
revoke all on public.consents         from anon;

-- Sagird terefi hec bir cedvele birbasa toxunmur - yalniz RPC.
revoke all on public.attempts, public.attempt_answers from anon;
revoke all on public.tests from anon;
revoke all on public.classes, public.accounts, public.account_members from anon;
revoke all on public.profiles, public.schools, public.subscriptions, public.payments from anon;
