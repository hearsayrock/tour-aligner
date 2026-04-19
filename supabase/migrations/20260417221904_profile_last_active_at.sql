alter table public.profiles
  add column if not exists last_active_at timestamptz;

comment on column public.profiles.last_active_at is
  'Most recent time the user was active in the app for messaging and presence UX.';
