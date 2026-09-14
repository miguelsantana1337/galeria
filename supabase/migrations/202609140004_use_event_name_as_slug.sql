update public.events e
set slug = 'workshop-flores-e-cafe', updated_at = now()
where slug = '1234'
  and lower(name) = lower('Workshop Flores e Café')
  and not exists (
    select 1 from public.events existing
    where existing.slug = 'workshop-flores-e-cafe'
      and existing.id <> e.id
  );
