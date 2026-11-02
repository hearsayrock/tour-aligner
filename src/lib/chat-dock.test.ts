import { strict as assert } from 'node:assert'
import { test } from 'node:test'
// @ts-expect-error Node's TypeScript runner requires the explicit extension.
import * as chatDock from './chat-dock.ts'
import type { ManagedIdentity } from './managed-identity'
import type { BackstageMessage, EventArtistMembership, PrivateChatMessage } from '@/types/database'

const { backstageDockMessage, canChatInBackstage, chatDockHidden, hasUnreadBackstage, privateDockMessage } =
  chatDock

test('message cursors preserve microseconds and reject values that could change a pagination filter', () => {
  const cursor = { createdAt: '2026-11-01T12:00:00.123456+00:00', id: '00000000-0000-0000-0000-000000000001' }
  assert.equal(chatDock.isDockMessageCursor(cursor), true)
  assert.equal(cursor.createdAt, '2026-11-01T12:00:00.123456+00:00')
  assert.equal(chatDock.isDockMessageCursor({ ...cursor, createdAt: 'invalid' }), false)
  assert.equal(chatDock.isDockMessageCursor({ ...cursor, id: `${cursor.id}),id.neq.other` }), false)
  assert.equal(
    chatDock.isDockMessageCursor({ ...cursor, createdAt: `${cursor.createdAt},id.neq.other` }),
    false
  )
})

const artist: ManagedIdentity = {
  kind: 'band',
  id: 'artist-one',
  name: 'Artist One',
  href: '/bands/artist-one',
}
const venue: ManagedIdentity = {
  kind: 'venue',
  id: 'venue-one',
  name: 'Venue One',
  href: '/venues/venue-one',
}
const backstageMessage: BackstageMessage = {
  id: 'message',
  event_id: 'event',
  created_at: '2026-11-01T12:00:00Z',
  body: 'Load-in at six',
  sender_kind: 'artist',
  sender_band_id: artist.id,
  sender_user_id: 'user',
}
const privateMessage: PrivateChatMessage = {
  id: 'message',
  thread_id: 'thread',
  created_at: '2026-11-01T12:00:00Z',
  body: 'Hello',
  kind: 'message',
  sender_profile_kind: 'band',
  sender_profile_id: artist.id,
  sender_user_id: 'user',
}

test('Backstage invitations do not grant access to room chat before acceptance', () => {
  for (const status of [null, 'invited', 'applied', 'declined', 'removed'] as Array<
    EventArtistMembership['status'] | null
  >) {
    assert.equal(canChatInBackstage('band', status), false, String(status))
  }
  assert.equal(canChatInBackstage('band', 'accepted'), true)
  assert.equal(canChatInBackstage('band', 'removal_requested'), true)
  assert.equal(canChatInBackstage('venue', null), true)
})

test('private message ownership requires both profile kind and profile ID', () => {
  assert.equal(privateDockMessage(privateMessage, artist, 'Partner').own, true)
  assert.equal(privateDockMessage(privateMessage, { ...artist, id: 'artist-two' }, 'Partner').own, false)
  assert.equal(privateDockMessage(privateMessage, { ...venue, id: artist.id }, 'Partner').own, false)
  assert.equal(
    privateDockMessage(
      { ...privateMessage, kind: 'system', sender_profile_kind: null, sender_profile_id: null },
      artist,
      'Partner'
    ).system,
    true
  )
})

test('shared Backstage messages identify the sending artist rather than the account owner', () => {
  assert.equal(backstageDockMessage(backstageMessage, artist, venue.name, {}).own, true)
  const otherArtist = backstageDockMessage(
    { ...backstageMessage, sender_band_id: 'artist-two' },
    artist,
    venue.name,
    { 'artist-two': 'Artist Two' }
  )
  assert.equal(otherArtist.own, false)
  assert.equal(otherArtist.sender, 'Artist Two')
  assert.equal(
    backstageDockMessage(
      { ...backstageMessage, sender_kind: 'venue', sender_band_id: null },
      venue,
      venue.name,
      {}
    ).own,
    true
  )
  assert.equal(
    backstageDockMessage({ ...backstageMessage, sender_kind: 'system' }, artist, venue.name, {}).system,
    true
  )
})

test('unread Backstages compare instants across timestamp formats and timezone offsets', () => {
  assert.equal(hasUnreadBackstage(null, null), false)
  assert.equal(hasUnreadBackstage('2026-11-01T12:00:00Z', null), true)
  assert.equal(hasUnreadBackstage('2026-11-01T12:00:00Z', '2026-11-01T12:00:00.000+00:00'), false)
  assert.equal(hasUnreadBackstage('2026-11-01T12:00:00Z', '2026-11-01T05:00:00-07:00'), false)
  assert.equal(hasUnreadBackstage('2026-11-01T12:00:01Z', '2026-11-01T12:00:00Z'), true)
})

test('dock is hidden on authentication and onboarding routes, and remains on public profiles', () => {
  for (const path of [
    '/login',
    '/signup',
    '/auth/callback',
    '/forgot-password',
    '/reset-password',
    '/onboarding',
    '/onboarding/artist',
    '/terms/accept',
  ])
    assert.equal(chatDockHidden(path), true, path)
  for (const path of [
    '/dashboard/profiles',
    '/bands/login',
    '/venues/onboarding',
    '/about',
    '/terms',
    '/login-help',
  ])
    assert.equal(chatDockHidden(path), false, path)
})
