-- =====================================================================
--  02_rls.sql : komekci funksiyalar + setir seviyyeli tehlukesizlik
--
--  Qayda: sagird terefi RLS-e HEC ARXALANMIR. Sagirdin auth hesabi
--  yoxdur, o anon acar ile gelir. Butun sagird emeliyyatlari
--  03_rpc.sql-deki SECURITY DEFINER funksiyalarindan kecir.
--  Buradaki siyasetler yalniz muellim / valideyn / admin ucundur.
-- =====================================================================

-- ------------------------------------------------------ komekci funksiyalar
-- Hamisi SECURITY DEFINER: eks halda students uzerindeki siyaset
-- account_members-i oxuyarken onun oz siyaseti isleyir ve rekursiya olur.

create or replace function app.uid() returns uuid
language sql stable as $$ select auth.uid() $$;

create or replace function app.is_admin() returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role = 'admin'
  )
$$;

create or replace function app.is_account_member(p_account uuid) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1 from public.account_members
    where account_id = p_account and user_id = auth.uid()
  )
$$;

-- Sagirdi kim gore biler:
--   - platforma admini
--   - hesabin uzvu (mekteb lisenziyasinda butun muellimler)
--   - sagirdin sinfinin muellimi
--   - valideyn
--   - oyrenenin ozu (boyuk istifadeci)
create or replace function app.can_read_student(p_student uuid) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1
    from public.students s
    left join public.classes c on c.id = s.class_id
    where s.id = p_student
      and (
           app.is_admin()
        or s.parent_id    = auth.uid()
        or s.self_user_id = auth.uid()
        or s.created_by   = auth.uid()
        or c.teacher_id   = auth.uid()
        or app.is_account_member(s.account_id)
      )
  )
$$;

-- Testi kim redakte ede biler: platforma testini admin, muellim testini sahibi.
create or replace function app.can_manage_test(p_test uuid) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1 from public.tests t
    where t.id = p_test
      and (app.is_admin() or (t.owner_type = 'educator' and t.owner_id = auth.uid()))
  )
$$;

-- Hesabin qüvvede olan abunesi varmi? Odenisli hesabatlarin qapisi.
create or replace function app.has_active_subscription(p_account uuid) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1 from public.subscriptions
    where account_id = p_account
      and status in ('trialing','active')
      and (current_period_end is null or current_period_end > now())
  )
$$;

-- ------------------------------------------------------------- RLS acilir
alter table public.profiles          enable row level security;
alter table public.user_roles        enable row level security;
alter table public.accounts          enable row level security;
alter table public.account_members   enable row level security;
alter table public.schools           enable row level security;
alter table public.programs          enable row level security;
alter table public.subjects          enable row level security;
alter table public.program_subjects  enable row level security;
alter table public.levels            enable row level security;
alter table public.topics            enable row level security;
alter table public.classes           enable row level security;
alter table public.students          enable row level security;
alter table public.consents          enable row level security;
alter table public.tests             enable row level security;
alter table public.questions         enable row level security;
alter table public.question_options  enable row level security;
alter table public.attempts          enable row level security;
alter table public.attempt_answers   enable row level security;
alter table public.student_sessions  enable row level security;
alter table public.plans             enable row level security;
alter table public.subscriptions     enable row level security;
alter table public.payments          enable row level security;

-- ---------------------------------------------------------------- profil
drop policy if exists p_profiles_self on public.profiles;
create policy p_profiles_self on public.profiles
  for select using (id = auth.uid() or app.is_admin());

drop policy if exists p_profiles_upd on public.profiles;
create policy p_profiles_upd on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists p_roles_read on public.user_roles;
create policy p_roles_read on public.user_roles
  for select using (user_id = auth.uid() or app.is_admin());
-- Rol yazmaq yalniz service_role ile (siyaset verilmir).

-- ---------------------------------------------------------------- hesab
drop policy if exists p_accounts_read on public.accounts;
create policy p_accounts_read on public.accounts
  for select using (app.is_account_member(id) or owner_id = auth.uid() or app.is_admin());

drop policy if exists p_accounts_upd on public.accounts;
create policy p_accounts_upd on public.accounts
  for update using (owner_id = auth.uid() or app.is_admin())
  with check  (owner_id = auth.uid() or app.is_admin());

drop policy if exists p_members_read on public.account_members;
create policy p_members_read on public.account_members
  for select using (user_id = auth.uid() or app.is_account_member(account_id) or app.is_admin());

drop policy if exists p_schools_read on public.schools;
create policy p_schools_read on public.schools
  for select using (app.is_account_member(account_id) or app.is_admin());

drop policy if exists p_schools_write on public.schools;
create policy p_schools_write on public.schools
  for all using (app.is_account_member(account_id) or app.is_admin())
  with check  (app.is_account_member(account_id) or app.is_admin());

-- --------------------------------------------------------------- kataloq
-- Kataloq acıqdır: proqram siyahisi giris etmeden de gorunmelidir.
do $$
declare t text;
begin
  foreach t in array array['programs','subjects','program_subjects','levels','topics','plans']
  loop
    execute format('drop policy if exists p_%1$s_read on public.%1$s', t);
    execute format('create policy p_%1$s_read on public.%1$s for select using (true)', t);
    execute format('drop policy if exists p_%1$s_admin on public.%1$s', t);
    execute format('create policy p_%1$s_admin on public.%1$s for all
                      using (app.is_admin()) with check (app.is_admin())', t);
  end loop;
end $$;

-- ----------------------------------------------------------------- sinif
drop policy if exists p_classes_read on public.classes;
create policy p_classes_read on public.classes
  for select using (teacher_id = auth.uid() or app.is_account_member(account_id) or app.is_admin());

drop policy if exists p_classes_write on public.classes;
create policy p_classes_write on public.classes
  for all using (teacher_id = auth.uid() or app.is_account_member(account_id) or app.is_admin())
  with check  (teacher_id = auth.uid() or app.is_account_member(account_id) or app.is_admin());

-- --------------------------------------------------------------- oyrenen
drop policy if exists p_students_read on public.students;
create policy p_students_read on public.students
  for select using (app.can_read_student(id));

drop policy if exists p_students_ins on public.students;
create policy p_students_ins on public.students
  for insert with check (
    app.is_admin()
    or self_user_id = auth.uid()
    or exists (select 1 from public.classes c
               where c.id = class_id and c.teacher_id = auth.uid())
    or app.is_account_member(account_id)
  );

drop policy if exists p_students_upd on public.students;
create policy p_students_upd on public.students
  for update using (app.can_read_student(id)) with check (app.can_read_student(id));

drop policy if exists p_students_del on public.students;
create policy p_students_del on public.students
  for delete using (app.can_read_student(id));

drop policy if exists p_consents_read on public.consents;
create policy p_consents_read on public.consents
  for select using (app.can_read_student(student_id));

drop policy if exists p_consents_ins on public.consents;
create policy p_consents_ins on public.consents
  for insert with check (app.can_read_student(student_id));

-- ------------------------------------------------------------------ test
-- Derc olunmuş platforma testleri hamiya gorunur (kataloq).
-- Muellim testi yalniz sahibine ve hesab uzvlerine.
drop policy if exists p_tests_read on public.tests;
create policy p_tests_read on public.tests
  for select using (
       (owner_type = 'platform' and status = 'published')
    or app.is_admin()
    or owner_id = auth.uid()
    or exists (select 1 from public.classes c
               where c.id = tests.class_id
                 and (c.teacher_id = auth.uid() or app.is_account_member(c.account_id)))
  );

drop policy if exists p_tests_ins on public.tests;
create policy p_tests_ins on public.tests
  for insert with check (
       app.is_admin()
    or (owner_type = 'educator' and owner_id = auth.uid())
  );

drop policy if exists p_tests_upd on public.tests;
create policy p_tests_upd on public.tests
  for update using (app.can_manage_test(id)) with check (app.can_manage_test(id));

drop policy if exists p_tests_del on public.tests;
create policy p_tests_del on public.tests
  for delete using (app.can_manage_test(id));

-- Suallar ve variantlar: YALNIZ testin sahibi. Sagird bunlari gormur -
-- cunki duzgun cavab burdadir. Sagird suallari RPC ile alir.
drop policy if exists p_questions_all on public.questions;
create policy p_questions_all on public.questions
  for all using (app.can_manage_test(test_id)) with check (app.can_manage_test(test_id));

drop policy if exists p_options_all on public.question_options;
create policy p_options_all on public.question_options
  for all using (exists (select 1 from public.questions q
                         where q.id = question_id and app.can_manage_test(q.test_id)))
  with check  (exists (select 1 from public.questions q
                       where q.id = question_id and app.can_manage_test(q.test_id)));

-- ---------------------------------------------------------------- cehdler
-- Yalniz oxumaq. Yazmaq RPC-nin isidir.
drop policy if exists p_attempts_read on public.attempts;
create policy p_attempts_read on public.attempts
  for select using (app.can_read_student(student_id));

drop policy if exists p_answers_read on public.attempt_answers;
create policy p_answers_read on public.attempt_answers
  for select using (exists (select 1 from public.attempts a
                            where a.id = attempt_id and app.can_read_student(a.student_id)));

-- student_sessions: hec bir siyaset yoxdur. Yalniz definer funksiyalar.

-- ---------------------------------------------------------------- odenis
drop policy if exists p_subs_read on public.subscriptions;
create policy p_subs_read on public.subscriptions
  for select using (app.is_account_member(account_id) or app.is_admin());

drop policy if exists p_payments_read on public.payments;
create policy p_payments_read on public.payments
  for select using (app.is_account_member(account_id) or app.is_admin());
-- Abune ve odenis yazmaq yalniz service_role ile (shluz webhook-u).

-- ============================================================= yer limiti
--  Repetitor paketleri sagird sayina gore satilir. Limit bazada tetbiq
--  olunur - frontend-e etibar edilmir.

create or replace function app.account_student_count(p_account uuid) returns int
language sql stable security definer set search_path = public, pg_temp as $$
  select count(*)::int from public.students
  where account_id = p_account and is_active
$$;

-- Abunesiz hesabin pulsuz sagird heddi.
create or replace function app.free_seat_limit() returns int
language sql immutable as $$ select 5 $$;

-- Hesabin ala bileceyi maksimum sagird sayi.
-- Abune yoxdursa pulsuz hedd tetbiq olunur.
create or replace function app.account_seat_limit(p_account uuid) returns int
language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce(
    (select case
              when p.max_students is null then 2147483647
              else greatest(p.max_students, s.seats)
            end
       from public.subscriptions s
       join public.plans p on p.id = s.plan_id
      where s.account_id = p_account
        and s.status in ('trialing','active')
        and (s.current_period_end is null or s.current_period_end > now())
      order by coalesce(p.max_students, 2147483647) desc
      limit 1),
    app.free_seat_limit()
  )
$$;

create or replace function app.enforce_seat_limit() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_used  int;
  v_limit int;
begin
  if tg_op = 'UPDATE' and new.account_id = old.account_id
     and new.is_active = old.is_active then
    return new;
  end if;
  if not new.is_active then
    return new;
  end if;

  v_used  := app.account_student_count(new.account_id);
  v_limit := app.account_seat_limit(new.account_id);

  if v_used >= v_limit then
    raise exception
      'Paketin sagird limiti dolub (% / %). Paketi genislendirin.', v_used, v_limit
      using errcode = 'check_violation';
  end if;
  return new;
end $$;

drop trigger if exists trg_students_seat_limit on public.students;
create trigger trg_students_seat_limit
  before insert or update on public.students
  for each row execute function app.enforce_seat_limit();
