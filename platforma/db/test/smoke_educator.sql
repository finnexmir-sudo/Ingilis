-- =====================================================================
--  smoke_educator.sql : muellim / repetitor axini
-- =====================================================================
\set ON_ERROR_STOP on
set client_min_messages = warning;

truncate public.attempt_answers, public.attempts, public.student_sessions,
         public.consents, public.students, public.question_options,
         public.questions, public.tests, public.classes, public.subscriptions,
         public.payments, public.account_members, public.accounts,
         public.user_roles, public.profiles cascade;
delete from auth.users;

-- Qeydiyyat: Supabase auth.users-e yazir, qalanini trigger edir
insert into auth.users (id, email, raw_user_meta_data) values
  ('aaaa0000-0000-0000-0000-000000000001','repetitor@test.az','{"full_name":"Leyla Muellim"}'),
  ('bbbb0000-0000-0000-0000-000000000002','ozge@test.az','{"full_name":"Ozge Sexs"}');

do $$
declare nm text;
begin
  select full_name into nm from public.profiles where id = 'aaaa0000-0000-0000-0000-000000000001';
  assert nm = 'Leyla Muellim', format('Trigger adi goturmedi: %s', nm);
end $$;
\echo 'OK  1 · qeydiyyatda profil avtomatik yaranir, ad meta-dan goturulur'

-- =====================================================================
set role authenticated;
set request.jwt.claim.sub = 'aaaa0000-0000-0000-0000-000000000001';

--  2. Hesab yaratmaq
do $$
declare v jsonb; n int;
begin
  v := public.rpc_create_account('tutor', 'Leyla Muellim - repetitorluq');
  assert v->>'id' is not null, 'Hesab yaranmadi';

  select count(*) into n from public.account_members
   where account_id = (v->>'id')::uuid and user_id = auth.uid() and is_admin;
  assert n = 1, 'Uzvluk qurulmadi';

  select count(*) into n from public.user_roles
   where user_id = auth.uid() and role = 'tutor';
  assert n = 1, 'tutor rolu verilmedi';
end $$;
\echo 'OK  2 · hesab + uzvluk + rol bir emeliyyatda qurulur'

--  3. accounts cedveline BIRBASA yazmaq mumkun deyil
do $$
declare ok boolean := false;
begin
  begin
    insert into public.accounts (type, name, owner_id)
    values ('school','Uydurma mekteb', auth.uid());
    assert false, 'accounts cedveline birbasa yazildi - siyaset bosluqludur!';
  exception when insufficient_privilege then ok := true;
  end;
  assert ok, 'Gozlenilen icaze xetasi gelmedi';
end $$;
\echo 'OK  3 · accounts cedveline birbasa insert baglidir'

--  4. Qrup yaratmaq, qosulma kodu serverde
do $$
declare v jsonb; c text;
begin
  v := public.rpc_create_class(
        (select id from public.accounts where owner_id = auth.uid()),
        'Cume qrupu', 'tutor_group', 'ibtidai', '3');
  c := v->>'join_code';
  assert length(c) = 8, format('Kod uzunlugu sehv: %s', c);
  assert c !~ '[OIL01]', format('Kodda qarisdirilan simvol var: %s', c);
  assert (select level_id from public.classes where id = (v->>'id')::uuid) is not null,
         'Seviyye baglanmadi';
end $$;
\echo 'OK  4 · qrup yaranir, kod serverde ve qarisiq simvolsuz'

--  5. Basqasinin hesabinda qrup yaratmaq olmaz
reset role;
insert into public.accounts (id, type, name, owner_id)
values ('cccc0000-0000-0000-0000-000000000009','tutor','Ozgenin hesabi','bbbb0000-0000-0000-0000-000000000002');
insert into public.account_members values
  ('cccc0000-0000-0000-0000-000000000009','bbbb0000-0000-0000-0000-000000000002',true);
set role authenticated;
set request.jwt.claim.sub = 'aaaa0000-0000-0000-0000-000000000001';

do $$
declare ok boolean := false;
begin
  begin
    perform public.rpc_create_class('cccc0000-0000-0000-0000-000000000009','Oğurluq qrup');
    assert false, 'Basqasinin hesabinda qrup yaradildi!';
  exception when insufficient_privilege then ok := true;
  end;
  assert ok, 'Icaze xetasi gelmedi';
end $$;
\echo 'OK  5 · basqasinin hesabinda qrup yaratmaq baglidir'

--  6. Sagird elave etmek, giris kodu, gorunen ad
do $$
declare v jsonb; cls uuid;
begin
  select id into cls from public.classes where teacher_id = auth.uid() limit 1;

  v := public.rpc_add_student(cls, 'Aysu Memmedova');
  assert v->>'display_name' = 'Aysu M.', format('Gorunen ad sehv: %s', v->>'display_name');
  assert length(v->>'login_code') = 8, 'Giris kodu sehv';

  v := public.rpc_add_student(cls, 'Kenan Aliyev', 'Pelenq');
  assert v->>'display_name' = 'Pelenq', 'Verilen leqeb istifade olunmadi';
end $$;
\echo 'OK  6 · sagird elave olunur, leqeb ve kod duzgun'

--  7. Kod tekrarlanmir
do $$
declare cls uuid; i int; n int;
begin
  select id into cls from public.classes where teacher_id = auth.uid() limit 1;
  for i in 1..3 loop
    perform public.rpc_add_student(cls, 'Sagird '||i);
  end loop;
  select count(distinct login_code) into n from public.students;
  assert n = (select count(*) from public.students), 'Giris kodu tekrarlandi!';
end $$;
\echo 'OK  7 · giris kodlari unikaldir'

--  8. Pulsuz hedd panel axininda da isleyir
do $$
declare cls uuid; ok boolean := false;
begin
  select id into cls from public.classes where teacher_id = auth.uid() limit 1;
  begin
    perform public.rpc_add_student(cls, 'Altinci Sagird');
    assert false, 'Pulsuz hedd asildi!';
  exception when check_violation then ok := true;
  end;
  assert ok, 'Limit xetasi gelmedi';
end $$;
\echo 'OK  8 · pulsuz hedd (5) panel axininda tetbiq olunur'

--  9. Kontekst sorgusu paket vezziyyetini duzgun qaytarir
do $$
declare v jsonb; a jsonb;
begin
  v := public.rpc_my_context();
  assert jsonb_array_length(v->'accounts') = 1, 'Hesab sayi sehv';
  a := v->'accounts'->0;
  assert (a->>'students_used')::int  = 5, format('Istifade sehv: %s', a->>'students_used');
  assert (a->>'students_limit')::int = 5, format('Hedd sehv: %s', a->>'students_limit');
  assert a->'plan' = 'null'::jsonb, 'Abune yoxdur, amma plan gelir';
  assert v->'roles' @> '["tutor"]'::jsonb, 'Rol siyahisi sehv';
end $$;
\echo 'OK  9 · kontekst: istifade / hedd / plan duzgun'

-- 10. Paket alindiqda hedd genislenir
reset role;
insert into public.subscriptions (account_id, plan_id, status, current_period_end)
select (select id from public.accounts where owner_id = 'aaaa0000-0000-0000-0000-000000000001'),
       id, 'active', now() + interval '30 days'
  from public.plans where slug = 'repetitor-25';
set role authenticated;
set request.jwt.claim.sub = 'aaaa0000-0000-0000-0000-000000000001';

do $$
declare v jsonb; cls uuid;
begin
  v := public.rpc_my_context();
  assert (v->'accounts'->0->>'students_limit')::int = 25, 'Paketden sonra hedd genislenmedi';
  assert v->'accounts'->0->'plan'->>'slug' = 'repetitor-25', 'Plan adi gelmedi';

  select id into cls from public.classes where teacher_id = auth.uid() limit 1;
  perform public.rpc_add_student(cls, 'Altinci Sagird');
  assert app.account_student_count((v->'accounts'->0->>'id')::uuid) = 6, 'Sagird elave olunmadi';
end $$;
\echo 'OK 10 · paket alindiqda hedd genislenir ve sagird elave olunur'

-- 11. Kod yenilenende kohne sessiya baglanir
do $$
declare st uuid; old_code text; new_code text; tok text; ok boolean := false;
begin
  select id, login_code into st, old_code from public.students
   where full_name = 'Aysu Memmedova';

  tok := public.rpc_student_login(old_code)->>'token';
  assert app.session_student(tok) = st, 'Sessiya qurulmadi';

  new_code := public.rpc_reset_student_code(st)->>'login_code';
  assert new_code <> old_code, 'Kod deyismedi';
  assert app.session_student(tok) is null, 'Kohne sessiya hele de qüvvededir!';

  begin
    perform public.rpc_student_login(old_code);
    assert false, 'Kohne kodla giris hele de isleyir!';
  exception when no_data_found then ok := true;
  end;
  assert ok, 'Kohne kod ret edilmedi';
end $$;
\echo 'OK 11 · kod yenilenende kohne kod ve sessiya derhal baglanir'

-- 12. Ozge muellim bu qrupun sagirdlerini gormur
set request.jwt.claim.sub = 'bbbb0000-0000-0000-0000-000000000002';
do $$
declare n int;
begin
  select count(*) into n from public.students;
  assert n = 0, format('Ozge muellim %s sagird gordu!', n);
  select count(*) into n from public.classes;
  assert n = 0, format('Ozge muellim %s qrup gordu!', n);
end $$;
\echo 'OK 12 · ozge muellim bu qrupu ve sagirdleri gormur'

reset role;
\echo ''
\echo '=============================='
\echo ' MUELLIM AXINI: HAMISI KECDI'
\echo '=============================='
