import Link from 'next/link'
import { Suspense } from 'react'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { IdentityRequiredNotice } from '@/components/dashboard/IdentityRequiredNotice'
import { ProfileSelectionModal } from '@/components/dashboard/ProfileSelectionModal'
import { DashboardVenueFilters } from '@/components/venues/DashboardVenueFilters'
import {
  buildVenueDateGenreFocusMap,
  getEffectiveVenueDateGenreFocus,
  getGenreOverlapMatches,
} from '@/lib/venue-booking-date'
import { getVenueCalendarRange } from '@/lib/venue-calendar'
import { sortItemsByRank } from '@/lib/fuzzy-search'
import {
  ACTIVE_IDENTITY_COOKIE,
  activeIdentityLabel,
  resolveRequiredActiveIdentity,
  type ManagedIdentity,
} from '@/lib/managed-identity'
import type { Venue } from '@/types/database'

export const metadata = { title: 'Venues' }

const PAGE_SIZE = 25
const FEATURED_COUNT = 8

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

const STATE_ABBR_TO_NAME: Record<string, string> = {
  'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas',
  'CA': 'California', 'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware',
  'FL': 'Florida', 'GA': 'Georgia', 'HI': 'Hawaii', 'ID': 'Idaho',
  'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa', 'KS': 'Kansas',
  'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
  'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi',
  'MO': 'Missouri', 'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada',
  'NH': 'New Hampshire', 'NJ': 'New Jersey', 'NM': 'New Mexico', 'NY': 'New York',
  'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio', 'OK': 'Oklahoma',
  'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
  'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah',
  'VT': 'Vermont', 'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia',
  'WI': 'Wisconsin', 'WY': 'Wyoming', 'DC': 'District of Columbia',
}

const AGE_LABELS: Record<string, string> = {
  all_ages: 'All ages',
  '18_plus': '18+',
  '21_plus': '21+',
}

type VenueRecommendation = {
  title: string
  detail: string
  tone: 'open_date' | 'venue_genre'
  recommendedDate?: string
}

function formatRecommendationDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
  })
}

function VenueCard({
  venue,
  recommendation,
}: {
  venue: Venue
  recommendation?: VenueRecommendation | null
}) {
  return (
    <Link
      href={
        recommendation?.recommendedDate
          ? `/venues/${venue.slug}?selectedDate=${recommendation.recommendedDate}`
          : `/venues/${venue.slug}`
      }
      className="flex flex-col gap-2 bg-white border border-[#E8E8E8] rounded-xl p-5 hover:border-[#CCCCCC] hover:shadow-sm transition-all"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1 text-sm text-[#888888]">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#FD6A2F] shrink-0">
            <path d="M20 10c0 6-8 13-8 13s-8-7-8-13a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" />
          </svg>
          {venue.location_city}
        </span>
        {!venue.claimed_by_user_id && (
          <span className="text-xs font-medium text-[#FD6A2F] shrink-0">Unclaimed</span>
        )}
      </div>
      {recommendation && (
        <div
          className={`rounded-lg border px-3 py-2 ${
            recommendation.tone === 'open_date'
              ? 'border-[#CBEAE2] bg-[#F3FBF8] text-[#14584E]'
              : 'border-[#E8E8E8] bg-[#FAFAFA] text-[#555555]'
          }`}
        >
          <p className="text-xs font-semibold uppercase tracking-widest opacity-80">
            {recommendation.title}
          </p>
          <p className="mt-1 text-sm leading-snug">{recommendation.detail}</p>
        </div>
      )}
      <p className="font-bold text-[#252525] leading-snug">{venue.name}</p>
      {venue.description && (
        <p className="text-sm text-[#777777] leading-relaxed line-clamp-2">{venue.description}</p>
      )}
      {(venue.capacity || venue.age_requirement) && (
        <div className="flex items-center gap-2 mt-1">
          {venue.capacity && (
            <span className="flex items-center gap-1 text-xs text-[#888888] bg-[#F5F5F5] border border-[#E8E8E8] rounded-md px-2 py-1">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              {venue.capacity.toLocaleString()} cap
            </span>
          )}
          {venue.age_requirement && (
            <span className="flex items-center gap-1 text-xs text-[#888888] bg-[#F5F5F5] border border-[#E8E8E8] rounded-md px-2 py-1">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
              </svg>
              {AGE_LABELS[venue.age_requirement]}
            </span>
          )}
        </div>
      )}
    </Link>
  )
}

function Pagination({ page, totalPages, searchParams }: {
  page: number
  totalPages: number
  searchParams: Record<string, string | undefined>
}) {
  function href(p: number) {
    const params = new URLSearchParams(
      Object.entries(searchParams).filter(([, v]) => v != null) as [string, string][]
    )
    params.set('page', String(p))
    return `/dashboard/venues?${params.toString()}`
  }

  if (totalPages <= 1) return null

  const pages: (number | '…')[] = []
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - page) <= 1) pages.push(i)
    else if (pages[pages.length - 1] !== '…') pages.push('…')
  }

  return (
    <div className="flex items-center justify-center gap-1 mt-8">
      <Link
        href={href(page - 1)}
        className={`px-3 py-1.5 text-sm rounded-lg border border-[#E8E8E8] transition-colors ${
          page <= 1 ? 'pointer-events-none opacity-30' : 'hover:border-[#CCCCCC]'
        }`}
      >←</Link>
      {pages.map((p, i) =>
        p === '…' ? (
          <span key={`ellipsis-${i}`} className="px-2 text-sm text-[#888888]">…</span>
        ) : (
          <Link
            key={p}
            href={href(p as number)}
            className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
              p === page
                ? 'bg-[#FD6A2F] text-white border-[#FD6A2F]'
                : 'border-[#E8E8E8] hover:border-[#CCCCCC]'
            }`}
          >{p}</Link>
        )
      )}
      <Link
        href={href(page + 1)}
        className={`px-3 py-1.5 text-sm rounded-lg border border-[#E8E8E8] transition-colors ${
          page >= totalPages ? 'pointer-events-none opacity-30' : 'hover:border-[#CCCCCC]'
        }`}
      >→</Link>
    </div>
  )
}

function buildVenueRecommendations(args: {
  venues: Venue[]
  userBands: Array<{ name: string; genres: string[] }>
  venueGenreNamesByVenueId: Record<string, string[]>
  bookingDatesByVenueId: Record<
    string,
      Array<{
        id: string
        bill_cap: number | null
        is_closed_to_more_bands: boolean
        is_unavailable: boolean
        genre_focus: string | null
        show_date: string
      }>
  >
  bookingCountByDateId: Record<string, number>
  automatedGenreFocusByBookingDateId: Record<string, string | null>
}) {
  const recommendations = new Map<string, VenueRecommendation>()

  for (const venue of args.venues) {
    let bestRecommendation: VenueRecommendation | null = null

    const bookingDates = args.bookingDatesByVenueId[venue.id] ?? []
    for (const band of args.userBands) {
      for (const bookingDate of bookingDates) {
        const confirmedCount = args.bookingCountByDateId[bookingDate.id] ?? 0
        const billCap = bookingDate.bill_cap ?? venue.default_bill_cap
        const isOpen =
          !bookingDate.is_unavailable &&
          !bookingDate.is_closed_to_more_bands &&
          !(billCap !== null && confirmedCount >= billCap)

        if (!isOpen) continue

        const effectiveGenreFocus = getEffectiveVenueDateGenreFocus(
          bookingDate.genre_focus,
          args.automatedGenreFocusByBookingDateId[bookingDate.id]
        )
        if (!effectiveGenreFocus) continue

        const matches = getGenreOverlapMatches(
          band.genres,
          effectiveGenreFocus
            .toLowerCase()
            .replace(/\s+leaning$/i, '')
            .split(/[\/,]/)
            .map((part) => part.trim())
            .filter(Boolean)
        )

        if (matches.length > 0) {
          bestRecommendation = {
            title: `Recommended for ${band.name}`,
            detail: `${formatRecommendationDate(bookingDate.show_date)} is still open and leans ${effectiveGenreFocus}.`,
            tone: 'open_date',
            recommendedDate: bookingDate.show_date,
          }
          break
        }
      }

      if (bestRecommendation) break

      const venueGenreMatches = getGenreOverlapMatches(
        band.genres,
        args.venueGenreNamesByVenueId[venue.id] ?? []
      )

      if (venueGenreMatches.length > 0) {
        bestRecommendation = {
          title: `Good fit for ${band.name}`,
          detail: `Venue profile overlaps with your genres: ${venueGenreMatches.slice(0, 2).join(' / ')}.`,
          tone: 'venue_genre',
        }
      }
    }

    if (bestRecommendation) {
      recommendations.set(venue.id, bestRecommendation)
    }
  }

  return recommendations
}

interface PageProps {
  searchParams: Promise<{
    tab?: string
    q?: string
    location?: string
    capacity?: string
    genre?: string
    age?: string
    page?: string
    view?: string
    submitted?: string
  }>
}

export default async function DashboardVenuesPage({ searchParams }: PageProps) {
  const filters = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return redirect('/login')

  const [{ data: allGenres }, { data: rawUserBands }, { data: rawUserVenues }] = await Promise.all([
    supabase.from('genres').select('id, name').order('name'),
    supabase
      .from('bands')
      .select('id, name, band_genres ( genres ( name ) )')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('name'),
    supabase
      .from('venues')
      .select('id, name')
      .eq('claimed_by_user_id', user.id)
      .eq('is_active', true)
      .order('name'),
  ])

  const userBands = ((rawUserBands ?? []) as unknown as Array<{
    id: string
    name: string
    band_genres?: Array<{ genres?: Array<{ name: string | null }> | { name: string | null } | null }> | null
  }>).map((band) => ({
    id: band.id,
    name: band.name,
    genres: (band.band_genres ?? [])
      .flatMap((entry) => (Array.isArray(entry.genres) ? entry.genres : entry.genres ? [entry.genres] : []))
      .map((genre) => genre.name?.trim() ?? null)
      .filter((value): value is string => !!value),
  }))
  const identities: ManagedIdentity[] = [
    ...userBands.map((band) => ({
      kind: 'band' as const,
      id: band.id,
      name: band.name,
      href: `/dashboard/bands/${band.id}/edit`,
    })),
    ...((rawUserVenues ?? []) as Array<{ id: string; name: string }>).map((venue) => ({
      kind: 'venue' as const,
      id: venue.id,
      name: venue.name,
      href: `/dashboard/venues/${venue.id}/edit`,
    })),
  ]
  const cookieStore = await cookies()
  const requiredIdentity = resolveRequiredActiveIdentity(cookieStore.get(ACTIVE_IDENTITY_COOKIE)?.value, identities)

  if (requiredIdentity.requiresSelection) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-8">
        <ProfileSelectionModal
          title="Select a profile to browse Venues"
          body="Venues are browsed from one active profile at a time. Use the profile selector in the nav to choose the profile you want to browse from."
          identities={identities}
        />
      </div>
    )
  }

  const activeIdentity = requiredIdentity.activeIdentity
  const page = Math.max(1, parseInt(filters.page ?? '1', 10))
  const hasFilters = !!(filters.q || filters.location || filters.capacity || filters.age || filters.genre)
  const fullListMode = hasFilters || filters.view === 'all'
  const todayIso = new Date().toISOString().slice(0, 10)
  const calendarRange = getVenueCalendarRange(todayIso, 6)
  const recommendationBands = activeIdentity?.kind === 'band'
    ? userBands.filter((band) => band.id === activeIdentity.id)
    : []
  const identityNotice = userBands.length > 0 && activeIdentity?.kind !== 'band'
    ? {
        title: 'Switch to an artist to use venue recommendations',
        body: activeIdentity
          ? `You are acting as ${activeIdentityLabel(activeIdentity)}. Switch the profile selector to an artist before using recommendations or requesting contact with a venue.`
          : 'Venue recommendations and contact requests need to know which artist is acting. Choose an artist in the profile selector, then come back to venues.',
      }
    : null

  async function fetchVenueRecommendations(venuesToScore: Venue[]) {
    if (venuesToScore.length === 0 || recommendationBands.length === 0) {
      return new Map<string, VenueRecommendation>()
    }

    const venueIds = venuesToScore.map((venue) => venue.id)

    const [{ data: rawVenueGenres }, { data: rawBookingDates }, { data: rawBookings }] = await Promise.all([
      supabase
        .from('venue_genres')
        .select('venue_id, genres ( name )')
        .in('venue_id', venueIds),
      supabase
        .from('venue_booking_dates')
        .select('id, venue_id, bill_cap, is_closed_to_more_bands, is_unavailable, genre_focus, show_date')
        .in('venue_id', venueIds)
        .gte('show_date', calendarRange.rangeStart)
        .lte('show_date', calendarRange.rangeEnd),
      supabase
        .from('bookings')
        .select('venue_id, venue_booking_date_id, status, bands:band_id ( band_genres ( genres ( name ) ) )')
        .in('venue_id', venueIds)
        .in('status', ['confirmed', 'cancellation_requested']),
    ])

    const venueGenreNamesByVenueId: Record<string, string[]> = {}
    for (const row of ((rawVenueGenres ?? []) as unknown as Array<{
      venue_id: string
      genres?: Array<{ name: string | null }> | { name: string | null } | null
    }>)) {
      const genres = Array.isArray(row.genres) ? row.genres : row.genres ? [row.genres] : []
      venueGenreNamesByVenueId[row.venue_id] = [
        ...(venueGenreNamesByVenueId[row.venue_id] ?? []),
        ...genres.map((genre) => genre.name?.trim() ?? null).filter((value): value is string => !!value),
      ]
    }

    const bookingDatesByVenueId: Record<
      string,
      Array<{
        id: string
        bill_cap: number | null
        is_closed_to_more_bands: boolean
        is_unavailable: boolean
        genre_focus: string | null
        show_date: string
      }>
    > = {}

    for (const bookingDate of ((rawBookingDates ?? []) as Array<{
      id: string
      venue_id: string
      bill_cap: number | null
      is_closed_to_more_bands: boolean
      is_unavailable: boolean
      genre_focus: string | null
      show_date: string
    }>)) {
      bookingDatesByVenueId[bookingDate.venue_id] = [
        ...(bookingDatesByVenueId[bookingDate.venue_id] ?? []),
        bookingDate,
      ]
    }

    const bookings = (rawBookings ?? []) as Array<{
      venue_id: string
      venue_booking_date_id: string
      status: 'confirmed' | 'cancellation_requested' | 'cancelled'
      bands?:
        | {
            band_genres?: Array<{ genres?: Array<{ name: string | null }> | { name: string | null } | null }> | null
          }
        | null
    }>

    const automatedGenreFocusByBookingDateId = Object.fromEntries(buildVenueDateGenreFocusMap(bookings))
    const bookingCountByDateId: Record<string, number> = {}
    for (const booking of bookings) {
      if (booking.status !== 'confirmed' && booking.status !== 'cancellation_requested') continue
      bookingCountByDateId[booking.venue_booking_date_id] =
        (bookingCountByDateId[booking.venue_booking_date_id] ?? 0) + 1
    }

    return buildVenueRecommendations({
      venues: venuesToScore,
      userBands: recommendationBands,
      venueGenreNamesByVenueId,
      bookingDatesByVenueId,
      bookingCountByDateId,
      automatedGenreFocusByBookingDateId,
    })
  }


  // ── Directory tab ──────────────────────────────────────────
  let baseQuery = supabase
    .from('venues')
    .select('*')
    .eq('is_active', true)
    .or('capacity.is.null,capacity.lte.2500')

  // Apply filters
  let fuzzyMatches: Array<{ id: string; rank: number }> | null = null
  if (filters.q) {
    const { data } = await supabase.rpc('search_venues_fuzzy', {
      p_query: filters.q,
    })

    fuzzyMatches = ((data ?? []) as Array<{ id: string; rank: number }>).filter((match) => !!match.id)

    if (fuzzyMatches.length === 0) {
      baseQuery = baseQuery.in('id', ['00000000-0000-0000-0000-000000000000'])
    } else {
      baseQuery = baseQuery.in('id', fuzzyMatches.map((match) => match.id))
    }
  }
  if (filters.location) {
    const loc = filters.location.trim()
    const cityState = loc.match(/^(.+),\s*([A-Za-z]{2})$/)
    if (cityState) {
      baseQuery = baseQuery
        .ilike('location_city', `%${cityState[1].trim()}%`)
        .ilike('location_state', cityState[2].trim())
    } else if (/^[A-Za-z]{2}$/.test(loc)) {
      baseQuery = baseQuery.ilike('location_state', loc)
    } else {
      const stateAbbr = STATE_NAME_TO_ABBR[loc.toLowerCase()]
      if (stateAbbr) baseQuery = baseQuery.eq('location_state', stateAbbr)
      else baseQuery = baseQuery.ilike('location_city', `%${loc}%`)
    }
  }
  if (filters.capacity) {
    if (filters.capacity === 'small') baseQuery = baseQuery.lt('capacity', 150)
    else if (filters.capacity === 'medium') baseQuery = baseQuery.gte('capacity', 150).lte('capacity', 400)
    else if (filters.capacity === 'large') baseQuery = baseQuery.gt('capacity', 400)
  }
  if (filters.age) baseQuery = baseQuery.eq('age_requirement', filters.age)
  if (filters.genre) {
    const { data: rawVenueIds } = await supabase
      .from('venue_genres').select('venue_id').eq('genre_id', filters.genre)
    const venueIds = rawVenueIds as { venue_id: string }[] | null
    baseQuery = baseQuery.in('id', (venueIds ?? []).map((v) => v.venue_id))
  }

  // Featured mode (no filters, no view=all)
  if (!fullListMode) {
    const { data: rawAllVenues } = await baseQuery.order('name')
    const allVenues = rawAllVenues as Venue[] | null
    const total = allVenues?.length ?? 0
    const featured = (allVenues ?? []).slice(0, FEATURED_COUNT)
    const recommendationsByVenueId = await fetchVenueRecommendations(featured)

    return (
      <div className="max-w-5xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold mb-6">Venue Directory</h1>
        {identityNotice && (
          <IdentityRequiredNotice title={identityNotice.title} body={identityNotice.body} />
        )}
        <Suspense>
          <DashboardVenueFilters genres={allGenres ?? []} />
        </Suspense>

        {featured.length === 0 ? (
          <div className="bg-white border border-[#E8E8E8] rounded-xl p-16 text-center">
            <p className="text-[#888888]">No venues found.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 mb-6">
              {featured.map((venue) => (
                <VenueCard
                  key={venue.id}
                  venue={venue}
                  recommendation={recommendationsByVenueId.get(venue.id)}
                />
              ))}
            </div>
            <div className="flex items-center justify-between">
              {total > FEATURED_COUNT ? (
                <Link
                  href="/dashboard/venues?view=all"
                  className="inline-flex items-center gap-1.5 text-sm text-[#888888] hover:text-[#252525] transition-colors"
                >
                  View all {total} venues
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </Link>
              ) : <span />}
              <span />
            </div>
          </>
        )}
      </div>
    )
  }

  // Full list mode — paginated, with state groupings when no filters
  const showStateGroupings = !hasFilters

  const orderedQuery = showStateGroupings
    ? baseQuery.order('location_state').order('name')
    : baseQuery.order('name')

  const { data: rawOrderedVenues } = await orderedQuery
  const allVenues = ((filters.q && fuzzyMatches)
    ? sortItemsByRank((rawOrderedVenues as Venue[] | null) ?? [], fuzzyMatches)
    : ((rawOrderedVenues as Venue[] | null) ?? []))
  const total = allVenues?.length ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)
  const pageVenues = (allVenues ?? []).slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const recommendationsByVenueId = await fetchVenueRecommendations(pageVenues)

  // Group by state for "view all" mode
  const grouped: { state: string; venues: Venue[] }[] = []
  if (showStateGroupings) {
    for (const venue of pageVenues) {
      const last = grouped[grouped.length - 1]
      if (last && last.state === venue.location_state) {
        last.venues.push(venue)
      } else {
        grouped.push({ state: venue.location_state, venues: [venue] })
      }
    }
  }

  const searchParamsRecord = Object.fromEntries(
    Object.entries(filters).filter(([key, value]) => key !== 'tab' && value != null)
  ) as Record<string, string>
  delete searchParamsRecord.recommendBand

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-bold mb-6">Venue Directory</h1>
      {identityNotice && (
        <IdentityRequiredNotice title={identityNotice.title} body={identityNotice.body} />
      )}
      <Suspense>
        <DashboardVenueFilters genres={allGenres ?? []} />
      </Suspense>

      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-[#888888]">
          {total} venue{total !== 1 ? 's' : ''}{hasFilters ? ' matching your filters' : ''}
        </p>
        {hasFilters && (
          <Link
            href="/dashboard/venues"
            className="text-xs text-[#888888] hover:text-[#FD6A2F] transition-colors"
          >
            Clear filters
          </Link>
        )}
      </div>

      {pageVenues.length === 0 ? (
        <div className="bg-white border border-[#E8E8E8] rounded-xl p-16 text-center">
          <p className="text-[#888888]">No venues found. Try adjusting your filters.</p>
        </div>
      ) : showStateGroupings ? (
        <div className="space-y-8">
          {grouped.map(({ state, venues }) => (
            <div key={state}>
              <p className="text-xs font-semibold text-[#AAAAAA] uppercase tracking-widest mb-3">
                {STATE_ABBR_TO_NAME[state] ?? state}
              </p>
              <div className="grid grid-cols-1 gap-4">
                {venues.map((venue) => (
                  <VenueCard
                    key={venue.id}
                    venue={venue}
                    recommendation={recommendationsByVenueId.get(venue.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {pageVenues.map((venue) => (
            <VenueCard
              key={venue.id}
              venue={venue}
              recommendation={recommendationsByVenueId.get(venue.id)}
            />
          ))}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} searchParams={searchParamsRecord} />
    </div>
  )
}

