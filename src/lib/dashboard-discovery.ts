import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import type { ActiveIdentity } from './managed-identity'
import type { buildDashboardActivity, DashboardEvent } from './dashboard-activity'

type Activity = ReturnType<typeof buildDashboardActivity>
type Genre = { id: string; name: string }
type GenreLink = { genres: Genre | Genre[] | null }

export type DiscoveryProfile = {
  id: string
  name: string
  slug: string
  location_city: string | null
  location_state: string | null
  profile_photo_url: string | null
  cover_photo_url: string | null
  band_genres?: GenreLink[] | null
  venue_genres?: GenreLink[] | null
}

export type DiscoveryCard = {
  id: string
  name: string
  href: string
  imageUrl: string | null
  location: string
  genres: string[]
  reason: string | null
}

export type DashboardDiscovery = {
  kind: 'venues' | 'artists' | null
  cards: DiscoveryCard[]
  event: Pick<DashboardEvent, 'id' | 'title'> | null
  profileHint: { text: string; href: string } | null
  available: boolean
}

export const EMPTY_DISCOVERY: DashboardDiscovery = { kind: null, cards: [], event: null, profileHint: null, available: true }

export function dashboardStartingPoint(activity: Activity, profileKind: ActiveIdentity['kind']) {
  if (activity.upcoming.length) return null
  if (profileKind === 'band') return 'artist' as const
  if (activity.actions.some((action) => action.kind === 'draft')) return 'draft' as const
  return profileKind === 'venue' ? 'create' as const : 'profiles' as const
}

export function discoveryGenres(profile: DiscoveryProfile): Genre[] {
  return [...new Map((profile.band_genres ?? profile.venue_genres ?? [])
    .flatMap((link) => Array.isArray(link.genres) ? link.genres : link.genres ? [link.genres] : [])
    .map((genre) => [genre.id, genre])).values()]
}

const normalize = (value: string | null) => value?.trim().toLowerCase() ?? ''

export function rankDiscoveryProfiles(
  profiles: DiscoveryProfile[],
  context: { location_city: string | null; location_state: string | null; genres: Genre[] },
  kind: 'venues' | 'artists',
  excludedIds: Set<string> = new Set()
): DiscoveryCard[] {
  const genreIds = new Set(context.genres.map((genre) => genre.id))
  return [...new Map(profiles.map((profile) => [profile.id, profile])).values()]
    .filter((profile) => !excludedIds.has(profile.id))
    .map((profile) => {
      const genres = discoveryGenres(profile)
      const shared = genres.filter((genre) => genreIds.has(genre.id))
      // A shared city name alone is not evidence of a local match.
      const sameState = !!normalize(context.location_state) && normalize(context.location_state) === normalize(profile.location_state)
      const sameCity = sameState && !!normalize(context.location_city) && normalize(context.location_city) === normalize(profile.location_city)
      const reason = shared.length ? `Shared genres: ${shared.slice(0, 2).map((genre) => genre.name).join(', ')}`
        : sameCity ? `Based in ${profile.location_city}`
          : sameState ? `Based in ${profile.location_state}` : null
      return {
        score: shared.length * 10 + (sameCity ? 5 : sameState ? 2 : 0),
        card: {
          id: profile.id, name: profile.name,
          href: `/${kind === 'venues' ? 'venues' : 'bands'}/${profile.slug}`,
          imageUrl: profile.cover_photo_url || profile.profile_photo_url,
          location: [profile.location_city, profile.location_state].filter(Boolean).join(', '),
          genres: genres.slice(0, 3).map((genre) => genre.name), reason,
        },
      }
    })
    .sort((a, b) => b.score - a.score || a.card.name.localeCompare(b.card.name) || a.card.id.localeCompare(b.card.id))
    .slice(0, 3).map((item) => item.card)
}

const PROFILE_FIELDS = 'id, name, slug, location_city, location_state, profile_photo_url, cover_photo_url'
const VENUE_SELECT = `${PROFILE_FIELDS}, venue_genres(genres(id, name))`
const ARTIST_SELECT = `${PROFILE_FIELDS}, band_genres(genres(id, name))`

// Combine a bounded genre pool, a local pool, and a directory fallback. Matching
// is filtered in the database, so a distant alphabetical page cannot hide locals.
async function loadCandidates(
  supabase: SupabaseClient<Database>,
  kind: 'venues' | 'artists',
  context: { location_city: string | null; location_state: string | null; genres: Genre[] }
) {
  const venues = kind === 'venues'
  const profileQuery = (location: 'city' | 'state' | null) => {
    if (venues) {
      let query = supabase.from('venues').select(VENUE_SELECT).eq('is_active', true).eq('is_unlisted', false)
        .or('capacity.is.null,capacity.lte.2500')
      if (location) query = query.eq('location_state', context.location_state!)
      if (location === 'city') query = query.eq('location_city', context.location_city!)
      return query.order('name').order('id').limit(location ? 12 : 3)
    }
    let query = supabase.from('bands').select(ARTIST_SELECT).eq('is_active', true)
    if (location) query = query.eq('location_state', context.location_state!)
    if (location === 'city') query = query.eq('location_city', context.location_city!)
    return query.order('name').order('id').limit(18)
  }
  const [fallback, local, city, genreMatches] = await Promise.all([
    profileQuery(null),
    context.location_state ? profileQuery('state') : { data: [], error: null },
    context.location_city && context.location_state ? profileQuery('city') : { data: [], error: null },
    context.genres.length ? (venues
      ? supabase.from('venue_genres')
        .select(`venue_id, venues!inner(${VENUE_SELECT})`)
        .in('genre_id', context.genres.map((genre) => genre.id))
        .eq('venues.is_active', true).eq('venues.is_unlisted', false)
        .or('capacity.is.null,capacity.lte.2500', { referencedTable: 'venues' }).order('venue_id').limit(36)
      : supabase.from('band_genres')
        .select(`band_id, bands!inner(${ARTIST_SELECT})`)
        .in('genre_id', context.genres.map((genre) => genre.id))
        .eq('bands.is_active', true).order('band_id').limit(36)) : { data: [], error: null },
  ])
  for (const result of [fallback, local, city, genreMatches]) if (result.error) throw new Error(result.error.message)
  const joined = (genreMatches.data ?? []) as unknown as Array<{ venues?: DiscoveryProfile | DiscoveryProfile[] | null; bands?: DiscoveryProfile | DiscoveryProfile[] | null }>
  return [
    ...(fallback.data ?? []) as unknown as DiscoveryProfile[],
    ...(local.data ?? []) as unknown as DiscoveryProfile[],
    ...(city.data ?? []) as unknown as DiscoveryProfile[],
    ...joined.flatMap((row) => {
      const profile = venues ? row.venues : row.bands
      return Array.isArray(profile) ? profile : profile ? [profile] : []
    }),
  ]
}

export async function loadDashboardDiscovery(
  supabase: SupabaseClient<Database>,
  { userId, activeIdentity, activity }: { userId: string; activeIdentity: ActiveIdentity; activity: Activity },
  todayIso = new Date().toISOString().slice(0, 10)
): Promise<DashboardDiscovery> {
  if (activeIdentity.kind === 'all') return EMPTY_DISCOVERY
  if (activeIdentity.kind === 'band') {
    if (activity.upcoming.length) return EMPTY_DISCOVERY
    const { data, error } = await supabase.from('bands').select(ARTIST_SELECT)
      .eq('id', activeIdentity.id).eq('user_id', userId).single()
    if (error) throw new Error(error.message)
    const profile = data as unknown as DiscoveryProfile
    const genres = discoveryGenres(profile)
    const candidates = await loadCandidates(supabase, 'venues', { ...profile, genres })
    const cards = rankDiscoveryProfiles(candidates, { ...profile, genres }, 'venues')
    // Only advertise open dates when a public, active event actually has room.
    if (cards.length) {
      const { data: events, error: eventError } = await supabase.from('events')
        .select('venue_id, event_date, needed_artist_count, event_artist_memberships(status)')
        .in('venue_id', cards.map((card) => card.id)).eq('status', 'active')
        .eq('is_public', true).eq('is_accepting_artists', true).gte('event_date', todayIso)
        .order('event_date').order('id').limit(60)
      if (eventError) throw new Error(eventError.message)
      for (const card of cards) {
        const event = (events ?? []).find((event) => event.venue_id === card.id &&
          ((event.event_artist_memberships ?? []) as Array<{ status: string }>).filter((m) => ['accepted', 'removal_requested'].includes(m.status)).length < event.needed_artist_count)
        if (event) card.reason = `Artists wanted ${new Date(`${event.event_date}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}`
      }
    }
    const profileHint = !genres.length ? { text: 'Add your genres for more relevant venue suggestions.', href: activeIdentity.href }
      : !profile.location_city || !profile.location_state ? { text: 'Add your location to help find venues in your area.', href: activeIdentity.href } : null
    return { kind: 'venues', cards, event: null, profileHint, available: true }
  }

  const event = activity.upcoming.find((item) => item.isVenue && item.event.is_accepting_artists &&
    (item.event.event_artist_memberships ?? []).filter((m) => ['accepted', 'removal_requested'].includes(m.status)).length < item.event.needed_artist_count)?.event
  if (!event) return EMPTY_DISCOVERY
  const [profileResult, genresResult, membershipResult] = await Promise.all([
    supabase.from('venues').select(VENUE_SELECT).eq('id', activeIdentity.id).eq('claimed_by_user_id', userId).single(),
    supabase.from('event_genres').select('genres(id, name)').eq('event_id', event.id),
    supabase.from('event_artist_memberships').select('band_id').eq('event_id', event.id)
      .in('status', ['applied', 'invited', 'accepted', 'removal_requested']),
  ])
  for (const result of [profileResult, genresResult, membershipResult]) if (result.error) throw new Error(result.error.message)
  const profile = profileResult.data as unknown as DiscoveryProfile
  const eventGenres = discoveryGenres({ ...profile, venue_genres: genresResult.data as unknown as GenreLink[] })
  const genres = eventGenres.length ? eventGenres : discoveryGenres(profile)
  const candidates = await loadCandidates(supabase, 'artists', { ...profile, genres })
  const excludedIds = new Set((membershipResult.data ?? []).map((m) => m.band_id))
  const cards = rankDiscoveryProfiles(candidates, { ...profile, genres }, 'artists', excludedIds)
  return { kind: 'artists', cards, event: { id: event.id, title: event.title }, profileHint: null, available: true }
}
