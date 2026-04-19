import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { VenueEditTabs } from '@/components/venues/VenueEditTabs'
import { getVenueCalendarRange } from '@/lib/venue-calendar'
import { buildVenueDateGenreFocusMap } from '@/lib/venue-booking-date'

export const metadata = { title: 'Edit Venue' }

export default async function EditVenuePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const todayIso = new Date().toISOString().slice(0, 10)
  const calendarRange = getVenueCalendarRange(todayIso, 6)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return redirect('/login')

  const [{ data: venue }, { data: genres }, { data: rawVenueGenres }, { data: rawBookingDates }, { data: rawBookings }] = await Promise.all([
    supabase
      .from('venues')
      .select('*')
      .eq('id', id)
      .eq('claimed_by_user_id', user.id)
      .single(),
    supabase.from('genres').select('*').order('name'),
    supabase.from('venue_genres').select('genre_id').eq('venue_id', id),
    supabase
      .from('venue_booking_dates')
      .select('id, show_date, bill_cap, is_closed_to_more_bands, is_unavailable, show_type, genre_focus')
      .eq('venue_id', id)
      .gte('show_date', calendarRange.rangeStart)
      .lte('show_date', calendarRange.rangeEnd)
      .order('show_date'),
    supabase
      .from('bookings')
      .select('venue_booking_date_id, status, bands:band_id ( band_genres ( genres ( name ) ) )')
      .eq('venue_id', id)
      .in('status', ['confirmed', 'cancellation_requested']),
  ])
  const venueGenres = rawVenueGenres as { genre_id: string }[] | null
  const bookingDates = (rawBookingDates ?? []) as Array<{
    id: string
    show_date: string
    bill_cap: number
    is_closed_to_more_bands: boolean
    is_unavailable: boolean
    show_type: import('@/types/database').VenueBookingDate['show_type']
    genre_focus: string | null
  }>
  const bookings = (rawBookings ?? []) as Array<{
    venue_booking_date_id: string
    status: 'confirmed' | 'cancellation_requested' | 'cancelled'
    bands?:
      | {
          band_genres?: Array<{ genres?: { name: string | null } | null }> | null
        }
      | null
  }>
  const automatedGenreFocusByBookingDateId = Object.fromEntries(buildVenueDateGenreFocusMap(bookings))

  if (!venue) return notFound()

  return (
    <VenueEditTabs
      venue={venue}
      genres={genres ?? []}
      selectedGenreIds={(venueGenres ?? []).map((g) => g.genre_id)}
      todayIso={todayIso}
      bookingDates={bookingDates}
      bookings={bookings}
      automatedGenreFocusByBookingDateId={automatedGenreFocusByBookingDateId}
    />
  )
}
