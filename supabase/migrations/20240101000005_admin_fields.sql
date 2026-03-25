-- ============================================================
-- TourAligner — Admin Fields
-- Migration: 20240101000005
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- Add email to profiles (synced from auth.users)
-- ─────────────────────────────────────────────────────────────
alter table public.profiles
  add column if not exists email text;

-- Backfill existing users
update public.profiles p
set email = (select email from auth.users where id = p.id);

-- Update handle_new_user to also copy email on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.email
  );
  return new;
end;
$$;

-- Keep email in sync when user changes their email in auth
create or replace function public.handle_user_email_change()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row when (old.email is distinct from new.email)
  execute procedure public.handle_user_email_change();

-- ─────────────────────────────────────────────────────────────
-- Add is_suspended to profiles
-- ─────────────────────────────────────────────────────────────
alter table public.profiles
  add column if not exists is_suspended boolean not null default false;

-- Admin can update any profile (suspend/unsuspend)
create policy "profiles: admin update any"
  on public.profiles for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ─────────────────────────────────────────────────────────────
-- Add is_unlisted to venues
-- ─────────────────────────────────────────────────────────────
alter table public.venues
  add column if not exists is_unlisted boolean not null default false;

-- Admin delete for venue_claims (allows revoking claims)
create policy "venue_claims: admin delete any"
  on public.venue_claims for delete
  to authenticated
  using (public.is_admin());
