-- =====================================================================
--  Tehsil platformasi - sxem
--  01_schema.sql : tiplar, cedveller, indeksler
--
--  Prinsipler:
--   1. Sexsi melumat YALNIZ students cedvelinde. Bir setir silinende
--      qalan her sey ON DELETE CASCADE ile ardinca gedir.
--   2. Usagin auth hesabi YOXDUR. O, muellimin verdiyi kodla girir.
--      Boyuk oyrenen (MIQ, sertifikasiya) ise self_user_id ile baglanir.
--   3. programs -> levels quruluşu hem sinifi (1..11), hem de imtahan
--      kateqoriyasini (miq, sertifikasiya) daşiyir. Genişlenme ucun.
--   4. Duzgun cavab (question_options.is_correct) sagird terefine
--      hec vaxt gonderilmir - bax 03_rpc.sql.
-- =====================================================================

create extension if not exists pgcrypto;

-- Daxili komekci funksiyalar ucun ayrica sxem. PostgREST-e acilmir.
create schema if not exists app;

-- ---------------------------------------------------------------- tiplar
do $$ begin
  create type app_role       as enum ('admin','teacher','tutor','parent','learner');
  create type account_type   as enum ('parent','tutor','school','individual');
  create type group_kind     as enum ('school_class','tutor_group','self_study');
  -- 'educator' = muellim VE YA repetitor. Platforma testinden ferqlendirir.
  create type test_owner     as enum ('platform','educator');
  create type content_status as enum ('draft','published','archived');
  create type question_kind  as enum ('single','multi','text');
  create type attempt_status as enum ('in_progress','submitted','expired');
  create type sub_status     as enum ('trialing','active','past_due','canceled','expired');
exception when duplicate_object then null; end $$;

-- ------------------------------------------------------------ istifadeci
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text        not null default '',
  phone       text,
  locale      text        not null default 'az',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.user_roles (
  user_id uuid     not null references public.profiles(id) on delete cascade,
  role    app_role not null,
  primary key (user_id, role)
);

-- ---------------------------------------------------------------- hesab
-- Odeyen teref. Valideyn de ola biler, mekteb de.
create table if not exists public.accounts (
  id         uuid primary key default gen_random_uuid(),
  type       account_type not null,
  name       text         not null,
  owner_id   uuid         not null references public.profiles(id) on delete restrict,
  created_at timestamptz  not null default now()
);

create table if not exists public.account_members (
  account_id uuid    not null references public.accounts(id) on delete cascade,
  user_id    uuid    not null references public.profiles(id) on delete cascade,
  is_admin   boolean not null default false,
  primary key (account_id, user_id)
);

create table if not exists public.schools (
  id         uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  name       text not null,
  city       text,
  created_at timestamptz not null default now()
);

-- -------------------------------------------------------------- kataloq
-- program = tehsil kateqoriyasi: ibtidai / buraxilis / miq / sertifikasiya
create table if not exists public.programs (
  id        uuid primary key default gen_random_uuid(),
  slug      text not null unique,
  name      text not null,
  sort      int  not null default 0,
  is_active boolean not null default true
);

create table if not exists public.subjects (
  id   uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  sort int  not null default 0
);

create table if not exists public.program_subjects (
  program_id uuid not null references public.programs(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  primary key (program_id, subject_id)
);

-- level = programin daxili pilləsi. Ibtidaide '1'..'4', buraxilisda
-- '9'..'11', MIQ-de 'ibtidai' / 'riyaziyyat-muellimi' ve s.
create table if not exists public.levels (
  id         uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  code       text not null,
  name       text not null,
  sort       int  not null default 0,
  unique (program_id, code)
);

-- Zeif noqte analizi ucun mövzu agaci. Her sual bir mövzuya baglanir.
create table if not exists public.topics (
  id         uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects(id) on delete cascade,
  parent_id  uuid references public.topics(id) on delete cascade,
  level_id   uuid references public.levels(id) on delete set null,
  slug       text not null,
  name       text not null,
  sort       int  not null default 0,
  unique (subject_id, slug)
);

-- ------------------------------------------------------------ sinif/qrup
--  Mekteb sinfi de, repetitor qrupu da eyni cedveldedir - ferq kind-dedir.
--  Repetitor qrupunda school_id bos qalir, teacher_id repetitorun ozudur.
create table if not exists public.classes (
  id         uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  school_id  uuid references public.schools(id) on delete set null,
  teacher_id uuid not null references public.profiles(id) on delete restrict,
  kind       group_kind not null default 'school_class',
  program_id uuid references public.programs(id) on delete set null,
  level_id   uuid references public.levels(id) on delete set null,
  name       text not null,
  join_code  text not null unique,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------- oyrenen
--  DIQQET: sexsi melumatin YEGANE yeri budur.
--  Usaq  -> class_id + created_by dolu, self_user_id bos
--  Boyuk -> self_user_id dolu, class_id bos ola biler
create table if not exists public.students (
  id           uuid primary key default gen_random_uuid(),
  account_id   uuid not null references public.accounts(id) on delete cascade,
  class_id     uuid references public.classes(id) on delete set null,
  created_by   uuid references public.profiles(id) on delete set null,
  parent_id    uuid references public.profiles(id) on delete set null,
  self_user_id uuid references public.profiles(id) on delete cascade,
  full_name    text not null,                 -- PII
  display_name text not null,                 -- lovhede gorunen ad
  birth_year   smallint,                      -- tam dogum tarixi saxlanmir
  login_code   text not null unique,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  constraint students_birth_year_ck
    check (birth_year is null or birth_year between 1900 and 2100),
  constraint students_owner_ck
    check (self_user_id is not null or created_by is not null)
);

-- Valideyn razilgi - huquqi teleb. Silinme talebi geldikde sened qalir.
create table if not exists public.consents (
  id         uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  granted_by uuid references public.profiles(id) on delete set null,
  kind       text not null,                   -- 'parental' | 'terms'
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  evidence   jsonb not null default '{}'::jsonb
);

-- ----------------------------------------------------------------- test
create table if not exists public.tests (
  id                uuid primary key default gen_random_uuid(),
  owner_type        test_owner not null default 'platform',
  owner_id          uuid references public.profiles(id) on delete cascade,
  class_id          uuid references public.classes(id) on delete cascade,
  program_id        uuid not null references public.programs(id) on delete restrict,
  subject_id        uuid not null references public.subjects(id) on delete restrict,
  level_id          uuid references public.levels(id) on delete set null,
  slug              text unique,
  title             text not null,
  description       text not null default '',
  is_free           boolean not null default true,
  status            content_status not null default 'draft',
  time_limit_sec    int,
  shuffle_questions boolean not null default true,
  shuffle_options   boolean not null default true,
  pass_percent      smallint not null default 60,
  max_attempts      smallint not null default 0,   -- 0 = limitsiz
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint tests_owner_ck check (
       (owner_type = 'platform' and owner_id is null and class_id is null)
    or (owner_type = 'educator' and owner_id is not null)
  ),
  constraint tests_pass_ck check (pass_percent between 0 and 100)
);

create table if not exists public.questions (
  id          uuid primary key default gen_random_uuid(),
  test_id     uuid not null references public.tests(id) on delete cascade,
  topic_id    uuid references public.topics(id) on delete set null,
  ord         int  not null default 0,
  kind        question_kind not null default 'single',
  body        text not null,
  media_url   text,
  explanation text not null default '',
  difficulty  smallint not null default 2,
  points      numeric(5,2) not null default 1,
  created_at  timestamptz not null default now(),
  constraint questions_difficulty_ck check (difficulty between 1 and 5),
  unique (test_id, ord)
);

--  is_correct sutunu sagird terefine hec vaxt getmir.
--  Sagird suallari yalniz app.rpc_start_attempt() vasitesile gorur.
create table if not exists public.question_options (
  id          uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  ord         int  not null default 0,
  body        text not null,
  is_correct  boolean not null default false,
  unique (question_id, ord)
);

-- ------------------------------------------------------------- cehdler
create table if not exists public.attempts (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references public.students(id) on delete cascade,
  test_id     uuid not null references public.tests(id) on delete cascade,
  class_id    uuid references public.classes(id) on delete set null,
  status      attempt_status not null default 'in_progress',
  started_at  timestamptz not null default now(),
  finished_at timestamptz,
  duration_sec int,
  score       numeric(7,2),
  max_score   numeric(7,2),
  percent     numeric(5,2)
);

create table if not exists public.attempt_answers (
  id                  uuid primary key default gen_random_uuid(),
  attempt_id          uuid not null references public.attempts(id) on delete cascade,
  question_id         uuid not null references public.questions(id) on delete cascade,
  topic_id            uuid references public.topics(id) on delete set null,
  selected_option_ids uuid[] not null default '{}',
  text_answer         text,
  is_correct          boolean,
  points              numeric(5,2) not null default 0,
  answered_at         timestamptz not null default now(),
  unique (attempt_id, question_id)
);

-- Sagird sessiyasi. Token xam saxlanmir - yalniz SHA-256 ozeti.
create table if not exists public.student_sessions (
  token_hash text primary key,
  student_id uuid not null references public.students(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

-- ---------------------------------------------------------------- odenis
--  audience: bu plan kime satilir. Repetitor plani sagird sayina gore
--  qiymetlenir - price_minor esas haqq, price_per_seat_minor her sagird ucun.
create table if not exists public.plans (
  id                   uuid primary key default gen_random_uuid(),
  slug                 text not null unique,
  name                 text not null,
  audience             account_type not null default 'parent',
  price_minor          int  not null default 0,     -- qepikle, esas haqq
  price_per_seat_minor int  not null default 0,     -- qepikle, her sagird ucun
  max_students         int,                          -- null = limitsiz
  currency             char(3) not null default 'AZN',
  period               text not null default 'month',
  features             jsonb not null default '{}'::jsonb,
  is_active            boolean not null default true,
  sort                 int  not null default 0,
  constraint plans_seats_ck check (max_students is null or max_students > 0)
);

create table if not exists public.subscriptions (
  id                 uuid primary key default gen_random_uuid(),
  account_id         uuid not null references public.accounts(id) on delete cascade,
  plan_id            uuid not null references public.plans(id) on delete restrict,
  status             sub_status not null default 'trialing',
  seats              int not null default 1,        -- alinmis sagird yeri
  started_at         timestamptz not null default now(),
  current_period_end timestamptz,
  cancel_at          timestamptz,
  provider           text,
  provider_ref       text,
  created_at         timestamptz not null default now()
);

-- Epoint ve s. ucun hazir. raw sutunu shluzun tam cavabini saxlayir.
create table if not exists public.payments (
  id              uuid primary key default gen_random_uuid(),
  account_id      uuid not null references public.accounts(id) on delete cascade,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  provider        text not null,
  provider_ref    text,
  amount_minor    int  not null,
  currency        char(3) not null default 'AZN',
  status          text not null default 'pending',
  raw             jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  unique (provider, provider_ref)
);

-- ------------------------------------------------------------- indeksler
create index if not exists idx_students_class     on public.students(class_id);
create index if not exists idx_students_account   on public.students(account_id);
create index if not exists idx_students_parent    on public.students(parent_id);
create index if not exists idx_students_self      on public.students(self_user_id);
create index if not exists idx_classes_teacher    on public.classes(teacher_id);
create index if not exists idx_classes_kind       on public.classes(kind);
create index if not exists idx_classes_account    on public.classes(account_id);
create index if not exists idx_tests_catalog      on public.tests(program_id, subject_id, level_id) where status = 'published';
create index if not exists idx_tests_owner        on public.tests(owner_id) where owner_type = 'educator';
create index if not exists idx_tests_class        on public.tests(class_id);
create index if not exists idx_questions_test     on public.questions(test_id, ord);
create index if not exists idx_options_question   on public.question_options(question_id, ord);
create index if not exists idx_attempts_student   on public.attempts(student_id, test_id);
create index if not exists idx_attempts_class     on public.attempts(class_id) where status = 'submitted';
create index if not exists idx_answers_attempt    on public.attempt_answers(attempt_id);
create index if not exists idx_answers_topic      on public.attempt_answers(topic_id);
create index if not exists idx_sessions_expiry    on public.student_sessions(expires_at);
create index if not exists idx_subs_account       on public.subscriptions(account_id, status);
create index if not exists idx_topics_subject     on public.topics(subject_id, parent_id);

-- ------------------------------------------------------------- trigerler
create or replace function app.touch_updated_at() returns trigger
language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists trg_profiles_touch on public.profiles;
create trigger trg_profiles_touch before update on public.profiles
  for each row execute function app.touch_updated_at();

drop trigger if exists trg_tests_touch on public.tests;
create trigger trg_tests_touch before update on public.tests
  for each row execute function app.touch_updated_at();
