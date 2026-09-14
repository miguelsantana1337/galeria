create extension if not exists pgcrypto;

create type public.event_status as enum ('draft', 'processing', 'published', 'archived');

create table public.events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 3 and 100),
  slug text not null unique check (slug ~ '^[a-z0-9-]{3,60}$'),
  event_date date,
  status public.event_status not null default 'draft',
  match_threshold real not null default 0.48 check (match_threshold between 0.3 and 0.8),
  photo_count integer not null default 0 check (photo_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.photos (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  storage_path text not null unique,
  original_name text not null,
  width integer,
  height integer,
  face_count integer not null default 0,
  status text not null default 'processing' check (status in ('processing','ready','failed')),
  created_at timestamptz not null default now()
);

create table public.face_descriptors (
  id uuid primary key default gen_random_uuid(),
  photo_id uuid not null references public.photos(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  descriptor real[] not null check (array_length(descriptor, 1) = 128),
  detection_score real,
  created_at timestamptz not null default now()
);

create index face_descriptors_event_idx on public.face_descriptors(event_id);
create index photos_event_idx on public.photos(event_id);
alter table public.events enable row level security;
alter table public.photos enable row level security;
alter table public.face_descriptors enable row level security;

create policy "owners manage events" on public.events for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "owners manage photos" on public.photos for all to authenticated using (exists (select 1 from public.events e where e.id = event_id and e.owner_id = auth.uid())) with check (exists (select 1 from public.events e where e.id = event_id and e.owner_id = auth.uid()));
create policy "owners manage descriptors" on public.face_descriptors for all to authenticated using (exists (select 1 from public.events e where e.id = event_id and e.owner_id = auth.uid())) with check (exists (select 1 from public.events e where e.id = event_id and e.owner_id = auth.uid()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('event-photos', 'event-photos', false, 15728640, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

create policy "owners upload event photos" on storage.objects for insert to authenticated with check (bucket_id = 'event-photos' and exists (select 1 from public.events e where e.id::text = (storage.foldername(name))[1] and e.owner_id = auth.uid()));
create policy "owners read event photos" on storage.objects for select to authenticated using (bucket_id = 'event-photos' and exists (select 1 from public.events e where e.id::text = (storage.foldername(name))[1] and e.owner_id = auth.uid()));
create policy "owners delete event photos" on storage.objects for delete to authenticated using (bucket_id = 'event-photos' and exists (select 1 from public.events e where e.id::text = (storage.foldername(name))[1] and e.owner_id = auth.uid()));

create or replace function public.update_event_photo_count() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.events set photo_count = (select count(*) from public.photos where event_id = coalesce(new.event_id, old.event_id)), updated_at = now() where id = coalesce(new.event_id, old.event_id);
  return coalesce(new, old);
end; $$;
create trigger photos_update_count after insert or delete on public.photos for each row execute function public.update_event_photo_count();
