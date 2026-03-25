import Link from 'next/link'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { VenueFilters } from '@/components/venues/VenueFilters'
import type { Venue } from '@/types/database'

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

function VenueCard({ venue }: { venue: Venue }) {
  return (
    <Link
      href={`/venues/${venue.slug}`}
      className="flex flex-col gap-2 bg-[#FFFFFF] border border-[#E8E8E8] rounded-xl p-5 hover:border-[#CCCCCC] hover:shadow-sm transition-all"
    >
      {/* Top row: city + unclaimed */}
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1 text-sm text-[#888888]">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#FD6A2F] shrink-0">
            <path d="M20 10c0 6-8 13-8 13s-8-7-8-13a8 8 0 0 1 16 0Z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          {venue.location_city}
        </span>
        {!venue.claimed_by_user_id && (
          <span className="text-xs font-medium text-[#FD6A2F] shrink-0">Unclaimed</span>
        )}
      </div>

      {/* Venue name */}
      <p className="font-bold text-[#252525] leading-snug">{venue.name}</p>

      {/* Description */}
      {venue.description && (
        <p className="text-sm text-[#777777] leading-relaxed line-clamp-2">
          {venue.description}
        </p>
      )}

      {/* Bottom chips */}
      {(venue.capacity || venue.age_requirement) && (
        <div className="flex items-center gap-2 mt-1">
          {venue.capacity && (
            <span className="flex items-center gap-1 text-xs text-[#888888] bg-[#F5F5F5] border border-[#E8E8E8] rounded-md px-2 py-1">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              {venue.capacity.toLocaleString()} cap
            </span>
          )}
          {venue.age_requirement && (
            <span className="flex items-center gap-1 text-xs text-[#888888] bg-[#F5F5F5] border border-[#E8E8E8] rounded-md px-2 py-1">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" />
              </svg>
              {AGE_LABELS[venue.age_requirement]}
            </span>
          )}
        </div>
      )}
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

  // Build venue query
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

    // "City, ST" format (set by geolocation or zip geocode on client)
    const cityState = loc.match(/^(.+),\s*([A-Za-z]{2})$/)
    if (cityState) {
      query = query
        .ilike('location_city', `%${cityState[1].trim()}%`)
        .ilike('location_state', cityState[2].trim())
    } else if (/^[A-Za-z]{2}$/.test(loc)) {
      // Two-letter state abbreviation (e.g. "UT")
      query = query.ilike('location_state', loc)
    } else {
      // Check if it's a full state name (e.g. "Utah" → "UT")
      const stateAbbr = STATE_NAME_TO_ABBR[loc.toLowerCase()]
      if (stateAbbr) {
        query = query.eq('location_state', stateAbbr)
      } else {
        // City name — fuzzy match
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
    const { data: venueIds } = await supabase
      .from('venue_genres')
      .select('venue_id')
      .eq('genre_id', filters.genre)
    query = query.in('id', (venueIds ?? []).map((v) => v.venue_id))
  }

  const { data: venues } = await query

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-1">Venue Directory</h1>
        <p className="text-[#888888]">
          {venues?.length ?? 0} venue{venues?.length !== 1 ? 's' : ''}
          {Object.values(filters).some(Boolean) ? ' matching your filters' : ''}
        </p>
      </div>

      <Suspense>
        <VenueFilters genres={allGenres ?? []} />
      </Suspense>

      {!venues || venues.length === 0 ? (
        <div className="bg-[#FFFFFF] border border-[#E8E8E8] rounded-xl p-12 text-center">
          <p className="text-[#888888] mb-3">No venues found. Try adjusting your filters.</p>
          <Link
            href={user ? '/dashboard/venues/new' : '/login?redirectTo=/dashboard/venues/new'}
            className="text-sm text-[#FD6A2F] hover:underline"
          >
            Don&apos;t see your venue? Add it →
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {venues.map((venue) => (
              <VenueCard key={venue.id} venue={venue} />
            ))}
          </div>
          <p className="mt-8 text-center text-sm text-[#888888]">
            Don&apos;t see your venue?{' '}
            <Link
              href={user ? '/dashboard/venues/new' : '/login?redirectTo=/dashboard/venues/new'}
              className="text-[#FD6A2F] hover:underline"
            >
              Add it →
            </Link>
          </p>
        </>
      )}
    </div>
  )
}
