-- Agenda des repas : un repas = un jour, un titre, une description et des aliments.
-- Les aliments sont des noms d'articles ; ils sont ajoutés à la liste de courses par l'application.
create table if not exists public.meals (
  id uuid primary key default gen_random_uuid(),
  day date not null,
  title text not null check (char_length(btrim(title)) between 1 and 120),
  description text not null default '' check (char_length(description) <= 2000),
  foods text[] not null default '{}' check (cardinality(foods) <= 60),
  created_at timestamptz not null default now()
);

create index if not exists meals_day_idx on public.meals (day);

alter table public.meals enable row level security;

-- Pas de connexion dans l'application : accès ouvert, comme pour items et loyalty_cards.
create policy meals_select on public.meals for select to anon, authenticated using (true);
create policy meals_insert on public.meals for insert to anon, authenticated with check (true);
create policy meals_update on public.meals for update to anon, authenticated using (true) with check (true);
create policy meals_delete on public.meals for delete to anon, authenticated using (true);

grant select, insert, update, delete on public.meals to anon, authenticated;
