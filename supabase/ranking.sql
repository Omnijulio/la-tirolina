-- Ranking compartido de La Trolina Fighters.
-- Pegar entero en Supabase → SQL Editor → New query → Run.
-- Cualquiera con el juego puede LEER el ranking y APUNTARSE; nadie puede editar ni borrar
-- desde el juego (eso solo desde el panel de Supabase).

create table if not exists public.ranking (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null check (char_length(name) between 1 and 14),
  score integer not null check (score between 0 and 5000000),
  fighter text not null check (char_length(fighter) between 1 and 20),
  mode text not null check (mode in ('story', 'quick', 'wild', 'online')),
  difficulty text check (char_length(difficulty) <= 12),
  won boolean not null default false,
  rounds text check (char_length(rounds) <= 5),
  vs text check (char_length(vs) <= 30),
  version text check (char_length(version) <= 12)
);

create index if not exists ranking_score_idx on public.ranking (score desc, created_at);

alter table public.ranking enable row level security;

drop policy if exists "ranking_leer" on public.ranking;
create policy "ranking_leer" on public.ranking
  for select to anon, authenticated using (true);

drop policy if exists "ranking_apuntarse" on public.ranking;
create policy "ranking_apuntarse" on public.ranking
  for insert to anon, authenticated with check (true);

grant select, insert on table public.ranking to anon, authenticated;
