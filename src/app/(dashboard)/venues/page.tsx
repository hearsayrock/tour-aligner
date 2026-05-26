import Link from 'next/link'
import { Suspense } from 'react'
import { CalendarDays, MapPin, Music2, Plus, Search, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { VenueFilters } from '@/components/venues/VenueFilters'
import { Badge, ButtonLink, EmptyState, PageHeader } from '@/components/ui/primitives'
import type { Booking, Venue, VenueBookingDate } from '@/types/database'

export const metadata = { title: 'Venue Directory' }

const STATE_NAME_TO_ABBR: Record<string, string> = {
  'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR',
  'california': 'CA', 'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE',
  'florida': 'FL', 'georgia': 'GA', 'hawaii': 'HI', 'idaho': 'ID',
  'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA', 'kansas': 'KS',
  'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME', 'maryland': 'MD',
  'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN', 'mississippi': 'MS',
  'missouri': 'MO', 'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV',
  'new hampshire': 'NH', 'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY',
  'north carolina': 'NC', 'north dakota': 'ND', 'ohio': 'OH', 'oklahoma': 'OK',
  'oregon': 'OR', 'pennsylvania': 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
  'south dakota': 'SD', 'tennessee': 'TN', 'texas': 'TX', 'utah': 'UT',
  'vermont': 'VT', 'virginia': 'VA', 'washington': 'WA', 'west virginia': 'WV',
  'wisconsin': 'WI', 'wyoming': 'WY', 'district of columbia': 'DC',
}

const AGE_LABELS: Record<string, string> = {
  all_ages: 'All ages',
  '18_plus': '18+',
  '21_plus': '21+',
}

type AvailabilitySummary = {
  label: string
  detail: string
  tone: 'success' | 'warning' | 'muted'
}

type BookingDateSummary = Pick<VenueBookingDate, 'id' | 'venue_id' | 'show_date' | 'bill_cap' | 'is_closed_to_more_bands' | 'is_unavailable' | 'genre_focus'>

function formatAvailabilityDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

function buildAvailabilitySummaries(
  bookingDates: BookingDateSummary[],
  bookings: Array<Pick<Booking, 'venue_booking_date_id' | 'status'>>
) {
  const bookingCountByDate = new Map<string, number>()
  for (const booking of bookings) {
    if (booking.status !== 'confirmed' && booking.status !== 'cancellation_requested') continue
    bookingCountByDate.set(
      booking.venue_booking_date_id,
      (bookingCountByDate.get(booking.venue_booking_date_id) ?? 0) + 1
    )
  }

  const summaries = new Map<string, AvailabilitySummary>()
  const datesByVenue = new Map<string, BookingDateSummary[]>()
  for (const bookingDate of bookingDates) {
    datesByVenue.set(bookingDate.venue_id, [...(datesByVenue.get(bookingDate.venue_id) ?? []), bookingDate])
  }

  for (const [venueId, dates] of datesByVenue.entries()) {
    const sortedDates = [...dates].sort((a, b) => a.show_date.localeCompare(b.show_date))
    const openDate = sortedDates.find((date) => {
      const count = bookingCountByDate.get(date.id) ?? 0
      return !date.is_unavailable && !date.is_closed_to_more_bands && count < date.bill_cap
    })

    if (openDate) {
      const count = bookingCountByDate.get(openDate.id) ?? 0
      summaries.set(venueId, {
        label: `${formatAvailabilityDate(openDate.show_date)} open`,
        detail: `${count}/${openDate.bill_cap} on bill${openDate.genre_focus ? ` / ${openDate.genre_focus}` : ''}`,
        tone: count > 0 ? 'warning' : 'success',
      })
    } else if (sortedDates.length > 0) {
      summaries.set(venueId, {
        label: 'Calendar posted',
        detail: 'No open dates in the current window',
        tone: 'muted',
      })
    }
  }

  return summaries
}

function VenueCard({ venue, availability }: { venue: Venue; availability?: AvailabilitySummary }) {
  return (
    <Link
      href={`/venues/${venue.slug}`}
      className="group flex min-h-full flex-col rounded-2xl border border-[#E6E6E6] bg-white p-5 shadow-[0_12px_28px_rgba(20,20,20,0.035)] transition-all hover:-translate-y-0.5 hover:border-[#D0D0D0] hover:shadow-[0_18px_38px_rgba(20,20,20,0.07)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2 text-sm font-medium text-[#777777]">
          <MapPin className="h-4 w-4 shrink-0 text-[#FD6A2F]" />
          <span className="truncate">{[venue.location_city, venue.location_state].filter(Boolean).join(', ')}</span>
        </div>
        {!venue.claimed_by_user_id && <Badge tone="brand">Unclaimed</Badge>}
      </div>

      <h2 className="mt-4 text-xl font-bold tracking-tight text-[#202020] group-hover:text-[#FD6A2F]">
        {venue.name}
      </h2>

      {venue.description ? (
        <p className="mt-3 line-clamp-3 text-sm leading-6 text-[#666666]">{venue.description}</p>
      ) : (
        <p className="mt-3 text-sm leading-6 text-[#888888]">Venue details are still being filled in.</p>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        {venue.capacity && (
          <Badge tone="muted">
            <Users className="h-3.5 w-3.5" />
            {venue.capacity.toLocaleString()} cap
          </Badge>
        )}
        {venue.age_requirement && (
          <Badge tone="muted">
            <Music2 className="h-3.5 w-3.5" />
            {AGE_LABELS[venue.age_requirement]}
          </Badge>
        )}
      </div>

      <div className="mt-auto pt-5">
        {availability ? (
          <div className="rounded-2xl border border-[#E8E8E8] bg-[#FCFCFC] px-4 py-3">
            <Badge tone={availability.tone}>
              <CalendarDays className="h-3.5 w-3.5" />
              {availability.label}
            </Badge>
            <p className="mt-2 text-xs leading-5 text-[#777777]">{availability.detail}</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-[#E8E8E8] bg-[#FCFCFC] px-4 py-3 text-xs leading-5 text-[#888888]">
            No availability calendar posted yet.
          </div>
        )}
      </div>
    </Link>
  )
}

interface PageProps {
  searchParams: Promise<{
    q?: string
    location?: string
    capacity?: string
    genre?: string
    age?: string
  }>
}

export default async function VenuesPage({ searchParams }: PageProps) {
  const filters = await searchParams
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: allGenres } = await supabase.from('genres').select('id, name').order('name')

  let query = supabase
    .from('venues')
    .select('*')
    .eq('is_active', true)
    .or('capacity.is.null,capacity.lte.2500')
    .order('name')

  if (filters.q) {
    query = query.or(
      `name.ilike.%${filters.q}%,location_city.ilike.%${filters.q}%`
    )
  }
  if (filters.location) {
    const loc = filters.location.trim()
    const cityState = loc.match(/^(.+),\s*([A-Za-z]{2})$/)
    if (cityState) {
      query = query
        .ilike('location_city', `%${cityState[1].trim()}%`)
        .ilike('location_state', cityState[2].trim())
    } else if (/^[A-Za-z]{2}$/.test(loc)) {
      query = query.ilike('location_state', loc)
    } else {
      const stateAbbr = STATE_NAME_TO_ABBR[loc.toLowerCase()]
      if (stateAbbr) {
        query = query.eq('location_state', stateAbbr)
      } else {
        query = query.ilike('location_city', `%${loc}%`)
      }
    }
  }
  if (filters.capacity) {
    if (filters.capacity === 'small') query = query.lt('capacity', 150)
    else if (filters.capacity === 'medium')
      query = query.gte('capacity', 150).lte('capacity', 400)
    else if (filters.capacity === 'large') query = query.gt('capacity', 400)
  }
  if (filters.age) {
    query = query.eq('age_requirement', filters.age)
  }
  if (filters.genre) {
    const { data: rawVenueIds } = await supabase
      .from('venue_genres')
      .select('venue_id')
      .eq('genre_id', filters.genre)
    const venueIds = rawVenueIds as { venue_id: string }[] | null
    query = query.in('id', (venueIds ?? []).map((v) => v.venue_id))
  }

  const { data: rawVenues } = await query
  const venues = rawVenues as Venue[] | null
  const venueIds = (venues ?? []).map((venue) => venue.id)

  const today = new Date()
  const todayIso = today.toISOString().slice(0, 10)
  const horizon = new Date(today)
  horizon.setDate(horizon.getDate() + 180)
  const horizonIso = horizon.toISOString().slice(0, 10)

  const { data: bookingDates } = venueIds.length
    ? await supabase
        .from('venue_booking_dates')
        .select('id, venue_id, show_date, bill_cap, is_closed_to_more_bands, is_unavailable, genre_focus')
        .in('venue_id', venueIds)
        .gte('show_date', todayIso)
        .lte('show_date', horizonIso)
        .order('show_date')
    : { data: [] }
  const bookingDateIds = ((bookingDates ?? []) as BookingDateSummary[]).map((date) => date.id)
  const { data: bookings } = bookingDateIds.length
    ? await supabase
        .from('bookings')
        .select('venue_booking_date_id, status')
        .in('venue_booking_date_id', bookingDateIds)
        .in('status', ['confirmed', 'cancellation_requested'])
    : { data: [] }
  const availabilityByVenue = buildAvailabilitySummaries(
    (bookingDates ?? []) as BookingDateSummary[],
    (bookings ?? []) as Array<Pick<Booking, 'venue_booking_date_id' | 'status'>>
  )

  const filtered = Object.values(filters).some(Boolean)

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <PageHeader
        eyebrow="Venue discovery"
        title="Venue Directory"
        description={`${venues?.length ?? 0} venue${venues?.length !== 1 ? 's' : ''}${filtered ? ' matching your filters' : ' ready to explore for route building and booking conversations.'}`}
        actions={
          <ButtonLink href={user ? '/dashboard/venues/new' : '/login?redirectTo=/dashboard/venues/new'} tone="secondary">
            <Plus className="h-4 w-4" />
            Add Venue
          </ButtonLink>
        }
      />

      <Suspense>
        <VenueFilters genres={allGenres ?? []} />
      </Suspense>

      {!venues || venues.length === 0 ? (
        <EmptyState
          title="No venues found"
          description="Try clearing or adjusting filters. If the venue is missing, you can add it to the directory."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <ButtonLink href="/venues" tone="secondary">
                <Search className="h-4 w-4" />
                Clear Filters
              </ButtonLink>
              <ButtonLink href={user ? '/dashboard/venues/new' : '/login?redirectTo=/dashboard/venues/new'}>
                Add Venue
              </ButtonLink>
            </div>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {venues.map((venue) => (
            <VenueCard key={venue.id} venue={venue} availability={availabilityByVenue.get(venue.id)} />
          ))}
        </div>
      )}
    </div>
  )
}
