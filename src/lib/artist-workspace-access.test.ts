import { strict as assert } from 'node:assert'
import { test } from 'node:test'
// @ts-expect-error Node's TypeScript runner requires an explicit extension.
import { isArtistWorkspacePath } from './artist-workspace-access.ts'

test('non-admin workspace includes artist discovery and Backstages', () => {
  for (const path of ['/dashboard/bands', '/dashboard/backstage', '/dashboard/backstage/event-id',
    '/dashboard/profiles', '/dashboard/bands/new', '/dashboard/bands/artist-id/edit', '/dashboard/account']) {
    assert.equal(isArtistWorkspacePath(path), true, path)
  }
})

test('artist access does not open admin, retired Inbox, venue, or event management routes', () => {
  for (const path of ['/admin', '/dashboard/venues', '/events', '/dashboard/calendar', '/dashboard/inbox',
    '/dashboard/inbox/private/thread-id',
    '/dashboard/inbox/bookings/thread-id', '/dashboard/inbox/thread-id', '/dashboard/inbox/private/thread-id/edit',
    '/dashboard/bands/artist-id/delete', '/dashboard/bands-other', '/dashboard/inbox-other']) {
    assert.equal(isArtistWorkspacePath(path), false, path)
  }
})

test('chat links can reach individual Backstages without opening other event management routes', () => {
  assert.equal(isArtistWorkspacePath('/dashboard/backstage/event-id'), true)
  for (const path of ['/dashboard/backstage/event-id/edit',
    '/dashboard/backstage/event-id/delete', '/dashboard/backstage-other', '/dashboard/events/new']) {
    assert.equal(isArtistWorkspacePath(path), false, path)
  }
})
