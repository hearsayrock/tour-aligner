import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import type { ManagedIdentity } from './managed-identity'
import type { DashboardEvent, DashboardMembership } from './dashboard-activity'
// @ts-expect-error Node's TypeScript runner requires the explicit extension.
import { buildDashboardActivity, loadDashboardActivity } from './dashboard-activity.ts'

const today = '2026-11-01'
const venue: ManagedIdentity = { kind: 'venue', id: 'venue-one', name: 'Aces High Saloon', href: '/' }
const artist: ManagedIdentity = { kind: 'band', id: 'artist-one', name: 'Artist One', href: '/' }
const otherVenue: ManagedIdentity = { ...venue, id: 'venue-two', name: 'Second Venue' }
const otherArtist: ManagedIdentity = { ...artist, id: 'artist-two', name: 'Artist Two' }
const identities = [venue, artist, otherVenue, otherArtist]

function event(id: string, overrides: Partial<DashboardEvent> = {}): DashboardEvent {
  return {
    id, venue_id: venue.id, title: id, slug: id, event_date: today, start_time: '20:00:00',
    needed_artist_count: 3, status: 'active', is_accepting_artists: true,
    venues: { name: venue.name, location_city: 'Salt Lake City', location_state: 'UT' },
    event_artist_memberships: [], ...overrides,
  }
}

function membership(show: DashboardEvent, status: DashboardMembership['status'], bandId = artist.id): DashboardMembership {
  return { id: `${show.id}-${bandId}`, band_id: bandId, status, events: show }
}

function build(overrides: Partial<Parameters<typeof buildDashboardActivity>[0]> = {}) {
  return buildDashboardActivity({
    activeIdentity: { kind: 'all' }, identities, todayIso: today,
    venueEvents: [], artistMemberships: [], pendingClaims: [], ...overrides,
  })
}

test('past, completed and cancelled events never appear as upcoming or actionable; today remains upcoming', () => {
  const shows = [event('past', { event_date: '2026-10-31' }), event('done', { status: 'completed' }), event('cancelled', { status: 'cancelled' }), event('today')]
  const result = build({ venueEvents: shows, artistMemberships: shows.map((show) => membership(show, 'invited')) })
  assert.deepEqual(result.upcoming.map((row) => row.event.id), ['today'])
  assert.deepEqual(result.actions.map((row) => row.event.id), ['today', 'today'])
})

test('drafts require attention but do not take up schedule slots or generate recruiting tasks', () => {
  const draft = event('draft', { status: 'draft' })
  const result = build({ venueEvents: [draft], artistMemberships: [membership(draft, 'accepted')] })
  assert.deepEqual(result.actions.map((row) => row.kind), ['draft'])
  assert.equal(result.upcoming.length, 0)
})

test('decisions come before drafts and recruiting, ordered by date and time within priority', () => {
  const later = event('later', { start_time: '22:00:00', event_artist_memberships: [{ status: 'applied' }, { status: 'applied' }] })
  const early = event('early', { start_time: '18:00:00', event_artist_memberships: [{ status: 'removal_requested' }] })
  const result = build({ venueEvents: [event('recruit'), event('draft', { status: 'draft' }), later, early] })
  assert.deepEqual(result.actions.map((row) => [row.event.id, row.kind, row.count]), [
    ['early', 'removals', 1], ['later', 'applications', 2], ['draft', 'draft', 1], ['early', 'artists', 2], ['recruit', 'artists', 3],
  ])
})

test('closed recruiting and full lineups do not generate open-spot tasks', () => {
  const result = build({ venueEvents: [event('closed', { is_accepting_artists: false }), event('full', {
    event_artist_memberships: [{ status: 'accepted' }, { status: 'accepted' }, { status: 'removal_requested' }],
  })] })
  assert.deepEqual(result.actions.map((row) => row.kind), ['removals'])
  assert.equal(result.upcoming.length, 2)
})

test('artists respond to invites while applications and removal requests wait on the venue', () => {
  const result = build({ activeIdentity: artist, artistMemberships: [
    membership(event('invite'), 'invited'), membership(event('application'), 'applied'),
    membership(event('removal'), 'removal_requested'), membership(event('booked'), 'accepted'),
    membership(event('declined'), 'declined'), membership(event('removed'), 'removed'),
  ] })
  assert.deepEqual(result.actions.map((row) => row.kind), ['invite'])
  assert.deepEqual(result.waiting.map((row) => row.kind), ['application', 'removal'])
  assert.deepEqual(result.upcoming.map((row) => row.event.id), ['booked', 'removal'])
  assert.equal(result.actions[0].profileLabel, undefined)
})

test('selected profile suppresses other profiles and account-wide venue claims', () => {
  const claim = { id: 'claim', venue_id: otherVenue.id, venues: { name: otherVenue.name } }
  const data = {
    venueEvents: [event('venue-one'), event('venue-two', { venue_id: otherVenue.id })],
    artistMemberships: [membership(event('artist-one'), 'accepted'), membership(event('artist-two'), 'invited', otherArtist.id)],
    pendingClaims: [claim],
  }
  const venueResult = build({ ...data, activeIdentity: venue })
  assert.deepEqual(venueResult.upcoming.map((row) => row.event.id), ['venue-one'])
  assert.equal(venueResult.claims.length, 0)
  const artistResult = build({ ...data, activeIdentity: artist })
  assert.deepEqual(artistResult.upcoming.map((row) => row.event.id), ['artist-one'])
  assert.equal(artistResult.actions.length, 0)
  assert.equal(artistResult.claims.length, 0)
  assert.deepEqual(build(data).claims, [claim])
})

test('all profiles merge the same show into one schedule row and preserve each artist status', () => {
  const show = event('shared')
  const result = build({ venueEvents: [show], artistMemberships: [
    membership(show, 'accepted'), membership(show, 'removal_requested', otherArtist.id),
  ] })
  assert.equal(result.upcoming.length, 1)
  assert.equal(result.upcoming[0].isVenue, true)
  assert.deepEqual(result.upcoming[0].artists.map((row) => [row.name, row.status]), [['Artist One', 'accepted'], ['Artist Two', 'removal_requested']])
  assert.equal(result.actions[0].profileLabel, venue.name)
  assert.equal(result.waiting[0].profileLabel, otherArtist.name)
})

test('schedule orders same-day shows by start time, independent of membership fetch order', () => {
  const result = build({ artistMemberships: [
    membership(event('late', { start_time: '22:00:00' }), 'accepted'),
    membership(event('early', { start_time: '18:00:00' }), 'accepted'),
    membership(event('tomorrow', { event_date: '2026-11-02', start_time: '12:00:00' }), 'accepted'),
  ] })
  assert.deepEqual(result.upcoming.map((row) => row.event.id), ['early', 'late', 'tomorrow'])
})

function mockClient(respond: (url: URL) => unknown[] | Response = () => []) {
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

test('venue reads filter dates, statuses, claims and identity before pagination', async () => {
  const { supabase, requests } = mockClient()
  await loadDashboardActivity(supabase, { userId: 'user', activeIdentity: venue, identities }, today)
  assert.equal(requests.length, 2)
  const events = requests.find((url) => url.pathname.endsWith('/events'))!
  assert.equal(events.searchParams.get('venue_id'), 'in.(venue-one)')
  assert.equal(events.searchParams.get('event_date'), `gte.${today}`)
  assert.equal(events.searchParams.get('status'), 'in.(draft,active)')
  assert.equal(events.searchParams.get('order'), 'event_date.asc,start_time.asc,id.asc')
  const claims = requests.find((url) => url.pathname.endsWith('/venue_claims'))!
  assert.equal(claims.searchParams.get('user_id'), 'eq.user')
  assert.equal(claims.searchParams.get('venue_id'), 'eq.venue-one')
})

test('artist reads use an inner event join and do not request venue claims', async () => {
  const { supabase, requests } = mockClient()
  await loadDashboardActivity(supabase, { userId: 'user', activeIdentity: artist, identities }, today)
  assert.equal(requests.length, 1)
  const request = requests[0]
  assert.equal(request.searchParams.get('band_id'), 'in.(artist-one)')
  assert.equal(request.searchParams.get('events.status'), 'eq.active')
  assert.equal(request.searchParams.get('events.event_date'), `gte.${today}`)
  assert.match(request.searchParams.get('select') ?? '', /events!inner\(/)
})

test('later membership pages can supply both the next show and an actionable invite', async () => {
  const { supabase, requests } = mockClient((url) => Number(url.searchParams.get('offset')) === 0
    ? Array.from({ length: 200 }, (_, index) => membership(event(`late-${index}`, { event_date: '2026-12-01' }), 'accepted'))
    : [membership(event('next'), 'accepted'), membership(event('invite'), 'invited')])
  const result = await loadDashboardActivity(supabase, { userId: 'user', activeIdentity: artist, identities }, today)
  assert.equal(requests.length, 2)
  assert.equal(requests[1].searchParams.get('offset'), '200')
  assert.equal(result.upcoming[0].event.id, 'next')
  assert.equal(result.actions[0].event.id, 'invite')
})

test('failed activity reads cannot be mistaken for a clear action queue', async () => {
  const { supabase } = mockClient(() => new Response(JSON.stringify({ message: 'Read failed' }), { status: 403 }))
  await assert.rejects(loadDashboardActivity(supabase, { userId: 'user', activeIdentity: artist, identities }, today), { message: 'Read failed' })
})
