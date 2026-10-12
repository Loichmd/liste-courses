-- Cartes de fidélité : nom du magasin + numéro de carte.
create table public.loyalty_cards (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  number text not null default '' check (char_length(number) <= 64),
  created_at timestamptz not null default now()
);

alter table public.loyalty_cards enable row level security;

create policy "loyalty_cards_select" on public.loyalty_cards for select to anon, authenticated using (true);
create policy "loyalty_cards_insert" on public.loyalty_cards for insert to anon, authenticated with check (true);
create policy "loyalty_cards_update" on public.loyalty_cards for update to anon, authenticated using (true) with check (true);
create policy "loyalty_cards_delete" on public.loyalty_cards for delete to anon, authenticated using (true);

grant select, insert, update, delete on public.loyalty_cards to anon, authenticated;
