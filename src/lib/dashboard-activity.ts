import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Event, EventArtistMembership } from '@/types/database'
import type { ActiveIdentity, ManagedIdentity } from './managed-identity'

export type DashboardEvent = Pick<
  Event,
  'id' | 'venue_id' | 'title' | 'slug' | 'event_date' | 'start_time' | 'needed_artist_count' | 'status' | 'is_accepting_artists'
> & {
  venues: { name: string; location_city: string; location_state: string } | null
  event_artist_memberships: Array<Pick<EventArtistMembership, 'status'>> | null
}

export type DashboardMembership = {
  id: string
  band_id: string
  status: EventArtistMembership['status']
  events: DashboardEvent | DashboardEvent[] | null
}

export type DashboardClaim = {
  id: string
  venue_id: string
  venues: { name: string } | null
}

export type DashboardAction = {
  id: string
  kind: 'invite' | 'applications' | 'removals' | 'draft' | 'artists'
  event: DashboardEvent
  profileLabel?: string
  count: number
}

export type DashboardScheduleItem = {
  event: DashboardEvent
  isVenue: boolean
  artists: Array<{ id: string; name: string; status: EventArtistMembership['status'] }>
}

type DashboardScope = { activeIdentity: ActiveIdentity; identities: ManagedIdentity[] }

function scopedProfiles({ activeIdentity, identities }: DashboardScope) {
  return identities.filter((identity) => activeIdentity.kind === 'all' || (
    identity.kind === activeIdentity.kind && identity.id === activeIdentity.id
  ))
}

function compareEvents(a: DashboardEvent, b: DashboardEvent) {
  return `${a.event_date}T${a.start_time}`.localeCompare(`${b.event_date}T${b.start_time}`) || a.id.localeCompare(b.id)
}

export function buildDashboardActivity({
  activeIdentity,
  identities,
  venueEvents,
  artistMemberships,
  pendingClaims,
  todayIso,
}: DashboardScope & {
  venueEvents: DashboardEvent[]
  artistMemberships: DashboardMembership[]
  pendingClaims: DashboardClaim[]
  todayIso: string
}) {
  const profiles = scopedProfiles({ activeIdentity, identities })
  const bandNames = new Map(profiles.filter((p) => p.kind === 'band').map((p) => [p.id, p.name]))
  const venueNames = new Map(profiles.filter((p) => p.kind === 'venue').map((p) => [p.id, p.name]))
  const showProfiles = activeIdentity.kind === 'all'
  const isCurrent = (event: DashboardEvent) => event.event_date >= todayIso && ['draft', 'active'].includes(event.status)
  const actions: DashboardAction[] = []
  const schedule = new Map<string, DashboardScheduleItem>()
  const waiting: Array<{ id: string; event: DashboardEvent; kind: 'application' | 'removal'; profileLabel?: string }> = []

  for (const event of venueEvents) {
    if (!venueNames.has(event.venue_id) || !isCurrent(event)) continue
    const profileLabel = showProfiles ? venueNames.get(event.venue_id) : undefined
    const addAction = (kind: DashboardAction['kind'], count = 1) => {
      actions.push({ id: `${event.id}-${kind}`, kind, event, profileLabel, count })
    }
    const memberships = event.event_artist_memberships ?? []
    const applications = memberships.filter((m) => m.status === 'applied').length
    const removals = memberships.filter((m) => m.status === 'removal_requested').length
    if (applications) addAction('applications', applications)
    if (removals) addAction('removals', removals)
    if (event.status === 'draft') {
      addAction('draft')
      continue
    }
    const accepted = memberships.filter((m) => m.status === 'accepted' || m.status === 'removal_requested').length
    const openSpots = Math.max(0, event.needed_artist_count - accepted)
    if (event.is_accepting_artists && openSpots && !applications) addAction('artists', openSpots)
    schedule.set(event.id, { event, isVenue: true, artists: [] })
  }

  for (const membership of artistMemberships) {
    const event = Array.isArray(membership.events) ? membership.events[0] : membership.events
    if (!event || !bandNames.has(membership.band_id) || !isCurrent(event) || event.status !== 'active') continue
    const profileLabel = showProfiles ? bandNames.get(membership.band_id) : undefined
    if (membership.status === 'invited') {
      actions.push({ id: membership.id, kind: 'invite', event, profileLabel, count: 1 })
    }
    if (membership.status === 'applied' || membership.status === 'removal_requested') {
      waiting.push({ id: membership.id, event, kind: membership.status === 'applied' ? 'application' : 'removal', profileLabel })
    }
    if (membership.status === 'accepted' || membership.status === 'removal_requested') {
      const item = schedule.get(event.id) ?? { event, isVenue: false, artists: [] }
      item.artists.push({ id: membership.band_id, name: bandNames.get(membership.band_id)!, status: membership.status })
      schedule.set(event.id, item)
    }
  }

  const priority = { invite: 0, applications: 0, removals: 0, draft: 1, artists: 2 }
  actions.sort((a, b) => priority[a.kind] - priority[b.kind] || compareEvents(a.event, b.event) || a.id.localeCompare(b.id))
  waiting.sort((a, b) => compareEvents(a.event, b.event) || a.id.localeCompare(b.id))
  const claims = pendingClaims.filter((claim) => activeIdentity.kind === 'all' || (
    activeIdentity.kind === 'venue' && claim.venue_id === activeIdentity.id
  ))
  return { actions, upcoming: [...schedule.values()].sort((a, b) => compareEvents(a.event, b.event)), waiting, claims }
}

const EVENT_SELECT = `
  id, venue_id, title, slug, event_date, start_time, needed_artist_count, status, is_accepting_artists,
  venues(name, location_city, location_state), event_artist_memberships(status)
`

// Load every matching page before prioritizing actions or selecting the next shows.
// An arbitrary early limit can hide an invite behind already accepted memberships.
async function readPages<T>(read: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>) {
  const rows: T[] = []
  const pageSize = 200
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await read(from, from + pageSize - 1)
    if (error) throw new Error(error.message)
    rows.push(...(data ?? []))
    if (!data || data.length < pageSize) return rows
  }
}

export async function loadDashboardActivity(
  supabase: SupabaseClient<Database>,
  scope: DashboardScope & { userId: string },
  todayIso = new Date().toISOString().slice(0, 10)
) {
  const profiles = scopedProfiles(scope)
  const bandIds = profiles.filter((p) => p.kind === 'band').map((p) => p.id)
  const venueIds = profiles.filter((p) => p.kind === 'venue').map((p) => p.id)
  const [venueEvents, artistMemberships, pendingClaims] = await Promise.all([
    venueIds.length ? readPages((from, to) => supabase.from('events')
      .select(EVENT_SELECT).in('venue_id', venueIds).in('status', ['draft', 'active'])
      .gte('event_date', todayIso).order('event_date').order('start_time').order('id').range(from, to)) : [],
    bandIds.length ? readPages((from, to) => supabase.from('event_artist_memberships')
      .select(`id, band_id, status, events!inner(${EVENT_SELECT})`)
      .in('band_id', bandIds).in('status', ['applied', 'invited', 'accepted', 'removal_requested'])
      .eq('events.status', 'active').gte('events.event_date', todayIso)
      .order('id').range(from, to)) : [],
    scope.activeIdentity.kind !== 'band' ? readPages((from, to) => {
      let query = supabase.from('venue_claims').select('id, venue_id, venues(name)')
        .eq('user_id', scope.userId).eq('status', 'pending')
      if (scope.activeIdentity.kind === 'venue') query = query.eq('venue_id', scope.activeIdentity.id)
      return query.order('created_at').order('id').range(from, to)
    }) : [],
  ])
  return buildDashboardActivity({
    ...scope, todayIso,
    venueEvents: venueEvents as unknown as DashboardEvent[],
    artistMemberships: artistMemberships as unknown as DashboardMembership[],
    pendingClaims: pendingClaims as unknown as DashboardClaim[],
  })
}
