import { strict as assert } from 'node:assert'
import { test } from 'node:test'
// @ts-expect-error Node's TypeScript runner requires the explicit extension.
import { openChatDock, subscribeChatDock } from './chat-dock-events.ts'

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
