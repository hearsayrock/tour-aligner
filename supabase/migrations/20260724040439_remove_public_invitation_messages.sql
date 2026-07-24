-- Initial outreach belongs in the private chat between the venue and artist.
-- Remove the legacy system messages that exposed invitations to every accepted artist in Backstage.
delete from public.backstage_messages
where sender_kind = 'system'
  and sender_band_id is null
  and body like 'Venue invited % to this event.';
