import { strict as assert } from 'node:assert'
import { test } from 'node:test'
// Node's built-in TypeScript runner requires the explicit extension.
// @ts-expect-error TypeScript's bundler resolution omits TypeScript extensions.
import { nearestProfilePageDragSlot, profilePageDragSlots, profilePageGridSpan } from './profile-page-drag.ts'

test('desktop spans and mobile full-column overrides use valid grid widths', () => {
  assert.equal(profilePageGridSpan('span 8'), 8)
  assert.equal(profilePageGridSpan('span 4'), 4)
  assert.equal(profilePageGridSpan('-1'), 12)
  assert.equal(profilePageGridSpan('auto'), 12)
})

test('wide blocks only snap to positions where their full width fits', () => {
  const slots = profilePageDragSlots([
    { sectionId: 'a', span: 4, height: 100 },
    { sectionId: 'b', span: 4, height: 200 },
    { sectionId: 'source', span: 8, height: 150 },
  ], 'source', 1200, 24, 32)
  assert.deepEqual(slots, [
    { index: 0, x: 0, y: 0 },
    { index: 1, x: 408, y: 0 },
    { index: 2, x: 0, y: 232 },
  ])
  // The gap at the end of the first row still selects a valid nearby slot.
  assert.equal(nearestProfilePageDragSlot(slots, 820, 220, 0), 1)
  assert.equal(nearestProfilePageDragSlot(slots, 10, 260, 0), 2)
})

test('dense backfilling accounts for the heights of later blocks', () => {
  const slots = profilePageDragSlots([
    { sectionId: 'a', span: 8, height: 100 },
    { sectionId: 'source', span: 8, height: 100 },
    { sectionId: 'b', span: 4, height: 300 },
  ], 'source', 1200, 24, 32)
  assert.deepEqual(slots[1], { index: 1, x: 0, y: 332 })
})

test('single-column layouts support the first and last insertion positions', () => {
  const slots = profilePageDragSlots([
    { sectionId: 'a', span: 12, height: 100 },
    { sectionId: 'source', span: 12, height: 200 },
    { sectionId: 'b', span: 12, height: 300 },
  ], 'source', 400, 20, 20)
  assert.deepEqual(slots, [
    { index: 0, x: 0, y: 0 },
    { index: 1, x: 0, y: 120 },
    { index: 2, x: 0, y: 440 },
  ])
  assert.equal(nearestProfilePageDragSlot(slots, 10, 900, 0), 2)
  assert.equal(nearestProfilePageDragSlot(slots, 10, -100, 2), 0)
})

test('midpoint hysteresis and identical dense slots retain the current position', () => {
  const slots = [{ index: 0, x: 0, y: 0 }, { index: 1, x: 100, y: 0 }]
  assert.equal(nearestProfilePageDragSlot(slots, 53, 0, 0), 0)
  assert.equal(nearestProfilePageDragSlot(slots, 60, 0, 0), 1)
  assert.equal(nearestProfilePageDragSlot([{ index: 0, x: 0, y: 0 }, { index: 1, x: 0, y: 0 }], 30, 40, 1), 1)
  assert.deepEqual(profilePageDragSlots([], 'missing', 400, 20, 20), [])
})
