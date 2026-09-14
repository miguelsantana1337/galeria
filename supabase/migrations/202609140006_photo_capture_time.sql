alter table public.photos add column if not exists taken_at timestamptz;
alter table public.photos add column if not exists taken_at_source text check (taken_at_source in ('exif','file'));
create index if not exists photos_event_taken_at_idx on public.photos(event_id, taken_at);
