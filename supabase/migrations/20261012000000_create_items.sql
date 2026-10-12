-- Table des articles : sert à la fois de liste et de catalogue (autocomplétion).
-- checked = false -> dans la liste ; checked = true -> déjà pris / masqué.
create extension if not exists unaccent with schema extensions;

create table public.items (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  search text not null,
  checked boolean not null default false,
  position double precision not null default 0,
  created_at timestamptz not null default now(),
  constraint items_search_key unique (search)
);

-- Recherche « commence par » (insensible à la casse et aux accents)
create index items_search_prefix_idx on public.items (search text_pattern_ops);

create or replace function public.items_set_search()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.name := btrim(regexp_replace(new.name, '\s+', ' ', 'g'));
  new.search := lower(extensions.unaccent('extensions.unaccent'::regdictionary, new.name));
  new.search := replace(replace(replace(new.search, 'œ', 'oe'), 'æ', 'ae'), 'ß', 'ss');
  return new;
end;
$$;

create trigger items_set_search_trg
before insert or update of name on public.items
for each row execute function public.items_set_search();

-- Réordonnancement en un seul appel (drag and drop)
create or replace function public.reorder_items(ids uuid[])
returns void
language sql
set search_path = ''
as $$
  update public.items i
  set position = o.ord
  from unnest(ids) with ordinality as o(id, ord)
  where i.id = o.id;
$$;

alter table public.items enable row level security;

create policy "items_select" on public.items for select to anon, authenticated using (true);
create policy "items_insert" on public.items for insert to anon, authenticated with check (true);
create policy "items_update" on public.items for update to anon, authenticated using (true) with check (true);
create policy "items_delete" on public.items for delete to anon, authenticated using (true);

grant select, insert, update, delete on public.items to anon, authenticated;
grant execute on function public.reorder_items(uuid[]) to anon, authenticated;
