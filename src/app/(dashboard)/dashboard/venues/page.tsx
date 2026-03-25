import Link from 'next/link'
import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardVenueFilters } from '@/components/venues/DashboardVenueFilters'
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

function VenueCard({ venue }: { venue: Venue }) {
  return (
    <Link
      href={`/venues/${venue.slug}`}
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
  }>
}

export default async function DashboardVenuesPage({ searchParams }: PageProps) {
  const filters = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return redirect('/login')

  const tab = filters.tab ?? 'directory'
  const page = Math.max(1, parseInt(filters.page ?? '1', 10))
  const hasFilters = !!(filters.q || filters.location || filters.capacity || filters.age || filters.genre)
  const fullListMode = hasFilters || filters.view === 'all'

  const { data: allGenres } = await supabase.from('genres').select('id, name').order('name')

  function tabHref(t: string) {
    return `/dashboard/venues?tab=${t}`
  }

  // ── My Venues tab ─────────────────────────────────────────
  if (tab === 'mine') {
    const { data: myVenues } = await supabase
      .from('venues')
      .select('*')
      .eq('claimed_by_user_id', user.id)
      .order('name')

    return (
      <div className="max-w-5xl mx-auto px-6 py-8">
        <Tabs active="mine" tabHref={tabHref} />

        {!myVenues || myVenues.length === 0 ? (
          <div className="bg-white border border-[#E8E8E8] rounded-xl p-16 text-center">
            <p className="text-[#888888] mb-4">You haven&apos;t claimed any venues yet.</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/dashboard/venues?tab=directory"
                className="inline-block bg-[#FD6A2F] text-white text-sm font-semibold rounded-lg px-5 py-2.5 hover:bg-[#E55A22] transition-colors"
              >
                Browse venue directory
              </Link>
              <Link
                href="/dashboard/venues/new"
                className="inline-block border border-[#E8E8E8] text-[#252525] text-sm font-semibold rounded-lg px-5 py-2.5 hover:border-[#CCCCCC] hover:bg-[#F0F0F0] transition-colors"
              >
                Add your venue
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {myVenues.map((venue) => (
              <div
                key={venue.id}
                className="bg-white border border-[#E8E8E8] rounded-xl p-5 flex items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <p className="font-semibold truncate">{venue.name}</p>
                  <p className="text-sm text-[#888888] mt-0.5">
                    {venue.location_city}, {venue.location_state}
                    {venue.capacity && ` · ${venue.capacity.toLocaleString()} cap`}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <Link
                    href={`/venues/${venue.slug}`}
                    target="_blank"
                    className="text-sm text-[#888888] hover:text-[#252525] transition-colors"
                  >
                    View
                  </Link>
                  <Link
                    href={`/dashboard/venues/${venue.id}/edit`}
                    className="text-sm font-medium bg-[#F5F5F5] border border-[#E8E8E8] rounded-lg px-3 py-1.5 hover:border-[#CCCCCC] transition-colors"
                  >
                    Edit
                  </Link>
                </div>
              </div>
            ))}
            <Link
              href="/dashboard/venues/new"
              className="block text-center text-xs text-[#FD6A2F] hover:underline py-2"
            >
              + Add a venue
            </Link>
          </div>
        )}
      </div>
    )
  }

  // ── Directory tab ──────────────────────────────────────────
  let baseQuery = supabase
    .from('venues')
    .select('*')
    .eq('is_active', true)
    .or('capacity.is.null,capacity.lte.2500')

  // Apply filters
  if (filters.q) {
    baseQuery = baseQuery.or(`name.ilike.%${filters.q}%,location_city.ilike.%${filters.q}%`)
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
    const { data: venueIds } = await supabase
      .from('venue_genres').select('venue_id').eq('genre_id', filters.genre)
    baseQuery = baseQuery.in('id', (venueIds ?? []).map((v) => v.venue_id))
  }

  // Featured mode (no filters, no view=all)
  if (!fullListMode) {
    const { data: allVenues } = await baseQuery.order('name')
    const total = allVenues?.length ?? 0
    const featured = (allVenues ?? []).slice(0, FEATURED_COUNT)

    return (
      <div className="max-w-5xl mx-auto px-6 py-8">
        <Tabs active="directory" tabHref={tabHref} />
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
              {featured.map((venue) => <VenueCard key={venue.id} venue={venue} />)}
            </div>
            <div className="flex items-center justify-between">
              {total > FEATURED_COUNT ? (
                <Link
                  href={`/dashboard/venues?tab=directory&view=all`}
                  className="inline-flex items-center gap-1.5 text-sm text-[#888888] hover:text-[#252525] transition-colors"
                >
                  View all {total} venues
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </Link>
              ) : <span />}
              <Link href="/dashboard/venues/new" className="text-sm text-[#FD6A2F] hover:underline">
                Don&apos;t see your venue? Add it →
              </Link>
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

  const { data: allVenues } = await orderedQuery
  const total = allVenues?.length ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)
  const pageVenues = (allVenues ?? []).slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

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
    Object.entries(filters).filter(([, v]) => v != null)
  ) as Record<string, string>

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <Tabs active="directory" tabHref={tabHref} />
      <Suspense>
        <DashboardVenueFilters genres={allGenres ?? []} />
      </Suspense>

      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-[#888888]">
          {total} venue{total !== 1 ? 's' : ''}{hasFilters ? ' matching your filters' : ''}
        </p>
        {hasFilters && (
          <Link
            href="/dashboard/venues?tab=directory"
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
                {venues.map((venue) => <VenueCard key={venue.id} venue={venue} />)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {pageVenues.map((venue) => <VenueCard key={venue.id} venue={venue} />)}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} searchParams={searchParamsRecord} />
      <p className="mt-6 text-center text-sm text-[#888888]">
        Don&apos;t see your venue?{' '}
        <Link href="/dashboard/venues/new" className="text-[#FD6A2F] hover:underline">
          Add it →
        </Link>
      </p>
    </div>
  )
}

function Tabs({ active, tabHref }: { active: string; tabHref: (t: string) => string }) {
  return (
    <div className="flex items-center gap-1 mb-6 border-b border-[#E8E8E8]">
      {[
        { key: 'directory', label: 'Directory' },
        { key: 'mine', label: 'My Venues' },
      ].map(({ key, label }) => (
        <Link
          key={key}
          href={tabHref(key)}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
            active === key
              ? 'border-[#FD6A2F] text-[#FD6A2F]'
              : 'border-transparent text-[#888888] hover:text-[#252525]'
          }`}
        >
          {label}
        </Link>
      ))}
    </div>
  )
}
