-- =========================================================
-- FantaMultiple - Script tabelle e permessi per Supabase
-- Incollalo in: SQL Editor → New query → Run
-- Se usi un'email admin diversa, sostituisci admin@fantamultiple.it
-- (compare 6 volte, in fondo) prima di premere Run.
-- =========================================================

create table if not exists public.teams (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  city        text,
  color       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz
);

create table if not exists public.athletes (
  id          uuid primary key default gen_random_uuid(),
  first_name  text not null,
  last_name   text not null,
  gender      text not null check (gender in ('M','F')),
  category    text not null check (category in ('ALL','JUN','PRO','ASS')),
  birth_year  int,
  team_id     uuid references public.teams(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz
);

create table if not exists public.competitions (
  id          uuid primary key default gen_random_uuid(),
  athlete_id  uuid not null references public.athletes(id) on delete cascade,
  gender      text not null check (gender in ('M','F')),
  category    text not null,
  event_key   text not null,
  date        date,
  location    text,
  notes       text,
  hand_timed  boolean not null default false,
  results     jsonb not null default '{}',
  points      jsonb not null default '{}',
  total       int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz
);

create index if not exists athletes_team_idx on public.athletes(team_id);
create index if not exists competitions_athlete_idx on public.competitions(athlete_id);

-- ---------- Sicurezza: tutti leggono, solo l'admin scrive ----------
alter table public.teams        enable row level security;
alter table public.athletes     enable row level security;
alter table public.competitions enable row level security;

drop policy if exists "lettura pubblica" on public.teams;
drop policy if exists "lettura pubblica" on public.athletes;
drop policy if exists "lettura pubblica" on public.competitions;
create policy "lettura pubblica" on public.teams        for select using (true);
create policy "lettura pubblica" on public.athletes     for select using (true);
create policy "lettura pubblica" on public.competitions for select using (true);

drop policy if exists "scrittura admin" on public.teams;
drop policy if exists "scrittura admin" on public.athletes;
drop policy if exists "scrittura admin" on public.competitions;
create policy "scrittura admin" on public.teams for all to authenticated
  using ((auth.jwt() ->> 'email') = 'admin@fantamultiple.it')
  with check ((auth.jwt() ->> 'email') = 'admin@fantamultiple.it');
create policy "scrittura admin" on public.athletes for all to authenticated
  using ((auth.jwt() ->> 'email') = 'admin@fantamultiple.it')
  with check ((auth.jwt() ->> 'email') = 'admin@fantamultiple.it');
create policy "scrittura admin" on public.competitions for all to authenticated
  using ((auth.jwt() ->> 'email') = 'admin@fantamultiple.it')
  with check ((auth.jwt() ->> 'email') = 'admin@fantamultiple.it');

-- Permessi di accesso tramite API (le regole sopra decidono chi può fare cosa)
grant usage on schema public to anon, authenticated;
grant select on public.teams, public.athletes, public.competitions to anon, authenticated;
grant insert, update, delete on public.teams, public.athletes, public.competitions to authenticated;
