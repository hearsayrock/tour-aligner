import Link from 'next/link'
import Image from 'next/image'
import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardBandFilters } from '@/components/bands/DashboardBandFilters'
import { sortItemsByRank } from '@/lib/fuzzy-search'
import type { Band } from '@/types/database'

export const metadata = { title: 'Bands' }

const PAGE_SIZE = 25
const FEATURED_COUNT = 8

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

const RADIUS_LABELS: Record<string, string> = {
  local: 'Local', regional: 'Regional', national: 'National', international: 'International',
}

function BandCard({ band }: { band: Band }) {
  return (
    <Link
      href={`/bands/${band.slug}`}
      className="flex items-center gap-4 bg-white border border-[#E8E8E8] rounded-xl p-4 hover:border-[#CCCCCC] hover:shadow-sm transition-all"
    >
      {/* Profile photo or initials */}
      <div className="w-12 h-12 rounded-full bg-[#F0F0F0] border border-[#E8E8E8] shrink-0 overflow-hidden flex items-center justify-center">
        {band.profile_photo_url ? (
          <Image src={band.profile_photo_url} alt={band.name} width={48} height={48} className="object-cover w-full h-full" unoptimized />
        ) : (
          <span className="text-base font-bold text-[#CCCCCC]">
            {band.name.charAt(0).toUpperCase()}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-bold text-[#252525] leading-snug truncate">{band.name}</p>
        {(band.location_city || band.location_state) && (
          <p className="text-sm text-[#888888] mt-0.5">
            {[band.location_city, band.location_state].filter(Boolean).join(', ')}
          </p>
        )}
        {band.tagline && (
          <p className="text-xs text-[#AAAAAA] mt-0.5 truncate">{band.tagline}</p>
        )}
      </div>

      {/* Chips */}
      <div className="hidden sm:flex items-center gap-2 shrink-0">
        {band.artist_type && (
          <span className="text-xs text-[#888888] bg-[#F5F5F5] border border-[#E8E8E8] rounded-md px-2 py-1 capitalize">
            {band.artist_type === 'solo' ? 'Solo' : 'Band'}
          </span>
        )}
        {band.touring_radius && (
          <span className="text-xs text-[#888888] bg-[#F5F5F5] border border-[#E8E8E8] rounded-md px-2 py-1">
            {RADIUS_LABELS[band.touring_radius]}
          </span>
        )}
      </div>
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
    return `/dashboard/bands?${params.toString()}`
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
    genre?: string
    radius?: string
    artistType?: string
    page?: string
    view?: string
  }>
}

export default async function DashboardBandsPage({ searchParams }: PageProps) {
  const filters = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return redirect('/login')

  const { count: myBandCount } = await supabase
    .from('bands')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)

  const tab = filters.tab ?? ((myBandCount ?? 0) > 0 ? 'mine' : 'directory')
  const page = Math.max(1, parseInt(filters.page ?? '1', 10))
  const hasFilters = !!(filters.q || filters.genre || filters.radius || filters.artistType)
  const fullListMode = hasFilters || filters.view === 'all'

  const { data: allGenres } = await supabase.from('genres').select('id, name').order('name')

  function tabHref(t: string) {
    return `/dashboard/bands?tab=${t}`
  }

  // ── My Bands tab ───────────────────────────────────────────
  if (tab === 'mine') {
    const { data: rawMyBands } = await supabase
      .from('bands')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    const myBands = rawMyBands as Band[] | null

    return (
      <div className="max-w-5xl mx-auto px-6 py-8">
        <Tabs active="mine" tabHref={tabHref} hasMine={(myBandCount ?? 0) > 0} mineCount={myBandCount ?? 0} />

        {!myBands || myBands.length === 0 ? (
          <div className="bg-white border border-[#E8E8E8] rounded-xl p-16 text-center">
            <p className="text-[#888888] mb-4">You haven&apos;t added any bands yet.</p>
            <Link
              href="/dashboard/bands/new"
              className="inline-block bg-[#FD6A2F] text-white text-sm font-semibold rounded-lg px-5 py-2.5 hover:bg-[#E55A22] transition-colors"
            >
              Create your first band
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {myBands.map((band) => (
              <div
                key={band.id}
                className="bg-white border border-[#E8E8E8] rounded-xl p-5 flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-[#F0F0F0] border border-[#E8E8E8] shrink-0 overflow-hidden flex items-center justify-center">
                    {band.profile_photo_url ? (
                      <Image src={band.profile_photo_url} alt={band.name} width={40} height={40} className="object-cover w-full h-full" unoptimized />
                    ) : (
                      <span className="text-sm font-bold text-[#CCCCCC]">{band.name.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{band.name}</p>
                    {(band.location_city || band.location_state) && (
                      <p className="text-sm text-[#888888] mt-0.5">
                        {[band.location_city, band.location_state].filter(Boolean).join(', ')}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <Link
                    href={`/bands/${band.slug}`}
                    target="_blank"
                    className="text-sm text-[#888888] hover:text-[#252525] transition-colors"
                  >
                    View
                  </Link>
                  <Link
                    href={`/dashboard/bands/${band.id}/edit`}
                    className="text-sm font-medium bg-[#F5F5F5] border border-[#E8E8E8] rounded-lg px-3 py-1.5 hover:border-[#CCCCCC] transition-colors"
                  >
                    Edit
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ── Directory tab ──────────────────────────────────────────
  let baseQuery = supabase
    .from('bands')
    .select('*')
    .eq('is_active', true)

  let fuzzyMatches: Array<{ id: string; rank: number }> | null = null
  if (filters.q) {
    const { data } = await supabase.rpc('search_bands_fuzzy', {
      p_query: filters.q,
    })

    fuzzyMatches = ((data ?? []) as Array<{ id: string; rank: number }>).filter((match) => !!match.id)

    if (fuzzyMatches.length === 0) {
      baseQuery = baseQuery.in('id', ['00000000-0000-0000-0000-000000000000'])
    } else {
      baseQuery = baseQuery.in('id', fuzzyMatches.map((match) => match.id))
    }
  }
  if (filters.radius) baseQuery = baseQuery.eq('touring_radius', filters.radius)
  if (filters.artistType) baseQuery = baseQuery.eq('artist_type', filters.artistType)
  if (filters.genre) {
    const { data: rawBandIds } = await supabase
      .from('band_genres').select('band_id').eq('genre_id', filters.genre)
    const bandIds = rawBandIds as { band_id: string }[] | null
    baseQuery = baseQuery.in('id', (bandIds ?? []).map((b) => b.band_id))
  }

  // Featured mode
  if (!fullListMode) {
    const { data: rawBands } = await baseQuery.order('created_at', { ascending: false })
    const allBands = rawBands as Band[] | null
    const total = allBands?.length ?? 0
    const featured = (allBands ?? []).slice(0, FEATURED_COUNT)

    return (
      <div className="max-w-5xl mx-auto px-6 py-8">
        <Tabs active="directory" tabHref={tabHref} hasMine={(myBandCount ?? 0) > 0} mineCount={myBandCount ?? 0} />
        <Suspense>
          <DashboardBandFilters genres={allGenres ?? []} />
        </Suspense>

        {featured.length === 0 ? (
          <div className="bg-white border border-[#E8E8E8] rounded-xl p-16 text-center">
            <p className="text-[#888888]">No bands found.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 mb-6">
              {featured.map((band) => <BandCard key={band.id} band={band} />)}
            </div>
            {total > FEATURED_COUNT && (
              <div className="text-center">
                <Link
                  href="/dashboard/bands?tab=directory&view=all"
                  className="inline-flex items-center gap-1.5 text-sm text-[#888888] hover:text-[#252525] transition-colors"
                >
                  View all {total} bands
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    )
  }

  // Full list mode
  const showStateGroupings = !hasFilters

  const orderedQuery = showStateGroupings
    ? baseQuery.order('location_state').order('name')
    : baseQuery.order('name')

  const { data: rawOrderedBands } = await orderedQuery
  const allBands = ((filters.q && fuzzyMatches)
    ? sortItemsByRank((rawOrderedBands as Band[] | null) ?? [], fuzzyMatches)
    : ((rawOrderedBands as Band[] | null) ?? []))
  const total = allBands?.length ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)
  const pageBands = (allBands ?? []).slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const grouped: { state: string; bands: Band[] }[] = []
  if (showStateGroupings) {
    for (const band of pageBands) {
      const stateKey = band.location_state ?? '??'
      const last = grouped[grouped.length - 1]
      if (last && last.state === stateKey) {
        last.bands.push(band)
      } else {
        grouped.push({ state: stateKey, bands: [band] })
      }
    }
  }

  const searchParamsRecord = Object.fromEntries(
    Object.entries(filters).filter(([, v]) => v != null)
  ) as Record<string, string>

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <Tabs active="directory" tabHref={tabHref} hasMine={(myBandCount ?? 0) > 0} mineCount={myBandCount ?? 0} />
      <Suspense>
        <DashboardBandFilters genres={allGenres ?? []} />
      </Suspense>

      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-[#888888]">
          {total} band{total !== 1 ? 's' : ''}{hasFilters ? ' matching your filters' : ''}
        </p>
        {hasFilters && (
          <Link
            href="/dashboard/bands?tab=directory"
            className="text-xs text-[#888888] hover:text-[#FD6A2F] transition-colors"
          >
            Clear filters
          </Link>
        )}
      </div>

      {pageBands.length === 0 ? (
        <div className="bg-white border border-[#E8E8E8] rounded-xl p-16 text-center">
          <p className="text-[#888888]">No bands found. Try adjusting your filters.</p>
        </div>
      ) : showStateGroupings ? (
        <div className="space-y-8">
          {grouped.map(({ state, bands }) => (
            <div key={state}>
              <p className="text-xs font-semibold text-[#AAAAAA] uppercase tracking-widest mb-3">
                {STATE_ABBR_TO_NAME[state] ?? state}
              </p>
              <div className="grid grid-cols-1 gap-4">
                {bands.map((band) => <BandCard key={band.id} band={band} />)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {pageBands.map((band) => <BandCard key={band.id} band={band} />)}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} searchParams={searchParamsRecord} />
    </div>
  )
}

function Tabs({ active, tabHref, hasMine, mineCount = 0 }: {
  active: string
  tabHref: (t: string) => string
  hasMine: boolean
  mineCount?: number
}) {
  if (!hasMine) {
    return <h1 className="text-2xl font-bold mb-6">Artist Directory</h1>
  }

  return (
    <div className="flex items-center justify-between mb-6 border-b border-[#E8E8E8]">
      <div className="flex items-center gap-1">
        {[
          { key: 'mine', label: mineCount === 1 ? 'Artist Profile' : 'Managed Artists' },
          { key: 'directory', label: 'Directory' },
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
      <Link
        href="/dashboard/bands/new"
        className="mb-px text-sm font-semibold bg-[#FD6A2F] text-white rounded-lg px-4 py-1.5 hover:bg-[#E55A22] transition-colors"
      >
        + Add Artist
      </Link>
    </div>
  )
}
