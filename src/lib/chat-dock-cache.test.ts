import { strict as assert } from 'node:assert'
import { test } from 'node:test'
// @ts-expect-error Node's TypeScript runner requires the explicit extension.
import { createDockConversationCache } from './chat-dock-cache.ts'
import type { DockConversation, DockMessage, DockResult, DockSelection } from './chat-dock'

function message(id: string): DockMessage {
  return {
    id,
    body: id,
    created_at: `2026-11-01T12:00:${id.padStart(2, '0')}.000000+00:00`,
    own: false,
    system: false,
    sender: 'Artist',
  }
}

function room(id: string, messages: DockMessage[] = [], more = false): DockConversation {
  return {
    kind: 'backstage',
    backstage: {
      id,
      title: id,
      venueName: 'Venue',
      photo: null,
      date: '2026-11-01',
      membershipId: 'membership',
      slug: 'test-event',
      membershipStatus: 'accepted',
      canChat: true,
      preview: '',
      lastMessageAt: null,
      unread: false,
    },
    artistNames: {},
    messages,
    hasMoreMessages: more,
    nextCursor: messages[0] ? { createdAt: messages[0].created_at, id: messages[0].id } : null,
  }
}

function deferred() {
  let resolve!: (result: DockResult<DockConversation>) => void
  const promise = new Promise<DockResult<DockConversation>>((complete) => {
    resolve = complete
  })
  return { promise, resolve }
}
const selection: DockSelection = { kind: 'backstage', id: 'room' }

test('prefetch and opening share one request; cached reopening is synchronous while stale data refreshes', async () => {
  let now = 10000
  let calls = 0
  let next = deferred()
  const cache = createDockConversationCache(
    () => {
      calls++
      return next.promise
    },
    { now: () => now, ttlMs: 1000 }
  )
  const prefetch = cache.load(selection)
  const opening = cache.load(selection)
  assert.equal(prefetch, opening)
  assert.equal(calls, 1)
  next.resolve({ data: room('room', [message('1')]) })
  await opening
  assert.equal(cache.peek(selection)?.messages[0].id, '1')
  await cache.load(selection)
  assert.equal(calls, 1)

  now += 1001
  next = deferred()
  const refresh = cache.load(selection)
  assert.equal(calls, 2)
  assert.equal(cache.peek(selection)?.messages[0].id, '1', 'reopening keeps its messages during refresh')
  next.resolve({ data: room('room', [message('2')]) })
  await refresh
  assert.deepEqual(
    cache.peek(selection)?.messages.map((row) => row.id),
    ['1', '2']
  )
})

test('loading older pages and refreshing recent messages keeps history and its oldest cursor without duplicates', async () => {
  let result = room('room', [message('3'), message('4')], true)
  const cache = createDockConversationCache(async () => ({ data: result }))
  await cache.load(selection)
  result = room('room', [message('1'), message('2'), message('3')], false)
  await cache.load(selection, false, { createdAt: message('3').created_at, id: '3' })
  result = room('room', [message('4'), message('5')], true)
  await cache.load(selection, true)
  const cached = cache.peek(selection)
  assert.deepEqual(
    cached?.messages.map((row) => row.id),
    ['1', '2', '3', '4', '5']
  )
  assert.equal(cached?.hasMoreMessages, false)
  assert.equal(cached?.nextCursor?.id, '1')
  cache.rememberMessages(selection, [{ ...message('6'), id: 'temp-pending' }, message('6')])
  assert.equal(
    cache.peek(selection)?.messages.some((row) => row.id.startsWith('temp-')),
    false
  )
})

test('revoked room access clears cached messages and account/profile changes discard in-flight results', async () => {
  const cache = createDockConversationCache(async () => ({ data: room('room', [message('1')], true) }))
  await cache.load(selection)
  const invite = room('room')
  assert.equal(invite.kind, 'backstage')
  if (invite.kind !== 'backstage') throw new Error('Invalid fixture')
  cache.reconcile({
    chats: [],
    backstages: [{ ...invite.backstage, canChat: false, membershipStatus: 'invited' }],
  })
  assert.deepEqual(cache.peek(selection)?.messages, [])
  cache.rememberMessages(selection, [message('2')])
  assert.deepEqual(cache.peek(selection)?.messages, [])
  cache.reconcile({ chats: [], backstages: [] })
  assert.equal(cache.peek(selection), null)

  const pending = deferred()
  const other = createDockConversationCache(() => pending.promise)
  const loading = other.load(selection)
  other.clear()
  pending.resolve({ data: room('room', [message('1')]) })
  assert.equal((await loading).error !== undefined, true)
  assert.equal(other.peek(selection), null)
})

test('a forced refresh after a mutation supersedes an older speculative request', async () => {
  const first = deferred()
  const second = deferred()
  let calls = 0
  const cache = createDockConversationCache(() => (++calls === 1 ? first.promise : second.promise))
  const prefetch = cache.load(selection)
  const fresh = cache.load(selection, true)
  second.resolve({ data: room('room', [message('2')]) })
  await fresh
  first.resolve({ data: room('room', [message('1')]) })
  await prefetch
  assert.deepEqual(
    cache.peek(selection)?.messages.map((row) => row.id),
    ['2']
  )
})

test('a slow history response cannot restore messages after room access is revoked', async () => {
  const delayed = deferred()
  let calls = 0
  const initial = room('room', [message('3')], true)
  const cache = createDockConversationCache(() =>
    ++calls === 1 ? Promise.resolve({ data: initial }) : delayed.promise
  )
  await cache.load(selection)
  const older = cache.load(selection, false, { createdAt: message('3').created_at, id: '3' })
  if (initial.kind !== 'backstage') throw new Error('Invalid fixture')
  cache.reconcile({
    chats: [],
    backstages: [{ ...initial.backstage, canChat: false, membershipStatus: 'removed' }],
  })
  delayed.resolve({ data: room('room', [message('1'), message('2')]) })
  assert.ok((await older).error)
  assert.deepEqual(cache.peek(selection)?.messages, [])
})

test('conversation memory is bounded and separate dock instances never share data', async () => {
  const cache = createDockConversationCache(async (target) => ({ data: room(target.id) }), { limit: 2 })
  for (const id of ['one', 'two', 'three']) await cache.load({ kind: 'backstage', id })
  assert.equal(cache.peek({ kind: 'backstage', id: 'one' }), null)
  assert.ok(cache.peek({ kind: 'backstage', id: 'three' }))
  const otherProfile = createDockConversationCache(async () => ({ data: room('room') }))
  assert.equal(otherProfile.peek({ kind: 'backstage', id: 'three' }), null)
})
