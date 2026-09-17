import { strict as assert } from 'node:assert'
import { test } from 'node:test'
// @ts-expect-error Node's TypeScript runner requires the explicit extension.
import { autoProfileBlocks, profileBlockReadingOrder, smartProfileBlocks, profileBlocksCollide, resolveProfileBlocks, resizeProfileBlock, snapProfileBlock, snapProfileBlockWidth, type ProfileResizeEdge } from './profile-page-freeform.ts'
// @ts-expect-error Node's TypeScript runner requires the explicit extension.
import { normalizeProfilePageLayout, normalizeProfilePagePlacement, type ProfilePageSectionDefinition } from './profile-page-types.ts'

const definitions: ProfilePageSectionDefinition[] = ['a', 'b', 'c'].map((sectionId, order) => ({
  sectionId, label: sectionId, description: '', defaultOrder: order, defaultSpan: 4,
  allowedSpans: [4, 6, 8, 12], defaultVariant: 'card', required: sectionId === 'a',
}))

test('Auto Arrange fits content instead of old dimensions and backfills higher gaps ahead of later wide cards', () => {
  const blocks = [
    { sectionId: 'wide', priority: 1, allowedSpans: [8, 12] as const },
    { sectionId: 'small', priority: 2, allowedSpans: [4, 6, 8, 12] as const },
    { sectionId: 'overview', priority: 0, allowedSpans: [8, 12] as const },
  ]
  const arranged = autoProfileBlocks(blocks, 964, (id) => id === 'overview' ? 500 : 160)
  assert.deepEqual(arranged.map((rect) => rect.sectionId), ['overview', 'small', 'wide'])
  assert.deepEqual(arranged.map((rect) => rect.span), [8, 4, 12])
  assert.equal(arranged[1].y, 0)
  assert.equal(arranged[1].x, arranged[0].width + 32)
  assert.equal(arranged[1].x + arranged[1].width, 964)
  assert.equal(arranged[2].width, 964)
  assert.equal(arranged[2].y, 532)
  for (const [index, rect] of arranged.entries()) for (const other of arranged.slice(index + 1)) assert.equal(profileBlocksCollide(rect, other), false)
  assert.deepEqual(autoProfileBlocks([...blocks].reverse(), 964, (id) => id === 'overview' ? 500 : 160), arranged)
})

test('Auto Arrange widens content that wraps heavily and keeps short blocks compact', () => {
  const arranged = autoProfileBlocks([
    { sectionId: 'text', priority: 0, allowedSpans: [4, 6, 8, 12] },
    { sectionId: 'links', priority: 1, allowedSpans: [4, 6, 8, 12] },
  ], 964, (id, width) => id === 'links' ? 160 : width < 400 ? 650 : width < 700 ? 300 : 280)
  assert.equal(arranged[0].span, 6)
  assert.equal(arranged[0].height, 300)
  assert.equal(arranged[1].span, 4)
  assert.equal(arranged[1].y, 0)
  assert.equal(arranged[1].height, 160)
  assert.deepEqual(autoProfileBlocks([], 964, () => 100), [])
  assert.deepEqual(autoProfileBlocks([{ sectionId: 'a', priority: 0, allowedSpans: [4] }], 0, () => 100), [])
})

test('Auto Arrange fills the canvas with one, two, three, or four content-sized cards', () => {
  for (const count of [1, 2, 3, 4]) {
    const blocks = Array.from({ length: count }, (_, priority) => ({ sectionId: String(priority), priority, allowedSpans: [4, 6, 8, 12] as const }))
    const arranged = autoProfileBlocks(blocks, 1216, () => 160)
    assert.equal(arranged.length, count)
    assert.equal(arranged[0].x, 0)
    assert.equal(arranged.at(-1)!.x + arranged.at(-1)!.width, 1216)
    arranged.forEach((rect) => { assert.equal(rect.y, 0); assert.equal(rect.height, 160); assert.ok(rect.width >= 240) })
    arranged.slice(1).forEach((rect, index) => assert.equal(rect.x - arranged[index].x - arranged[index].width, 32))
    assert.deepEqual(resolveProfileBlocks(arranged, 1216), arranged)
  }
})

test('Auto Arrange expands mixed widths and packs beneath shorter cards without height stretching', () => {
  const blocks = [
    { sectionId: 'wide', priority: 0, allowedSpans: [6, 8, 12] as const },
    ...['small', 'next', 'last'].map((sectionId, index) => ({ sectionId, priority: index + 1, allowedSpans: [4, 6, 8, 12] as const })),
  ]
  const arranged = autoProfileBlocks(blocks, 1216, (id) => id === 'wide' ? 500 : 120)
  assert.equal(arranged[0].height, 500)
  assert.equal(arranged[1].height, 120)
  assert.equal(arranged[2].x + arranged[2].width, 1216)
  assert.equal(arranged[3].y, 152)
  assert.equal(arranged[3].x + arranged[3].width, 1216)
  assert.deepEqual(resolveProfileBlocks(arranged, 1216), arranged)
})

test('Smart Layout derives reading order from positions, tolerating slightly uneven rows', () => {
  const rect = (sectionId: string, x: number, y: number) => ({ sectionId, x, y, width: 300, height: 150 })
  assert.deepEqual(profileBlockReadingOrder([rect('bottom', 0, 600), rect('right', 700, 100), rect('left', 0, 120)])
    .map((rect) => rect.sectionId), ['left', 'right', 'bottom'])
})

test('Smart Layout normalizes widths and fills gaps beside a tall card without stretching short cards', () => {
  const blocks = [
    { sectionId: 'c', x: 350, y: 700, width: 310, height: 900, allowedSpans: [4, 6, 8, 12] as const },
    { sectionId: 'b', x: 650, y: 90, width: 300, height: 500, allowedSpans: [4, 6, 8, 12] as const },
    { sectionId: 'a', x: 0, y: 100, width: 620, height: 1000, allowedSpans: [6, 8, 12] as const },
  ]
  const measure = (id: string) => id === 'a' ? 500 : 160
  const arranged = smartProfileBlocks(blocks, 964, measure)
  assert.deepEqual(arranged.map((rect) => rect.sectionId), ['a', 'b', 'c'])
  assert.deepEqual(arranged.map((rect) => rect.span), [8, 4, 4])
  assert.deepEqual(arranged.map((rect) => rect.height), [500, 160, 160])
  assert.equal(arranged[2].y, 192)
  assert.equal(arranged[2].x, 664)
  for (const [index, rect] of arranged.entries()) for (const other of arranged.slice(index + 1)) assert.equal(profileBlocksCollide(rect, other), false)
  assert.deepEqual(smartProfileBlocks(arranged.map((rect) => ({ ...rect, allowedSpans: blocks.find((block) => block.sectionId === rect.sectionId)!.allowedSpans })), 964, measure), arranged)
})

test('Smart Layout honors supported widths, measures rewrapped content, and stays inside narrow canvases', () => {
  const widths: number[] = []
  const blocks = ['a', 'b', 'c'].map((sectionId, index) => ({ sectionId, x: index * 200, y: index * 100, width: 290, height: 100, allowedSpans: [4, 6, 8, 12] as const }))
  const arranged = smartProfileBlocks(blocks, 640, (_, width) => { widths.push(width); return width < 400 ? 260 : 140 })
  assert.deepEqual(arranged.map((rect) => rect.span), [6, 6, 6])
  assert.deepEqual(widths, [304, 304, 304])
  arranged.forEach((rect) => { assert.ok(rect.width >= 240); assert.ok(rect.x >= 0); assert.ok(rect.x + rect.width <= 640); assert.equal(rect.height, 260) })
  assert.equal(arranged[2].y, 292)
  assert.deepEqual(smartProfileBlocks([], 640, () => 100), [])
  assert.deepEqual(smartProfileBlocks(blocks, 0, () => 100), [])
  const full = smartProfileBlocks([{ ...blocks[0], allowedSpans: [12] }], 964, () => 200)
  assert.equal(full[0].width, 964)
})

test('Smart Layout fills an entire row even when cards previously had arbitrary horizontal offsets', () => {
  const blocks = ['a', 'b', 'c'].map((sectionId, index) => ({ sectionId, x: 100 + index * 50, y: 100 + index * 10, width: 300, height: 300, allowedSpans: [4, 6, 8, 12] as const }))
  const arranged = smartProfileBlocks(blocks, 964, () => 150)
  assert.deepEqual(arranged.map((rect) => rect.x), [0, 332, 664])
  assert.deepEqual(arranged.map((rect) => rect.y), [0, 0, 0])
})

test('all eight resize directions keep opposite edges anchored', () => {
  const source = { sectionId: 'a', x: 100, y: 100, width: 400, height: 300 }
  for (const edge of ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'] as ProfileResizeEdge[]) {
    const { rect } = resizeProfileBlock(source, edge, 30, 25, 1200, 100)
    assert.equal(rect.x, edge.includes('w') ? 130 : 100)
    assert.equal(rect.y, edge.includes('n') ? 125 : 100)
    assert.equal(rect.width, edge.includes('w') ? 370 : edge.includes('e') ? 430 : 400)
    assert.equal(rect.height, edge.includes('n') ? 275 : edge.includes('s') ? 325 : 300)
  }
})

test('edge resizing enforces content minimums and canvas boundaries', () => {
  const source = { sectionId: 'a', x: 100, y: 100, width: 400, height: 300 }
  assert.equal(resizeProfileBlock(source, 'w', 1000, 0, 1200, 100).rect.width, 240)
  assert.equal(resizeProfileBlock(source, 'e', -1000, 0, 1200, 100).rect.width, 240)
  assert.equal(resizeProfileBlock(source, 's', 0, -1000, 1200, 220).rect.height, 220)
  const north = resizeProfileBlock(source, 'n', 0, 1000, 1200, 220).rect
  assert.equal(north.height, 220)
  assert.equal(north.y + north.height, 400)
  assert.equal(resizeProfileBlock(source, 'nw', -1000, -1000, 1200, 100).rect.x, 0)
  assert.equal(resizeProfileBlock(source, 'nw', -1000, -1000, 1200, 100).rect.y, 0)
  assert.equal(resizeProfileBlock(source, 'se', 1000, 0, 1200, 100).rect.width, 1100)
})

test('keyboard resizing can leave a snapped canvas edge in small increments', () => {
  const source = { sectionId: 'a', x: 0, y: 0, width: 1000, height: 300 }
  assert.equal(resizeProfileBlock(source, 'e', -10, 0, 1000, 100, [], false).rect.width, 990)
})

test('resizing snaps both edges to neighbors and pushes collisions safely', () => {
  const source = { sectionId: 'a', x: 0, y: 0, width: 300, height: 200 }
  const other = { sectionId: 'b', x: 400, y: 300, width: 300, height: 200 }
  const result = resizeProfileBlock(source, 'se', 96, 97, 1000, 100, [other])
  assert.equal(result.rect.width, 400)
  assert.equal(result.rect.height, 300)
  assert.equal(result.guides.length, 2)
  const resolved = resolveProfileBlocks([result.rect, other], 1000, 'a')
  assert.equal(profileBlocksCollide(resolved[0], resolved[1]), false)
})

test('optional desktop height survives JSON normalization without changing legacy placements', () => {
  const placement = { x: 0, y: 0, width: 0.5, height: 450 }
  assert.deepEqual(normalizeProfilePagePlacement(JSON.parse(JSON.stringify(placement))), placement)
  assert.equal(normalizeProfilePagePlacement({ ...placement, height: -1 })?.height, 80)
  assert.equal(normalizeProfilePagePlacement({ ...placement, height: Infinity })?.height, undefined)
  assert.equal(normalizeProfilePagePlacement({ x: 0, y: 0, width: 0.5 })?.height, undefined)
})

test('a wide block fills space beneath two short blocks beside a taller neighbor', () => {
  const rects = [
    { sectionId: 'a', x: 0, y: 0, width: 300, height: 160 },
    { sectionId: 'b', x: 332, y: 0, width: 300, height: 160 },
    { sectionId: 'c', x: 664, y: 0, width: 300, height: 280 },
    { sectionId: 'source', x: 0, y: 192, width: 632, height: 300 },
  ]
  assert.deepEqual(resolveProfileBlocks(rects, 964, 'source'), rects)
})

test('collisions push neighbors down in a chain while keeping the source fixed', () => {
  const rects = [
    { sectionId: 'a', x: 0, y: 0, width: 400, height: 100 },
    { sectionId: 'b', x: 0, y: 132, width: 400, height: 100 },
    { sectionId: 'source', x: 0, y: 10, width: 400, height: 150 },
  ]
  const resolved = resolveProfileBlocks(rects, 1000, 'source')
  assert.equal(resolved[2].y, 10)
  assert.equal(resolved[0].y, 192)
  assert.equal(resolved[1].y, 324)
  for (const [index, rect] of resolved.entries()) for (const other of resolved.slice(index + 1)) {
    assert.equal(profileBlocksCollide(rect, other), false)
  }
  assert.deepEqual(resolveProfileBlocks(resolved, 1000), resolved)
})

test('content growth and narrowing the canvas reflow without overlap or overflow', () => {
  const rects = [
    { sectionId: 'a', x: 0, y: 0, width: 450, height: 400 },
    { sectionId: 'b', x: 482, y: 0, width: 450, height: 100 },
    { sectionId: 'c', x: 0, y: 132, width: 450, height: 100 },
  ]
  const resolved = resolveProfileBlocks(rects, 700)
  assert.equal(resolved[1].y, 432)
  assert.equal(resolved[2].y, 564)
  assert.ok(resolved.every((rect) => rect.x >= 0 && rect.x + rect.width <= 700))
  const tiny = resolveProfileBlocks(rects, 200)
  assert.ok(tiny.every((rect) => rect.width === 200 && rect.x === 0))
})

test('edge and gutter snapping uses nearby guides without locking distant placements', () => {
  const source = { sectionId: 'source', x: 7, y: 190, width: 300, height: 200 }
  const other = { sectionId: 'a', x: 0, y: 0, width: 300, height: 160 }
  const result = snapProfileBlock(source, [other], 1000)
  assert.equal(result.rect.x, 0)
  assert.equal(result.rect.y, 192)
  assert.deepEqual(result.guides, [{ axis: 'x', position: 0 }, { axis: 'y', position: 192 }])
  const free = snapProfileBlock({ ...source, x: 480, y: 500 }, [other], 1000)
  assert.equal(free.rect.x, 480)
  assert.equal(free.rect.y, 500)
  assert.deepEqual(free.guides, [])
  assert.equal(snapProfileBlock({ ...source, x: 1200 }, [], 1000).rect.x, 700)
})

test('width resizing supports arbitrary widths, bounds, and alignment snapping', () => {
  const source = { sectionId: 'source', x: 0, y: 0, width: 300, height: 200 }
  assert.equal(snapProfileBlockWidth(source, 417, [], 1000).width, 417)
  assert.equal(snapProfileBlockWidth(source, 10, [], 1000).width, 240)
  assert.equal(snapProfileBlockWidth(source, 2000, [], 1000).width, 1000)
  const result = snapProfileBlockWidth(source, 497, [{ ...source, sectionId: 'other', x: 0, width: 500 }], 1000)
  assert.equal(result.width, 500)
  assert.deepEqual(result.guides, [{ axis: 'x', position: 500 }])
})

test('legacy layouts retain their order, visibility, and widths without invented positions', () => {
  const layout = normalizeProfilePageLayout({ schemaVersion: 1, sections: [
    { sectionId: 'c', order: 0, span: 8, visible: false },
    { sectionId: 'a', order: 1, span: 6, visible: false },
    { sectionId: 'b', order: 2, span: 4, visible: true },
  ] }, definitions)
  assert.equal(layout.schemaVersion, 1)
  assert.deepEqual(layout.sections.map((item) => [item.sectionId, item.span, item.visible]), [['c', 8, false], ['a', 6, true], ['b', 4, true]])
  assert.ok(layout.sections.every((item) => item.desktop === undefined))
})

test('new layout JSON survives normalization with desktop positions and independent mobile order', () => {
  const layout = normalizeProfilePageLayout({ schemaVersion: 2, sections: [
    { sectionId: 'a', order: 2, span: 4, desktop: { x: 0.4, y: 0, width: 0.4 } },
    { sectionId: 'b', order: 0, span: 4, desktop: { x: 0, y: 300, width: 0.3 } },
    { sectionId: 'c', order: 1, span: 4, desktop: { x: 0, y: 0, width: 0.3 } },
  ] }, definitions)
  assert.equal(layout.schemaVersion, 2)
  assert.deepEqual(layout.sections.map((item) => item.sectionId), ['b', 'c', 'a'])
  assert.equal(layout.sections[0].desktop?.y, 300)
  assert.deepEqual(normalizeProfilePageLayout(JSON.parse(JSON.stringify(layout)), definitions), layout)
})

test('invalid or excessive placement values cannot create unsafe canvas dimensions', () => {
  assert.equal(normalizeProfilePagePlacement({ x: 0, y: NaN, width: 0.4 }), undefined)
  assert.equal(normalizeProfilePagePlacement({ x: '0', y: 0, width: 0.4 }), undefined)
  assert.equal(normalizeProfilePagePlacement({ x: Infinity, y: 0, width: 0.4 }), undefined)
  assert.deepEqual(normalizeProfilePagePlacement({ x: 5, y: -40, width: 0.4 }), { x: 0.6, y: 0, width: 0.4 })
  assert.deepEqual(normalizeProfilePagePlacement({ x: -10, y: 200000, width: 20 }), { x: 0, y: 100000, width: 1 })
})
