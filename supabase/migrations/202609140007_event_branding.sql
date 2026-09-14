alter table public.events add column if not exists description text;
alter table public.events add column if not exists banner_path text;
alter table public.events add column if not exists organizer_logos jsonb not null default '[]'::jsonb;

alter table public.events drop constraint if exists events_organizer_logos_limit;
alter table public.events add constraint events_organizer_logos_limit
check (jsonb_typeof(organizer_logos) = 'array' and jsonb_array_length(organizer_logos) <= 5);
