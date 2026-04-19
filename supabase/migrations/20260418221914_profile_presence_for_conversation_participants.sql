create policy "profiles: select conversation participants"
  on public.profiles for select
  to authenticated
  using (
    exists (
      select 1
      from public.contact_threads thread
      left join public.bands partner_band on partner_band.id = thread.band_id
      left join public.venues partner_venue on partner_venue.id = thread.venue_id
      where (
        auth.uid() = partner_band.user_id
        or auth.uid() = partner_venue.claimed_by_user_id
      )
      and (
        profiles.id = partner_band.user_id
        or profiles.id = partner_venue.claimed_by_user_id
      )
    )
  );
