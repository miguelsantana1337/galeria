drop policy if exists "owners upload event photos" on storage.objects;
drop policy if exists "owners read event photos" on storage.objects;
drop policy if exists "owners delete event photos" on storage.objects;

create policy "owners upload event photos"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'event-photos'
  and exists (
    select 1
    from public.events e
    where e.id::text = (storage.foldername(storage.objects.name))[1]
      and e.owner_id = auth.uid()
  )
);

create policy "owners read event photos"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'event-photos'
  and exists (
    select 1
    from public.events e
    where e.id::text = (storage.foldername(storage.objects.name))[1]
      and e.owner_id = auth.uid()
  )
);

create policy "owners delete event photos"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'event-photos'
  and exists (
    select 1
    from public.events e
    where e.id::text = (storage.foldername(storage.objects.name))[1]
      and e.owner_id = auth.uid()
  )
);
