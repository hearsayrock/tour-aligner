import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import type { ActiveIdentity, ManagedIdentity } from './managed-identity'
import type { buildDashboardActivity, DashboardEvent } from './dashboard-activity'
import type { DiscoveryProfile } from './dashboard-discovery'
// @ts-expect-error Node's TypeScript runner requires the explicit extension.
import { dashboardStartingPoint, loadDashboardDiscovery, rankDiscoveryProfiles } from './dashboard-discovery.ts'

type Activity = ReturnType<typeof buildDashboardActivity>
const today = '2026-11-01'
const rock = { id: 'rock', name: 'Rock' }
const artist: ManagedIdentity = { kind: 'band', id: 'artist', name: 'Artist', href: '/dashboard/bands/artist/edit' }
const venue: ManagedIdentity = { kind: 'venue', id: 'venue', name: 'Venue', href: '/dashboard/venues/venue/edit' }
const context = { location_city: 'Salt Lake City', location_state: 'UT', genres: [rock] }
const activity = (overrides: Partial<Activity> = {}): Activity => ({ actions: [], upcoming: [], waiting: [], claims: [], ...overrides })
const event: DashboardEvent = {
  id: 'event', venue_id: venue.id, title: 'Friday Night', slug: 'friday', event_date: today,
  start_time: '20:00:00', status: 'active', is_accepting_artists: true, needed_artist_count: 3,
  venues: { name: venue.name, location_city: context.location_city, location_state: context.location_state }, event_artist_memberships: [],
}
function profile(id: string, overrides: Partial<DiscoveryProfile> = {}): DiscoveryProfile {
  return {
    id, name: id, slug: id, location_city: 'Salt Lake City', location_state: 'UT',
    cover_photo_url: null, profile_photo_url: null, venue_genres: [{ genres: rock }], ...overrides,
  }
}

test('starting points distinguish quiet artists, venue drafts, event creation and busy schedules', () => {
  assert.equal(dashboardStartingPoint(activity(), 'band'), 'artist')
  assert.equal(dashboardStartingPoint(activity(), 'venue'), 'create')
  assert.equal(dashboardStartingPoint(activity({ waiting: [{ id: 'application', event, kind: 'application' }] }), 'band'), 'artist')
  assert.equal(dashboardStartingPoint(activity({ actions: [{ id: 'draft', kind: 'draft', event: { ...event, status: 'draft' }, count: 1 }] }), 'venue'), 'draft')
  assert.equal(dashboardStartingPoint(activity({ upcoming: [{ event, isVenue: true, artists: [] }] }), 'venue'), null)
})

test('suggestions prioritize actual shared genres and location, deduplicate pools, and keep only three', () => {
  const local = profile('local')
  const distant = profile('distant', { location_city: 'Portland', location_state: 'OR' })
  const sameState = profile('state', { location_city: 'Provo' })
  const generic = profile('generic', { location_city: 'Austin', location_state: 'TX', venue_genres: [] })
  const result = rankDiscoveryProfiles([generic, distant, local, sameState, local], context, 'venues')
  assert.deepEqual(result.map((row) => row.id), ['local', 'state', 'distant'])
  assert.equal(result[0].reason, 'Shared genres: Rock')
})

test('a city name in another state and missing location never produce a local-match claim', () => {
  const rows = [profile('other-state', { location_state: 'OR', venue_genres: [] }), profile('unknown', { location_city: null, location_state: null, venue_genres: [] })]
  assert.equal(rankDiscoveryProfiles(rows, context, 'venues').every((row) => row.reason === null), true)
  assert.equal(rankDiscoveryProfiles(rows, { location_city: null, location_state: null, genres: [] }, 'venues').every((row) => row.reason === null), true)
})

test('artist suggestions exclude the event roster and link to real artist profiles', () => {
  const rows = [profile('accepted'), profile('invited'), profile('new')]
  const result = rankDiscoveryProfiles(rows, context, 'artists', new Set(['accepted', 'invited']))
  assert.deepEqual(result.map((row) => row.href), ['/bands/new'])
})

test('suggestion cards use existing cover or profile photos and do not invent genre matches', () => {
  const result = rankDiscoveryProfiles([
    profile('cover', { cover_photo_url: 'https://example.com/cover.jpg', profile_photo_url: 'https://example.com/profile.jpg' }),
    profile('photo', { profile_photo_url: 'https://example.com/profile.jpg', venue_genres: [] }),
  ], context, 'venues')
  assert.equal(result[0].imageUrl, 'https://example.com/cover.jpg')
  assert.equal(result[1].imageUrl, 'https://example.com/profile.jpg')
  assert.equal(result[1].reason, 'Based in Salt Lake City')
})

function mockClient(respond: (url: URL) => unknown = () => []) {
  const requests: URL[] = []
  const supabase = createClient<Database>('https://example.supabase.co', 'test-key', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: async (input) => {
      const url = new URL(String(input))
      requests.push(url)
      const result = respond(url)
      return result instanceof Response ? result : new Response(JSON.stringify(result), { headers: { 'Content-Type': 'application/json' } })
    } },
  })
  return { supabase, requests }
}

test('artist discovery scopes profile context to the selected owned artist and excludes unlisted/inactive venues', async () => {
  const { supabase, requests } = mockClient((url) => url.pathname.endsWith('/bands')
    ? profile(artist.id, { band_genres: [{ genres: rock }], venue_genres: undefined }) : [])
  await loadDashboardDiscovery(supabase, { userId: 'owner', activeIdentity: artist, activity: activity() }, today)
  const bandRequest = requests.find((url) => url.pathname.endsWith('/bands'))!
  assert.equal(bandRequest.searchParams.get('id'), 'eq.artist')
  assert.equal(bandRequest.searchParams.get('user_id'), 'eq.owner')
  const venues = requests.filter((url) => url.pathname.endsWith('/venues'))
  assert.equal(venues.length, 3)
  assert.equal(venues.every((url) => url.searchParams.get('is_active') === 'eq.true' && url.searchParams.get('is_unlisted') === 'eq.false'), true)
  assert.equal(venues.every((url) => url.searchParams.get('or') === '(capacity.is.null,capacity.lte.2500)'), true)
  assert.equal(venues.some((url) => url.searchParams.get('location_city') === 'eq.Salt Lake City'), true)
  const genres = requests.find((url) => url.pathname.endsWith('/venue_genres'))!
  assert.equal(genres.searchParams.get('genre_id'), 'in.(rock)')
  assert.equal(genres.searchParams.get('venues.is_unlisted'), 'eq.false')
  assert.equal(genres.searchParams.get('venues.or'), '(capacity.is.null,capacity.lte.2500)')
})

test('open-date hints require a public active accepting event with space; removal requests still occupy a spot', async () => {
  const { supabase, requests } = mockClient((url) => {
    if (url.pathname.endsWith('/bands')) return profile(artist.id, { band_genres: [{ genres: rock }], venue_genres: undefined })
    if (url.pathname.endsWith('/venues')) return [profile('open'), profile('full')]
    if (url.pathname.endsWith('/events')) return [
      { venue_id: 'open', event_date: '2026-11-06', needed_artist_count: 2, event_artist_memberships: [{ status: 'accepted' }] },
      { venue_id: 'full', event_date: '2026-11-06', needed_artist_count: 1, event_artist_memberships: [{ status: 'removal_requested' }] },
    ]
    return []
  })
  const result = await loadDashboardDiscovery(supabase, { userId: 'owner', activeIdentity: artist, activity: activity() }, today)
  assert.equal(result.cards.find((card) => card.id === 'open')?.reason, 'Artists wanted Nov 6')
  assert.equal(result.cards.find((card) => card.id === 'full')?.reason, 'Shared genres: Rock')
  const request = requests.find((url) => url.pathname.endsWith('/events'))!
  assert.equal(request.searchParams.get('is_public'), 'eq.true')
  assert.equal(request.searchParams.get('is_accepting_artists'), 'eq.true')
  assert.equal(request.searchParams.get('status'), 'eq.active')
  assert.equal(request.searchParams.get('event_date'), `gte.${today}`)
})

test('profile nudges appear only for missing information used by suggestions', async () => {
  const { supabase } = mockClient((url) => url.pathname.endsWith('/bands') ? profile(artist.id, { band_genres: [], venue_genres: undefined }) : [])
  const result = await loadDashboardDiscovery(supabase, { userId: 'owner', activeIdentity: artist, activity: activity() }, today)
  assert.equal(result.profileHint?.href, artist.href)
  assert.match(result.profileHint?.text ?? '', /genres/)
})

test('venue discovery uses the selected venue, event genres and current roster', async () => {
  const { supabase, requests } = mockClient((url) => {
    if (url.pathname.endsWith('/venues')) return profile(venue.id)
    if (url.pathname.endsWith('/event_genres')) return [{ genres: rock }]
    if (url.pathname.endsWith('/event_artist_memberships')) return [{ band_id: 'existing' }]
    if (url.pathname.endsWith('/bands')) return [profile('existing', { band_genres: [{ genres: rock }] }), profile('new', { band_genres: [{ genres: rock }] })]
    return []
  })
  const result = await loadDashboardDiscovery(supabase, { userId: 'owner', activeIdentity: venue, activity: activity({ upcoming: [{ event, isVenue: true, artists: [] }] }) }, today)
  assert.equal(result.kind, 'artists')
  assert.equal(result.event?.id, event.id)
  assert.deepEqual(result.cards.map((card) => card.id), ['new'])
  const venueRequest = requests.find((url) => url.pathname.endsWith('/venues'))!
  assert.equal(venueRequest.searchParams.get('claimed_by_user_id'), 'eq.owner')
  assert.equal(venueRequest.searchParams.get('id'), 'eq.venue')
  const roster = requests.find((url) => url.pathname.endsWith('/event_artist_memberships'))!
  assert.equal(roster.searchParams.get('event_id'), 'eq.event')
  assert.equal(roster.searchParams.get('status'), 'in.(applied,invited,accepted,removal_requested)')
})

test('busy artists, all-profile views and venues without an open event make no discovery requests', async () => {
  const { supabase, requests } = mockClient()
  const scenarios: Array<{ activeIdentity: ActiveIdentity; activity: Activity }> = [
    { activeIdentity: { kind: 'all' }, activity: activity() },
    { activeIdentity: venue, activity: activity() },
    { activeIdentity: artist, activity: activity({ upcoming: [{ event, isVenue: false, artists: [] }] }) },
    { activeIdentity: venue, activity: activity({ upcoming: [{ event: { ...event, is_accepting_artists: false }, isVenue: true, artists: [] }] }) },
  ]
  for (const scenario of scenarios) assert.equal((await loadDashboardDiscovery(supabase, { userId: 'owner', ...scenario }, today)).kind, null)
  assert.equal(requests.length, 0)
})

test('failed suggestion reads are reported instead of fabricated as an empty directory', async () => {
  const { supabase } = mockClient(() => new Response(JSON.stringify({ message: 'Read failed' }), { status: 403 }))
  await assert.rejects(loadDashboardDiscovery(supabase, { userId: 'owner', activeIdentity: artist, activity: activity() }, today), { message: 'Read failed' })
})
