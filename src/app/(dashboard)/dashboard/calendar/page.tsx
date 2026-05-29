import { cookies } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { CalendarDays, MapPin, Mic2, PencilLine, Plus, Search } from 'lucide-react'
import { ArtistCalendarWorkspace } from '@/components/calendar/ArtistCalendarWorkspace'
import { ProfileSelectionModal } from '@/components/dashboard/ProfileSelectionModal'
import { VenueAvailabilityManager } from '@/components/venues/VenueAvailabilityManager'
import { ButtonLink, EmptyState, PageHeader } from '@/components/ui/primitives'
import {
  buildArtistEventActivity,
  buildArtistEventMarker,
  buildShowDateActivity,
  buildShowDateMarker,
  buildVenueEventActivity,
  buildVenueEventMarker,
  type CalendarActivity,
  type CalendarDayMarker,
  type CalendarEventRecord,
} from '@/lib/calendar-activity'
import { buildVenueDateGenreFocusMap } from '@/lib/venue-booking-date'
import { getVenueCalendarRange } from '@/lib/venue-calendar'
import {
  ACTIVE_IDENTITY_COOKIE,
  parseIdentityValue,
  resolveRequiredActiveIdentity,
  type ManagedIdentity,
} from '@/lib/managed-identity'
import { createClient } from '@/lib/supabase/server'
import type { EventArtistMembership, VenueBookingDate } from '@/types/database'

export const metadata = { title: 'Calendar' }

type SearchParams = Promise<{ profile?: string }>

function appendCalendarItem<T>(record: Record<string, T[]>, date: string, item: T) {
  record[date] = [...(record[date] ?? []), item]
}

function activeIdentityFromQuery(profileValue: string | undefined, identities: ManagedIdentity[]) {
  const parsed = parseIdentityValue(profileValue)
  if (!parsed || parsed.kind === 'all') return null
  return identities.find((identity) => identity.kind === parsed.kind && identity.id === parsed.id) ?? null
}

export default async function DashboardCalendarPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const filters = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return redirect('/login')

  const [{ data: rawBands }, { data: rawVenues }] = await Promise.all([
    supabase.from('bands').select('id, name').eq('user_id', user.id).eq('is_active', true).order('name'),
    supabase.from('venues').select('id, name').eq('claimed_by_user_id', user.id).eq('is_active', true).order('name'),
  ])

  const identities: ManagedIdentity[] = [
    ...((rawBands ?? []) as Array<{ id: string; name: string }>).map((band) => ({
      kind: 'band' as const,
      id: band.id,
      name: band.name,
      href: `/dashboard/bands/${band.id}/edit`,
    })),
    ...((rawVenues ?? []) as Array<{ id: string; name: string }>).map((venue) => ({
      kind: 'venue' as const,
      id: venue.id,
      name: venue.name,
      href: `/dashboard/venues/${venue.id}/edit`,
    })),
  ]

  if (identities.length === 0) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <PageHeader
          eyebrow="Calendar"
          title="Calendar workspace"
          description="Add an artist profile or claim a venue to start using the shared calendar workspace."
        />
        <EmptyState
          title="No profiles to schedule yet"
          description="Calendars are tied to managed artist and venue profiles."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <ButtonLink href="/dashboard/bands/new">
                <Mic2 className="h-4 w-4" />
                Add Artist
              </ButtonLink>
              <ButtonLink href="/dashboard/venues" tone="secondary">
                <MapPin className="h-4 w-4" />
                Claim or Add Venue
              </ButtonLink>
            </div>
          }
        />
      </div>
    )
  }

  const cookieStore = await cookies()
  const requestedIdentity = activeIdentityFromQuery(filters.profile, identities)
  const resolvedIdentity = resolveRequiredActiveIdentity(cookieStore.get(ACTIVE_IDENTITY_COOKIE)?.value, identities)
  const activeIdentity = requestedIdentity ?? resolvedIdentity.activeIdentity

  if (!requestedIdentity && resolvedIdentity.requiresSelection) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <PageHeader
          eyebrow="Calendar"
          title="Choose a profile"
          description="This calendar follows one artist or venue profile at a time."
        />
        <ProfileSelectionModal
          title="Select a profile to view Calendar"
          body="Use the profile selector in the nav to choose the artist or venue calendar you want to work in."
          identities={identities}
        />
      </div>
    )
  }

  if (!activeIdentity) return notFound()

  const todayIso = new Date().toISOString().slice(0, 10)
  const calendarRange = getVenueCalendarRange(todayIso, 6)

  if (activeIdentity.kind === 'venue') {
    const [{ data: venue }, { data: rawBookingDates }, { data: rawBookings }, { data: rawEvents }] = await Promise.all([
      supabase
        .from('venues')
        .select('id, name, slug, default_bill_cap')
        .eq('id', activeIdentity.id)
        .eq('claimed_by_user_id', user.id)
        .single(),
      supabase
        .from('venue_booking_dates')
        .select('id, show_date, bill_cap, is_closed_to_more_bands, is_unavailable, show_type, genre_focus')
        .eq('venue_id', activeIdentity.id)
        .gte('show_date', calendarRange.rangeStart)
        .lte('show_date', calendarRange.rangeEnd)
        .order('show_date'),
      supabase
        .from('bookings')
        .select('venue_booking_date_id, status, bands:band_id ( band_genres ( genres ( name ) ) )')
        .eq('venue_id', activeIdentity.id)
        .in('status', ['confirmed', 'cancellation_requested']),
      supabase
        .from('events')
        .select('id, title, slug, event_date, status, is_accepting_artists, needed_artist_count, event_artist_memberships(status)')
        .eq('venue_id', activeIdentity.id)
        .gte('event_date', calendarRange.rangeStart)
        .lte('event_date', calendarRange.rangeEnd)
        .order('event_date'),
    ])

    if (!venue) return notFound()

    const bookingDates = (rawBookingDates ?? []) as Array<
      Pick<VenueBookingDate, 'id' | 'show_date' | 'bill_cap' | 'is_closed_to_more_bands' | 'is_unavailable' | 'show_type' | 'genre_focus'>
    >
    const bookings = (rawBookings ?? []) as Array<{
      venue_booking_date_id: string
      status: 'confirmed' | 'cancellation_requested' | 'cancelled'
      bands?:
        | {
            band_genres?: Array<{ genres?: { name: string | null } | null }> | null
          }
        | null
    }>
    const events = ((rawEvents ?? []) as Array<CalendarEventRecord>).map((event) => ({
      ...event,
      venues: { name: venue.name },
    }))
    const automatedGenreFocusByBookingDateId = Object.fromEntries(buildVenueDateGenreFocusMap(bookings))
    const markersByDate: Record<string, CalendarDayMarker[]> = {}
    const activitiesByDate: Record<string, CalendarActivity[]> = {}

    for (const event of events) {
      appendCalendarItem(markersByDate, event.event_date, buildVenueEventMarker(event))
      appendCalendarItem(activitiesByDate, event.event_date, buildVenueEventActivity(event))
    }

    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <PageHeader
          eyebrow="Calendar"
          title={`${venue.name} Calendar`}
          description="Availability settings and event workspaces now live together here, outside the venue profile editor."
          actions={
            <>
              <ButtonLink href="/dashboard/events/new">
                <Plus className="h-4 w-4" />
                Create Event
              </ButtonLink>
              <ButtonLink href={`/dashboard/venues/${venue.id}/edit`} tone="secondary">
                <PencilLine className="h-4 w-4" />
                Edit Venue Info
              </ButtonLink>
            </>
          }
        />

        <VenueAvailabilityManager
          venueId={venue.id}
          venueSlug={venue.slug}
          defaultBillCap={venue.default_bill_cap}
          todayIso={todayIso}
          bookingDates={bookingDates}
          bookings={bookings}
          automatedGenreFocusByBookingDateId={automatedGenreFocusByBookingDateId}
          showHeader={false}
          markersByDate={markersByDate}
          activitiesByDate={activitiesByDate}
        />
      </div>
    )
  }

  const [{ data: band }, { data: rawShowDates }, { data: rawMemberships }] = await Promise.all([
    supabase
      .from('bands')
      .select('id, name, slug')
      .eq('id', activeIdentity.id)
      .eq('user_id', user.id)
      .single(),
    supabase
      .from('band_show_dates')
      .select('id, show_date, venue_name, city, state, ticket_url')
      .eq('band_id', activeIdentity.id)
      .gte('show_date', calendarRange.rangeStart)
      .lte('show_date', calendarRange.rangeEnd)
      .order('show_date'),
    supabase
      .from('event_artist_memberships')
      .select(`
        id,
        status,
        events(
          id,
          title,
          slug,
          event_date,
          status,
          is_accepting_artists,
          needed_artist_count,
          venues(name, location_city, location_state),
          event_artist_memberships(status)
        )
      `)
      .eq('band_id', activeIdentity.id)
      .neq('status', 'removed'),
  ])

  if (!band) return notFound()

  const markersByDate: Record<string, CalendarDayMarker[]> = {}
  const activitiesByDate: Record<string, CalendarActivity[]> = {}
  const showDates = (rawShowDates ?? []) as Array<{
    id: string
    show_date: string
    venue_name: string
    city: string
    state: string
    ticket_url: string | null
  }>

  for (const showDate of showDates) {
    appendCalendarItem(markersByDate, showDate.show_date, buildShowDateMarker({
      id: showDate.id,
      title: showDate.venue_name,
    }))
    appendCalendarItem(activitiesByDate, showDate.show_date, buildShowDateActivity({
      id: showDate.id,
      title: showDate.venue_name,
      city: showDate.city,
      state: showDate.state,
      href: showDate.ticket_url,
    }))
  }

  const memberships: Array<{
    id: string
    status: EventArtistMembership['status']
    event: CalendarEventRecord
  }> = ((rawMemberships ?? []) as unknown as Array<{
    id: string
    status: EventArtistMembership['status']
    events:
      | (CalendarEventRecord & {
          venues?: Array<{ name: string; location_city: string; location_state: string }> | { name: string; location_city: string; location_state: string } | null
        })
      | Array<CalendarEventRecord & {
          venues?: Array<{ name: string; location_city: string; location_state: string }> | { name: string; location_city: string; location_state: string } | null
        }>
      | null
  }>)
    .map((row) => ({
      id: row.id,
      status: row.status,
      event: (() => {
        const rawEvent = Array.isArray(row.events) ? row.events[0] : row.events
        if (!rawEvent) return null

        const normalizedEvent: CalendarEventRecord = {
          ...rawEvent,
          venues: Array.isArray(rawEvent.venues) ? (rawEvent.venues[0] ?? null) : rawEvent.venues ?? null,
        }

        return normalizedEvent
      })(),
    }))
    .flatMap((row) => {
      if (!row.event) return []
      if (row.event.event_date < calendarRange.rangeStart || row.event.event_date > calendarRange.rangeEnd) return []

      return [{
        id: row.id,
        status: row.status,
        event: row.event,
      }]
    })

  for (const membership of memberships) {
    appendCalendarItem(markersByDate, membership.event.event_date, buildArtistEventMarker({
      event: membership.event,
      membershipStatus: membership.status,
    }))
    appendCalendarItem(activitiesByDate, membership.event.event_date, buildArtistEventActivity({
      event: membership.event,
      membershipStatus: membership.status,
    }))
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <PageHeader
        eyebrow="Calendar"
        title={`${band.name} Calendar`}
        description="See saved shows and Backstage work together in one month grid, including applied and invited rooms."
        actions={
          <>
            <ButtonLink href="/events">
              <Search className="h-4 w-4" />
              Browse Events
            </ButtonLink>
            <ButtonLink href={`/dashboard/bands/${band.id}/edit`} tone="secondary">
              <PencilLine className="h-4 w-4" />
              Edit Artist Info
            </ButtonLink>
          </>
        }
      />

      {Object.keys(activitiesByDate).length === 0 ? (
        <EmptyState
          title="Nothing on this calendar yet"
          description="Saved shows and Backstage activity for this artist will appear here as soon as you add them."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <ButtonLink href="/events">
                <CalendarDays className="h-4 w-4" />
                Browse Events
              </ButtonLink>
              <ButtonLink href={`/dashboard/bands/${band.id}/edit`} tone="secondary">
                <PencilLine className="h-4 w-4" />
                Update Artist Profile
              </ButtonLink>
            </div>
          }
        />
      ) : (
        <ArtistCalendarWorkspace
          todayIso={todayIso}
          activitiesByDate={activitiesByDate}
          markersByDate={markersByDate}
        />
      )}
    </div>
  )
}
