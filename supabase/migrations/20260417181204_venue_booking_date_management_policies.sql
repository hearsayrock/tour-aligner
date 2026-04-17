-- ============================================================
-- TourAligner — Venue booking date management policies
-- Migration: 20260417181204
-- ============================================================

create policy "venue_booking_dates: insert claimed owner"
  on public.venue_booking_dates for insert
  to authenticated
  with check (
    auth.uid() = (select claimed_by_user_id from public.venues where id = venue_id)
    or public.is_admin()
  );

create policy "venue_booking_dates: update claimed owner"
  on public.venue_booking_dates for update
  to authenticated
  using (
    auth.uid() = (select claimed_by_user_id from public.venues where id = venue_id)
    or public.is_admin()
  )
  with check (
    auth.uid() = (select claimed_by_user_id from public.venues where id = venue_id)
    or public.is_admin()
  );
