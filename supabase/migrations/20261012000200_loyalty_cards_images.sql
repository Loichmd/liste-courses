-- Logo de l'enseigne et photo de la carte : chemins des fichiers dans le bucket privé card-images.
alter table public.loyalty_cards
  add column logo_path text check (logo_path is null or char_length(logo_path) <= 200),
  add column photo_path text check (photo_path is null or char_length(photo_path) <= 200);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('card-images', 'card-images', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "card_images_select" on storage.objects for select to anon, authenticated using (bucket_id = 'card-images');
create policy "card_images_insert" on storage.objects for insert to anon, authenticated with check (bucket_id = 'card-images');
create policy "card_images_update" on storage.objects for update to anon, authenticated using (bucket_id = 'card-images') with check (bucket_id = 'card-images');
create policy "card_images_delete" on storage.objects for delete to anon, authenticated using (bucket_id = 'card-images');
