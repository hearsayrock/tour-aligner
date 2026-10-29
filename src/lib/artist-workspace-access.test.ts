import { strict as assert } from 'node:assert'
import { test } from 'node:test'
// @ts-expect-error Node's TypeScript runner requires an explicit extension.
import { isArtistWorkspacePath } from './artist-workspace-access.ts'

test('non-admin workspace includes artist discovery and private chat routes', () => {
  for (const path of ['/dashboard/bands', '/dashboard/inbox', '/dashboard/inbox/private/thread-id',
    '/dashboard/profiles', '/dashboard/bands/new', '/dashboard/bands/artist-id/edit', '/dashboard/account']) {
    assert.equal(isArtistWorkspacePath(path), true, path)
  }
})

test('artist access does not open admin, booking, venue, or event routes', () => {
  for (const path of ['/admin', '/dashboard/venues', '/events', '/dashboard/calendar', '/dashboard/backstage',
    '/dashboard/inbox/bookings/thread-id', '/dashboard/inbox/thread-id', '/dashboard/inbox/private/thread-id/edit',
    '/dashboard/bands/artist-id/delete', '/dashboard/bands-other', '/dashboard/inbox-other']) {
    assert.equal(isArtistWorkspacePath(path), false, path)
  }
})
