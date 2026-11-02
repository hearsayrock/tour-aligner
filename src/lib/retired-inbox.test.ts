import { strict as assert } from 'node:assert'
import { test } from 'node:test'
// @ts-expect-error Node's TypeScript runner requires the explicit extension.
import { findBackstageForOldBooking, parseRetiredInboxPath } from './retired-inbox.ts'

const id = '00000000-0000-0000-0000-000000000001'

test('retired Inbox paths resolve only supported thread identifiers', () => {
  assert.deepEqual(parseRetiredInboxPath([id]), { kind: 'unknown', id })
  assert.deepEqual(parseRetiredInboxPath(['private', id]), { kind: 'private', id })
  assert.deepEqual(parseRetiredInboxPath(['bookings', id]), { kind: 'booking', id })
  for (const path of [[], ['invalid'], ['other', id], ['private', id, 'edit'], ['private', '../other']]) {
    assert.equal(parseRetiredInboxPath(path), null)
  }
})

test('old booking links prefer the nearest upcoming Backstage and then the latest past one', () => {
  const bookings = [
    { event_id: 'later', show_date: '2026-12-01' },
    { event_id: null, show_date: '2026-11-01' },
    { event_id: 'older', show_date: '2026-09-01' },
    { event_id: 'recent', show_date: '2026-10-31' },
    { event_id: 'next', show_date: '2026-11-02' },
  ]
  assert.equal(findBackstageForOldBooking(bookings, '2026-11-01'), 'next')
  assert.equal(findBackstageForOldBooking(bookings, '2026-11-02'), 'next')
  assert.equal(findBackstageForOldBooking(bookings, '2027-01-01'), 'later')
  assert.equal(findBackstageForOldBooking(bookings.slice(1, 4), '2026-11-01'), 'recent')
  assert.equal(findBackstageForOldBooking([{ event_id: null, show_date: '2026-11-01' }], '2026-11-01'), null)
  assert.equal(findBackstageForOldBooking([], '2026-11-01'), null)
  assert.equal(bookings[0].event_id, 'later', 'redirect selection must not reorder the supplied data')
})
