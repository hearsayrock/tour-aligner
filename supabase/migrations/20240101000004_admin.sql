-- ============================================================
-- TourAligner — Admin Support
-- Migration: 20240101000004
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- Add is_admin flag to profiles
-- ─────────────────────────────────────────────────────────────
alter table public.profiles
  add column if not exists is_admin boolean not null default false;

-- Seed the initial admin
update public.profiles
set is_admin = true
where id = (select id from auth.users where email = 'nate@natesdesign.com');

-- ─────────────────────────────────────────────────────────────
-- Helper: is the current user an admin?
-- Used in RLS policies below.
-- ─────────────────────────────────────────────────────────────
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select coalesce(
    (select is_admin from public.profiles where id = auth.uid()),
    false
  );
$$;

-- ─────────────────────────────────────────────────────────────
-- PROFILES — admin can read all profiles
-- ─────────────────────────────────────────────────────────────
create policy "profiles: admin select all"
  on public.profiles for select
  using (public.is_admin());

-- ─────────────────────────────────────────────────────────────
-- BANDS — admin can read all bands (including inactive)
-- ─────────────────────────────────────────────────────────────
create policy "bands: admin select all"
  on public.bands for select
  using (public.is_admin());

create policy "bands: admin update any"
  on public.bands for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ─────────────────────────────────────────────────────────────
-- VENUES — admin can read/write all venues (including inactive)
-- ─────────────────────────────────────────────────────────────
create policy "venues: admin select all"
  on public.venues for select
  using (public.is_admin());

create policy "venues: admin update any"
  on public.venues for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "venues: admin insert"
  on public.venues for insert
  to authenticated
  with check (public.is_admin());

-- ─────────────────────────────────────────────────────────────
-- VENUE CLAIMS — admin can read and update all claims
-- (approve / reject pending claims)
-- ─────────────────────────────────────────────────────────────
create policy "venue_claims: admin select all"
  on public.venue_claims for select
  to authenticated
  using (public.is_admin());

create policy "venue_claims: admin update any"
  on public.venue_claims for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ─────────────────────────────────────────────────────────────
-- BOOKING INQUIRIES — admin read-only visibility across all
-- ─────────────────────────────────────────────────────────────
create policy "booking_inquiries: admin select all"
  on public.booking_inquiries for select
  to authenticated
  using (public.is_admin());
