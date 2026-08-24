-- =====================================================================
--  06_educator_rpc.sql : muellim / repetitor terefi
--
--  Qeydiyyat -> hesab -> qrup -> sagird axini.
--  Giris kodu SERVERDE yaradilir: unikalliq ve elifba nezareti
--  frontend-e buraxilmir.
-- =====================================================================

-- --------------------------------------------------- yeni istifadeci
-- Supabase auth.users-e setir elave edende profil ozu yaransin.
create or replace function app.handle_new_user() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists trg_auth_user_created on auth.users;
create trigger trg_auth_user_created
  after insert on auth.users
  for each row execute function app.handle_new_user();

-- ------------------------------------------------------- giris kodu
--  Qarisdirilan simvollar yoxdur: 0/O, 1/I/L teseduf etmir.
create or replace function app.gen_login_code(p_len int default 8) returns text
language plpgsql volatile as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  out text := '';
  i int;
begin
  for i in 1..p_len loop
    out := out || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
  end loop;
  return out;
end $$;

-- --------------------------------------------------------- kontekst
--  Panel aciланда bir sorgu ile her seyi alir: profil, hesablar,
--  sagird sayi ve paket heddi.
create or replace function public.rpc_my_context()
returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Daxil olmamisiniz.' using errcode = '28000';
  end if;

  return jsonb_build_object(
    'user_id', v_uid,
    'profile', (select jsonb_build_object('full_name', p.full_name, 'phone', p.phone)
                  from public.profiles p where p.id = v_uid),
    'roles',   coalesce((select jsonb_agg(role) from public.user_roles where user_id = v_uid), '[]'::jsonb),
    'accounts', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id',    a.id,
               'type',  a.type,
               'name',  a.name,
               'is_owner', a.owner_id = v_uid,
               'students_used',  app.account_student_count(a.id),
               'students_limit', app.account_seat_limit(a.id),
               'plan', (select jsonb_build_object('slug', pl.slug, 'name', pl.name)
                          from public.subscriptions s2
                          join public.plans pl on pl.id = s2.plan_id
                         where s2.account_id = a.id
                           and s2.status in ('trialing','active')
                           and (s2.current_period_end is null or s2.current_period_end > now())
                         order by s2.started_at desc limit 1)
             ) order by a.name)
        from public.accounts a
        join public.account_members m on m.account_id = a.id and m.user_id = v_uid
    ), '[]'::jsonb)
  );
end $$;

-- ----------------------------------------------------- hesab yaratmaq
--  accounts cedvelinde INSERT siyaseti bilerekden yoxdur - hesab yalniz
--  bu funksiya ile yaranir ki, uzvluk ve rol da eyni anda qurulsun.
create or replace function public.rpc_create_account(p_type text, p_name text)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid  uuid := auth.uid();
  v_acc  uuid;
  v_role app_role;
begin
  if v_uid is null then
    raise exception 'Daxil olmamisiniz.' using errcode = '28000';
  end if;
  if p_type not in ('parent','tutor','school','individual') then
    raise exception 'Hesab tipi yanlisdir.' using errcode = '22023';
  end if;
  if coalesce(btrim(p_name), '') = '' then
    raise exception 'Ad bos ola bilmez.' using errcode = '22023';
  end if;

  insert into public.accounts (type, name, owner_id)
  values (p_type::account_type, btrim(p_name), v_uid)
  returning id into v_acc;

  insert into public.account_members (account_id, user_id, is_admin)
  values (v_acc, v_uid, true);

  v_role := case p_type when 'tutor'  then 'tutor'
                        when 'school' then 'teacher'
                        when 'parent' then 'parent'
                        else 'learner' end;
  insert into public.user_roles (user_id, role) values (v_uid, v_role)
  on conflict do nothing;

  return jsonb_build_object('id', v_acc, 'type', p_type, 'name', btrim(p_name));
end $$;

-- ------------------------------------------------------ qrup yaratmaq
create or replace function public.rpc_create_class(
  p_account_id uuid, p_name text, p_kind text default 'tutor_group',
  p_program_slug text default null, p_level_code text default null)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid   uuid := auth.uid();
  v_class uuid;
  v_code  text;
  v_prog  uuid;
  v_level uuid;
  i int;
begin
  if v_uid is null then
    raise exception 'Daxil olmamisiniz.' using errcode = '28000';
  end if;
  if not app.is_account_member(p_account_id) then
    raise exception 'Bu hesaba giris huququnuz yoxdur.' using errcode = '42501';
  end if;
  if coalesce(btrim(p_name), '') = '' then
    raise exception 'Qrup adi bos ola bilmez.' using errcode = '22023';
  end if;
  if p_kind not in ('school_class','tutor_group','self_study') then
    raise exception 'Qrup tipi yanlisdir.' using errcode = '22023';
  end if;

  if p_program_slug is not null then
    select id into v_prog from public.programs where slug = p_program_slug;
    if p_level_code is not null and v_prog is not null then
      select id into v_level from public.levels
       where program_id = v_prog and code = p_level_code;
    end if;
  end if;

  for i in 1..20 loop
    v_code := app.gen_login_code(8);
    exit when not exists (select 1 from public.classes where join_code = v_code);
    v_code := null;
  end loop;
  if v_code is null then
    raise exception 'Qosulma kodu yaradila bilmedi, yeniden cehd edin.';
  end if;

  insert into public.classes (account_id, teacher_id, kind, name, join_code, program_id, level_id)
  values (p_account_id, v_uid, p_kind::group_kind, btrim(p_name), v_code, v_prog, v_level)
  returning id into v_class;

  return jsonb_build_object('id', v_class, 'name', btrim(p_name), 'join_code', v_code);
end $$;

-- ---------------------------------------------------- sagird elave etmek
create or replace function public.rpc_add_student(
  p_class_id uuid, p_full_name text, p_display_name text default null,
  p_birth_year int default null)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid     uuid := auth.uid();
  v_class   public.classes%rowtype;
  v_code    text;
  v_student uuid;
  v_disp    text;
  i int;
begin
  if v_uid is null then
    raise exception 'Daxil olmamisiniz.' using errcode = '28000';
  end if;

  select * into v_class from public.classes where id = p_class_id;
  if not found then
    raise exception 'Qrup tapilmadi.' using errcode = 'no_data_found';
  end if;
  if v_class.teacher_id <> v_uid and not app.is_account_member(v_class.account_id) then
    raise exception 'Bu qrupa sagird elave ede bilmezsiniz.' using errcode = '42501';
  end if;
  if coalesce(btrim(p_full_name), '') = '' then
    raise exception 'Sagird adi bos ola bilmez.' using errcode = '22023';
  end if;

  -- Gorunen ad verilmeyibse addan ilk soz + soyadin bas herfi
  v_disp := nullif(btrim(coalesce(p_display_name, '')), '');
  if v_disp is null then
    v_disp := split_part(btrim(p_full_name), ' ', 1);
    if split_part(btrim(p_full_name), ' ', 2) <> '' then
      v_disp := v_disp || ' ' || upper(left(split_part(btrim(p_full_name), ' ', 2), 1)) || '.';
    end if;
  end if;

  for i in 1..20 loop
    v_code := app.gen_login_code(8);
    exit when not exists (select 1 from public.students where login_code = v_code);
    v_code := null;
  end loop;
  if v_code is null then
    raise exception 'Giris kodu yaradila bilmedi, yeniden cehd edin.';
  end if;

  -- Yer limiti trigger-i burada isleyir; limit dolubsa check_violation atir.
  insert into public.students
    (account_id, class_id, created_by, full_name, display_name, birth_year, login_code)
  values
    (v_class.account_id, p_class_id, v_uid, btrim(p_full_name), v_disp, p_birth_year, v_code)
  returning id into v_student;

  return jsonb_build_object('id', v_student, 'full_name', btrim(p_full_name),
                            'display_name', v_disp, 'login_code', v_code);
end $$;

-- ------------------------------------------------------- kodu yenilemek
create or replace function public.rpc_reset_student_code(p_student_id uuid)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_code text; i int;
begin
  if not app.can_read_student(p_student_id) then
    raise exception 'Bu sagirde giris huququnuz yoxdur.' using errcode = '42501';
  end if;
  for i in 1..20 loop
    v_code := app.gen_login_code(8);
    exit when not exists (select 1 from public.students where login_code = v_code);
    v_code := null;
  end loop;
  if v_code is null then
    raise exception 'Kod yaradila bilmedi.';
  end if;

  update public.students set login_code = v_code where id = p_student_id;
  -- Kohne kodla acilmis sessiyalar derhal baglanir
  delete from public.student_sessions where student_id = p_student_id;

  return jsonb_build_object('id', p_student_id, 'login_code', v_code);
end $$;

-- ---------------------------------------------------------------- huquq
do $$
declare fn text;
begin
  foreach fn in array array[
    'public.rpc_my_context()',
    'public.rpc_create_account(text, text)',
    'public.rpc_create_class(uuid, text, text, text, text)',
    'public.rpc_add_student(uuid, text, text, int)',
    'public.rpc_reset_student_code(uuid)']
  loop
    execute format('revoke all on function %s from public', fn);
    if exists (select 1 from pg_roles where rolname = 'authenticated') then
      execute format('grant execute on function %s to authenticated', fn);
    end if;
  end loop;
end $$;
