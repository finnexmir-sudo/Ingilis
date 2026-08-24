-- Yalniz LOKAL YOXLAMA ucun. Supabase-de bunlar artiq var - orada isletme.
-- Meqsed: sxemi ve RLS-i real Postgres uzerinde isledib yoxlamaq.
create schema if not exists auth;
create schema if not exists app;

create table if not exists auth.users (
  id    uuid primary key default gen_random_uuid(),
  email text unique
);

-- Supabase-deki auth.uid() eynisi: JWT-deki sub iddiasini oxuyur.
create or replace function auth.uid() returns uuid
language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

do $$ begin
  create role anon          nologin;
  create role authenticated nologin;
  create role service_role  nologin bypassrls;
exception when duplicate_object then null; end $$;

grant usage on schema public to anon, authenticated, service_role;
grant usage on schema app    to anon, authenticated, service_role;
alter default privileges in schema public
  grant select, insert, update, delete on tables to anon, authenticated;
