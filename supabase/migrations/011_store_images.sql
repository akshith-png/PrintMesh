alter table public.merchants
  add column if not exists image_url text;

insert into storage.buckets (id, name, public)
values ('store-images', 'store-images', true)
on conflict (id) do update set public = true;

create policy store_images_service_insert on storage.objects for insert to service_role with check (bucket_id = 'store-images');
create policy store_images_service_select on storage.objects for select to service_role using (bucket_id = 'store-images');
create policy store_images_service_update on storage.objects for update to service_role using (bucket_id = 'store-images');
create policy store_images_service_delete on storage.objects for delete to service_role using (bucket_id = 'store-images');
