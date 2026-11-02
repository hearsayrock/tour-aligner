import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import type { ManagedIdentity } from './managed-identity'
// @ts-expect-error Node's TypeScript runner requires the explicit extension.
import { loadBackstageAttention } from './backstage-attention.ts'

const artist: ManagedIdentity = { kind: 'band', id: 'artist-one', name: 'Artist', href: '/' }
const venue: ManagedIdentity = { kind: 'venue', id: 'venue-one', name: 'Venue', href: '/' }
const today = '2026-11-01'

function mockClient(rows: unknown[] = []) {
  const requests: URL[] = []
  const supabase = createClient<Database>('https://example.supabase.co', 'test-key', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: {
      fetch: async (input) => {
        requests.push(new URL(String(input)))
        return new Response(JSON.stringify(rows), {
          headers: { 'Content-Type': 'application/json' },
        })
      },
    },
  })
  return { supabase, requests }
}

test('artist attention requests only this artist’s pending invites on active upcoming events', async () => {
  const { supabase, requests } = mockClient()
  assert.deepEqual(await loadBackstageAttention(supabase, artist, today), [])
  assert.equal(requests.length, 1)
  const request = requests[0]
  assert.equal(request.pathname, '/rest/v1/event_artist_memberships')
  assert.equal(request.searchParams.get('band_id'), 'eq.artist-one')
  assert.equal(request.searchParams.get('status'), 'eq.invited')
  assert.equal(request.searchParams.get('events.status'), 'eq.active')
  assert.equal(request.searchParams.get('events.event_date'), `gte.${today}`)
  // An inner join excludes memberships whose event fails the date/status filters.
  assert.match(request.searchParams.get('select') ?? '', /events!inner\(/)
  assert.equal(request.searchParams.has('events.venue_id'), false)
})

test('venue attention requests only applications to the selected venue’s active upcoming events', async () => {
  const { supabase, requests } = mockClient()
  await loadBackstageAttention(supabase, venue, today)
  const request = requests[0]
  assert.equal(request.searchParams.get('events.venue_id'), 'eq.venue-one')
  assert.equal(request.searchParams.get('status'), 'eq.applied')
  assert.equal(request.searchParams.get('events.status'), 'eq.active')
  assert.equal(request.searchParams.get('events.event_date'), `gte.${today}`)
  assert.equal(request.searchParams.has('band_id'), false)
})

test('no selected profile produces no attention items or cross-profile requests', async () => {
  const { supabase, requests } = mockClient()
  assert.deepEqual(await loadBackstageAttention(supabase, null, today), [])
  assert.equal(requests.length, 0)
})

test('applications group by event and put the next event first', async () => {
  const first = { id: 'first', title: 'First', event_date: today, start_time: '18:00:00' }
  const second = { id: 'second', title: 'Second', event_date: today, start_time: '20:00:00' }
  const { supabase } = mockClient([
    { events: second },
    { events: first },
    { events: second },
  ])
  assert.deepEqual(await loadBackstageAttention(supabase, venue, today), [
    { ...first, pendingCount: 1 },
    { ...second, pendingCount: 2 },
  ])
})

test('viewing pending items keeps them actionable; resolving them clears the result', async () => {
  const event = { id: 'show', title: 'Show', event_date: today, start_time: '20:00:00' }
  const pending = mockClient([{ events: event }])
  assert.equal((await loadBackstageAttention(pending.supabase, artist, today)).length, 1)
  assert.equal((await loadBackstageAttention(pending.supabase, artist, today)).length, 1)
  const resolved = mockClient()
  assert.deepEqual(await loadBackstageAttention(resolved.supabase, artist, today), [])
})

test('failed reads are reported rather than treated as an empty action list', async () => {
  const supabase = createClient<Database>('https://example.supabase.co', 'test-key', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: {
      fetch: async () => new Response(JSON.stringify({ message: 'Read failed', code: 'test' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }),
    },
  })
  await assert.rejects(loadBackstageAttention(supabase, artist, today), { message: 'Read failed' })
})
