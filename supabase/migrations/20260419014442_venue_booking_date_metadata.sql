alter table public.venue_booking_dates
  add column if not exists show_type text
    check (show_type in ('open_bill', 'touring_package', 'local_showcase', 'festival', 'private_event', 'special_event')),
  add column if not exists genre_focus text;
