import Link from 'next/link'
import Image from 'next/image'
import { Suspense } from 'react'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getManagedUserData } from '@/lib/managed-user-data'
import { loadArtistFollowState } from '@/lib/artist-network-data'
import { DashboardBandFilters } from '@/components/bands/DashboardBandFilters'
import { ArtistConnectionActions } from '@/components/bands/ArtistConnectionActions'
import { ProfileSelectionModal } from '@/components/dashboard/ProfileSelectionModal'
import { EmptyState, PageHeader, cx } from '@/components/ui/primitives'
import { ACTIVE_IDENTITY_COOKIE, resolveRequiredActiveIdentity, type ManagedIdentity } from '@/lib/managed-identity'
import type { Band } from '@/types/database'

export const metadata = { title: 'Artists' }
const PAGE_SIZE = 25
const RADIUS_LABELS = { local: 'Local', regional: 'Regional', national: 'National', international: 'International' }
const VIEWS = [
  { value: 'all', label: 'All artists' },
  { value: 'similar', label: 'Similar genres' },
  { value: 'following', label: 'Following' },
  { value: 'followers', label: 'Followers' },
]

type Filters = { tab?: string; q?: string; genre?: string; radius?: string; artistType?: string; page?: string }

function directoryHref(filters: Filters, updates: Filters) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries({ ...filters, ...updates })) {
    if (value) params.set(key, value)
  }
  return `/dashboard/bands?${params.toString()}`
}

export default async function DashboardBandsPage({ searchParams }: { searchParams: Promise<Filters> }) {
  const filters = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return redirect('/login')

  const { bands: ownedBands, venues } = await getManagedUserData(user.id)
  const identities: ManagedIdentity[] = [
    ...ownedBands.map((band) => ({ kind: 'band' as const, id: band.id, name: band.name, href: `/dashboard/bands/${band.id}/edit` })),
    ...venues.map((venue) => ({ kind: 'venue' as const, id: venue.id, name: venue.name, href: `/dashboard/venues/${venue.id}/edit` })),
  ]
  const cookieStore = await cookies()
  const requiredIdentity = resolveRequiredActiveIdentity(cookieStore.get(ACTIVE_IDENTITY_COOKIE)?.value, identities)
  if (requiredIdentity.requiresSelection) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-8">
        <ProfileSelectionModal title="Select a profile to browse Artists" body="Choose the profile you want to use to browse artists and start private chats." identities={identities} />
      </div>
    )
  }

  const identity = requiredIdentity.activeIdentity
  const artistId = identity?.kind === 'band' ? identity.id : null
  const view = artistId && VIEWS.some((entry) => entry.value === filters.tab) ? filters.tab! : 'all'
  const parsedPage = Number(filters.page)
  let page = Number.isSafeInteger(parsedPage) && parsedPage > 0 ? Math.min(parsedPage, 100000) : 1
  const { data: genres } = await supabase.from('genres').select('id, name').order('name')
  const genreId = genres?.find((genre) => genre.id === filters.genre)?.id ?? null
  const query = () => supabase.rpc('search_artist_directory', {
    p_artist_id: artistId,
    p_view: view,
    p_query: filters.q?.trim() ?? '',
    p_genre_id: genreId,
    p_radius: filters.radius ?? '',
    p_artist_type: filters.artistType ?? '',
  }, { count: 'exact' }).range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

  let result = await query()
  // PostgREST may reject a stale page after unfollowing the last result on it.
  if (result.error?.code === 'PGRST103' && page > 1) {
    page = 1
    result = await query()
  }
  const totalPages = Math.max(1, Math.ceil((result.count ?? 0) / PAGE_SIZE))
  if (!result.error && page > totalPages) {
    page = totalPages
    result = await query()
  }
  const matches = result.data ?? []
  const ids = matches.map((match) => match.band_id)
  const [bandResult, genreResult, connections] = await Promise.all([
    ids.length ? supabase.from('bands').select('*').in('id', ids).eq('is_active', true) : Promise.resolve({ data: [], error: null }),
    ids.length ? supabase.from('band_genres').select('band_id, genre_id').in('band_id', ids) : Promise.resolve({ data: [], error: null }),
    artistId ? loadArtistFollowState(supabase, artistId, ids) : Promise.resolve({ following: new Set<string>(), followers: new Set<string>(), available: true }),
  ])
  const bandsById = new Map(((bandResult.data ?? []) as Band[]).map((band) => [band.id, band]))
  const genreNames = new Map((genres ?? []).map((genre) => [genre.id, genre.name]))
  const hasError = !!result.error || !!bandResult.error || !!genreResult.error
  const emptyDescription = view === 'similar'
    ? 'No artists share these genres with your profile yet. Check the genres on your artist profile or browse all artists.'
    : view === 'following'
      ? 'Artists you follow will appear here. Browse the directory to find someone to follow.'
      : view === 'followers'
        ? 'Artists who follow this profile will appear here.'
        : 'Try another name, city, genre, or touring range.'

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <PageHeader title="Artists" description="Find artists for your next bill. Browse their music, follow them, and start a private chat." />
      {artistId && (
        <nav aria-label="Artist directory views" className="mb-6 flex flex-wrap gap-2">
          {VIEWS.map((entry) => (
            <Link key={entry.value} href={directoryHref(filters, { tab: entry.value, page: undefined })} aria-current={view === entry.value ? 'page' : undefined} className={cx('rounded-xl border px-4 py-2 text-sm font-semibold', view === entry.value ? 'border-[#252525] bg-[#252525] text-white' : 'border-[#E8E8E8] bg-white text-[#666666] hover:border-[#CCCCCC]')}>
              {entry.label}
            </Link>
          ))}
        </nav>
      )}
      <Suspense><DashboardBandFilters genres={genres ?? []} /></Suspense>
      {view === 'similar' && <p className="mb-4 text-sm text-[#777777]">Artists with genres in common with {identity?.name}. More shared genres appear first.</p>}
      {view === 'following' && <p className="mb-4 text-sm text-[#777777]">Select Following on an artist to unfollow them.</p>}
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-[#888888]">{result.count ?? 0} artist{result.count === 1 ? '' : 's'}</p>
        <Link href={directoryHref({ tab: view }, {})} className="text-sm text-[#777777] hover:text-[#FD6A2F]">Clear filters</Link>
      </div>

      {hasError ? (
        <EmptyState title="Artists could not load" description="Refresh the page to try again." />
      ) : matches.length === 0 ? (
        <EmptyState title="No artists found" description={emptyDescription} action={
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/dashboard/bands" className="text-sm font-semibold text-[#FD6A2F]">Browse all artists</Link>
            {view === 'similar' && identity && <Link href={identity.href} className="text-sm font-semibold text-[#FD6A2F]">Edit your genres</Link>}
          </div>
        } />
      ) : (
        <div className="space-y-4">
          {matches.map((match) => {
            const band = bandsById.get(match.band_id)
            if (!band) return null
            const bandGenreNames = (genreResult.data ?? []).filter((row) => row.band_id === band.id).map((row) => genreNames.get(row.genre_id)).filter(Boolean)
            return (
              <article key={band.id} className="flex flex-col gap-4 rounded-2xl border border-[#E8E8E8] bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
                <Link href={`/bands/${band.slug}`} className="flex min-w-0 flex-1 items-start gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#E8E8E8] bg-[#F5F5F5]">
                    {band.profile_photo_url ? <Image src={band.profile_photo_url} alt={band.name} width={56} height={56} className="h-full w-full object-cover" unoptimized /> : <span className="text-lg font-bold text-[#BBBBBB]">{band.name.charAt(0).toUpperCase()}</span>}
                  </div>
                  <div className="min-w-0">
                    <h2 className="truncate font-bold text-[#252525]">{band.name}</h2>
                    <p className="mt-1 text-sm text-[#888888]">{[band.location_city, band.location_state].filter(Boolean).join(', ')}</p>
                    {band.tagline && <p className="mt-1 text-sm text-[#777777]">{band.tagline}</p>}
                    <div className="mt-2 flex flex-wrap gap-2">
                      {band.artist_type && <span className="rounded-md bg-[#F5F5F5] px-2 py-1 text-xs text-[#777777]">{band.artist_type === 'solo' ? 'Solo' : 'Band'}</span>}
                      {band.touring_radius && <span className="rounded-md bg-[#F5F5F5] px-2 py-1 text-xs text-[#777777]">{RADIUS_LABELS[band.touring_radius]}</span>}
                      {bandGenreNames.map((name) => <span key={name} className="rounded-md bg-[#F5F5F5] px-2 py-1 text-xs text-[#777777]">{name}</span>)}
                      {match.shared_genre_count > 0 && <span className="rounded-md bg-[#FFF3EE] px-2 py-1 text-xs text-[#A84216]">{match.shared_genre_count} shared genre{match.shared_genre_count === 1 ? '' : 's'}</span>}
                    </div>
                  </div>
                </Link>
                {identity && <ArtistConnectionActions key={`${identity.kind}:${identity.id}:${band.id}`} identity={identity} targetId={band.id} targetName={band.name} following={connections.following.has(band.id)} followsYou={connections.followers.has(band.id)} followAvailable={connections.available} />}
              </article>
            )
          })}
        </div>
      )}
      {!hasError && totalPages > 1 && (
        <nav aria-label="Artist directory pages" className="mt-8 flex items-center justify-center gap-4 text-sm">
          {page > 1 && <Link href={directoryHref(filters, { page: String(page - 1) })} className="font-semibold text-[#FD6A2F]">Previous</Link>}
          <span className="text-[#777777]">Page {page} of {totalPages}</span>
          {page < totalPages && <Link href={directoryHref(filters, { page: String(page + 1) })} className="font-semibold text-[#FD6A2F]">Next</Link>}
        </nav>
      )}
    </div>
  )
}
