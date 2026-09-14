alter table public.events add column if not exists share_token uuid not null default gen_random_uuid();
alter table public.events add column if not exists welcome_message text;
alter table public.events add column if not exists brand_color text not null default '#235c3a';
alter table public.events add column if not exists whatsapp_url text;
alter table public.events add column if not exists instagram_url text;
alter table public.events add column if not exists expires_at timestamptz;
alter table public.events add column if not exists retention_days integer not null default 30 check (retention_days between 1 and 365);
create unique index if not exists events_share_token_idx on public.events(share_token);

create table if not exists public.gallery_activity (
  id bigint generated always as identity primary key,
  event_id uuid not null references public.events(id) on delete cascade,
  kind text not null check (kind in ('view','selfie','match','no_match','download')),
  photo_count integer check (photo_count is null or photo_count >= 0),
  created_at timestamptz not null default now()
);
create index if not exists gallery_activity_event_created_idx on public.gallery_activity(event_id, created_at desc);
alter table public.gallery_activity enable row level security;
create policy "owners read gallery activity" on public.gallery_activity for select to authenticated
using (exists (select 1 from public.events e where e.id = event_id and e.owner_id = auth.uid()));

create table if not exists public.gallery_consents (
  id bigint generated always as identity primary key,
  event_id uuid not null references public.events(id) on delete cascade,
  policy_version text not null,
  created_at timestamptz not null default now()
);
create index if not exists gallery_consents_event_created_idx on public.gallery_consents(event_id, created_at desc);
alter table public.gallery_consents enable row level security;
create policy "owners read consent totals" on public.gallery_consents for select to authenticated
using (exists (select 1 from public.events e where e.id = event_id and e.owner_id = auth.uid()));

update public.events set expires_at = coalesce(expires_at, now() + make_interval(days => retention_days));

create or replace function public.rotate_event_share_token(target_id uuid)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare new_token uuid := gen_random_uuid();
begin
  update public.events set share_token = new_token, updated_at = now()
  where id = target_id and owner_id = auth.uid();
  if not found then raise exception 'event not found'; end if;
  return new_token;
end; $$;
