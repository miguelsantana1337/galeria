alter table public.face_descriptors drop constraint if exists face_descriptors_descriptor_check;
alter table public.face_descriptors add constraint face_descriptors_descriptor_check check (array_length(descriptor, 1) = 1024);

alter table public.events add column if not exists description text;
alter table public.events add column if not exists cover_path text;
alter table public.events add column if not exists published_at timestamptz;
alter table public.events drop constraint if exists events_match_threshold_check;
alter table public.events alter column match_threshold set default 0.55;
alter table public.events add constraint events_match_threshold_check check (match_threshold between 0.35 and 0.85);

create or replace function public.publish_event(target_id uuid, publish boolean)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  update public.events
  set status = case when publish then 'published'::public.event_status else 'draft'::public.event_status end,
      published_at = case when publish then now() else null end,
      updated_at = now()
  where id = target_id and owner_id = auth.uid();
end; $$;
