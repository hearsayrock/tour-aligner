import { strict as assert } from 'node:assert'
import { test } from 'node:test'
// @ts-expect-error Node's TypeScript runner requires the explicit extension.
import { openChatDock, readChatDockLocation, subscribeChatDock, subscribeChatDockLocation } from './chat-dock-events.ts'

test('profile chat requests survive root-host hydration and do not replay after they are handled', () => {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window')
  Object.defineProperty(globalThis, 'window', { value: new EventTarget(), configurable: true })
  const chat: Parameters<typeof openChatDock>[0] = {
    scope: 'band:artist',
    profile: {
      kind: 'venue',
      id: 'venue',
      name: 'Venue',
      href: '/venues/venue',
      photo: null,
      meta: 'Venue',
    },
  }
  let unsubscribe = () => {}
  try {
    openChatDock(chat)
    const received: Array<Parameters<typeof openChatDock>[0]> = []
    unsubscribe = subscribeChatDock((request) => received.push(request))
    assert.deepEqual(received, [chat])
    openChatDock({ ...chat, threadId: 'existing-thread' })
    assert.equal(received.length, 2)
    unsubscribe()

    // Mounting another listener cannot open an already handled conversation.
    unsubscribe = subscribeChatDock((request) => received.push(request))
    assert.equal(received.length, 2)
    unsubscribe()

    // An unmounted listener receives nothing; the next host gets the latest click.
    openChatDock({ ...chat, threadId: 'queued-thread' })
    assert.equal(received.length, 2)
    unsubscribe = subscribeChatDock((request) => received.push(request))
    assert.deepEqual(received[2], { ...chat, threadId: 'queued-thread' })
  } finally {
    unsubscribe()
    if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow)
    else Reflect.deleteProperty(globalThis, 'window')
  }
})

test('chat links accept supported commands and reject malformed identifiers', () => {
  const id = '00000000-0000-0000-0000-000000000001'
  assert.deepEqual(readChatDockLocation(`?chat=${id}`), { threadId: id })
  assert.deepEqual(readChatDockLocation('?chats=open'), { threadId: null })
  assert.deepEqual(readChatDockLocation(`?backstageChat=${id}`), { threadId: null, backstageId: id })
  assert.equal(readChatDockLocation('?backstageChat=invalid'), null)
  assert.equal(readChatDockLocation('?chat=invalid'), null)
  assert.equal(readChatDockLocation('?chats=closed'), null)
  assert.equal(readChatDockLocation(''), null)
})

test('chat links wait for a profile and preserve unrelated URL state when consumed', () => {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window')
  const browser = Object.assign(new EventTarget(), {
    location: { href: 'https://touraligner.test/dashboard/profiles?chats=open&filter=artists#profile' },
    history: {
      state: { navigation: true },
      replaceState(state: unknown, _unused: string, path: string) {
        assert.deepEqual(state, { navigation: true })
        browser.location.href = new URL(path, browser.location.href).href
      },
    },
  })
  Object.defineProperty(globalThis, 'window', { value: browser, configurable: true })
  let unsubscribe = () => {}
  let ready = false
  let opened = 0
  try {
    unsubscribe = subscribeChatDockLocation(() => {
      if (!ready) return false
      opened += 1
      return true
    })
    assert.equal(opened, 0)
    assert.match(browser.location.href, /chats=open/)
    ready = true
    browser.dispatchEvent(new Event('popstate'))
    assert.equal(opened, 1)
    assert.equal(browser.location.href, 'https://touraligner.test/dashboard/profiles?filter=artists#profile')
    browser.dispatchEvent(new Event('popstate'))
    assert.equal(opened, 1, 'consumed commands do not reopen chats')
    unsubscribe()
    browser.location.href = 'https://touraligner.test/dashboard/profiles?chats=open'
    browser.dispatchEvent(new Event('popstate'))
    assert.equal(opened, 1, 'unmounted hosts do not receive commands')
  } finally {
    unsubscribe()
    if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow)
    else Reflect.deleteProperty(globalThis, 'window')
  }
})
