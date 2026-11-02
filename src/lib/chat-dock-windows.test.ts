import { strict as assert } from 'node:assert'
import { test } from 'node:test'
// @ts-expect-error Node's TypeScript runner requires the explicit extension.
import * as windows from './chat-dock-windows.ts'
import type { ChatWindow } from './chat-dock-windows'

test('opening conversations creates independent windows without an arbitrary limit', () => {
  let state: ChatWindow[] = []
  for (let index = 0; index < 100; index++)
    state = windows.openChatWindow(
      state,
      `private:${index}`,
      { kind: 'private', id: String(index) },
      `Chat ${index}`
    )
  assert.equal(state.length, 100)
  assert.equal(new Set(state.map((window) => window.id)).size, 100)
  assert.equal(
    state.every((window) => window.position === null && !window.minimized),
    true
  )
})

test('reopening a minimized conversation restores its existing window and preserves its position', () => {
  const initial = windows.openChatWindow([], 'private:one', { kind: 'private', id: 'one' }, 'One')
  const floating = [{ ...initial[0], minimized: true, position: { x: 120, y: 60 } }]
  const reopened = windows.openChatWindow(floating, 'private:one', { kind: 'private', id: 'one' }, 'One')
  assert.equal(reopened.length, 1)
  assert.equal(reopened[0].minimized, false)
  assert.deepEqual(reopened[0].position, { x: 120, y: 60 })
  assert.ok(reopened[0].z > initial[0].z)
})

test('private and Backstage windows coexist, and docking one leaves the others unchanged', () => {
  let state = windows.openChatWindow([], 'private:one', { kind: 'private', id: 'one' }, 'Private')
  state = windows.openChatWindow(state, 'backstage:one', { kind: 'backstage', id: 'one' }, 'Backstage')
  state = state.map((window) =>
    window.id === 'private:one' ? { ...window, position: { x: 50, y: 40 } } : window
  )
  const before = state.find((window) => window.id === 'backstage:one')
  const docked = windows.dockChatWindow(state, 'private:one', 'backstage:one')
  assert.equal(docked[0].id, 'private:one')
  assert.equal(docked[0].position, null)
  assert.equal(docked[1], before)
})

test('title-bar clicks and small pointer jitter do not become window drags', () => {
  assert.equal(windows.isChatWindowDrag({ x: 20, y: 30 }, { x: 20, y: 30 }), false)
  assert.equal(windows.isChatWindowDrag({ x: 20, y: 30 }, { x: 23, y: 32 }), false)
  assert.equal(windows.isChatWindowDrag({ x: 20, y: 30 }, { x: 27, y: 30 }), true)
})

test('floating windows stay within the viewport after moving or resizing', () => {
  assert.deepEqual(
    windows.clampChatWindow({ x: -50, y: -100 }, { width: 1200, height: 900 }, { width: 360, height: 560 }),
    { x: 8, y: 8 }
  )
  assert.deepEqual(
    windows.clampChatWindow({ x: 1500, y: 1000 }, { width: 1200, height: 900 }, { width: 360, height: 560 }),
    { x: 832, y: 332 }
  )
})
