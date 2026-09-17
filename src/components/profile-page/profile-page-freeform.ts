import type { ProfilePageSpan } from './profile-page-types'

export const PROFILE_BLOCK_GAP = 32
export const PROFILE_BLOCK_MIN_WIDTH = 240
export const PROFILE_BLOCK_MIN_HEIGHT = 80
export type ProfileResizeEdge = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'

/** Resize only the grabbed edges, keeping their opposite edges anchored. */
export function resizeProfileBlock(source: ProfileBlockRect, edge: ProfileResizeEdge, dx: number, dy: number,
  canvasWidth: number, contentHeight: number, others: readonly ProfileBlockRect[] = [], snapToGuides = true) {
  const right = source.x + source.width
  const bottom = source.y + source.height
  const minWidth = Math.min(PROFILE_BLOCK_MIN_WIDTH, canvasWidth)
  const minHeight = Math.max(PROFILE_BLOCK_MIN_HEIGHT, contentHeight)
  const rect = { ...source }
  const guides: ProfileAlignmentGuide[] = []
  const snap = (value: number, targets: number[], min: number, max: number, axis: 'x' | 'y') => {
    const valid = targets.filter((target) => target >= min && target <= max)
    const nearest = valid.sort((a, b) => Math.abs(a - value) - Math.abs(b - value))[0]
    if (snapToGuides && nearest !== undefined && Math.abs(nearest - value) <= 10) {
      guides.push({ axis, position: nearest })
      return nearest
    }
    return Math.max(min, Math.min(max, value))
  }
  const xs = [0, canvasWidth, ...others.flatMap((other) => [other.x, other.x + other.width, other.x - PROFILE_BLOCK_GAP, other.x + other.width + PROFILE_BLOCK_GAP])]
  const ys = [0, ...others.flatMap((other) => [other.y, other.y + other.height, other.y - PROFILE_BLOCK_GAP, other.y + other.height + PROFILE_BLOCK_GAP])]
  if (edge.includes('w')) { rect.x = snap(source.x + dx, xs, 0, Math.max(0, right - minWidth), 'x'); rect.width = right - rect.x }
  if (edge.includes('e')) rect.width = snap(right + dx, xs, source.x + minWidth, canvasWidth, 'x') - source.x
  if (edge.includes('n')) { rect.y = snap(source.y + dy, ys, 0, Math.max(0, bottom - minHeight), 'y'); rect.height = Math.max(minHeight, bottom - rect.y) }
  if (edge.includes('s')) rect.height = snap(bottom + dy, ys, source.y + minHeight, 100000, 'y') - source.y
  if (!edge.includes('n') && !edge.includes('s')) rect.height = Math.max(minHeight, source.height)
  return { rect, guides }
}

export type ProfileBlockRect = { sectionId: string; x: number; y: number; width: number; height: number }
export type ProfileAlignmentGuide = { axis: 'x' | 'y'; position: number }

/** Fit content and fill the earliest available space; default priority breaks ties. */
export function autoProfileBlocks(
  blocks: readonly { sectionId: string; priority: number; allowedSpans: readonly ProfilePageSpan[] }[],
  canvasWidth: number,
  measureHeight: (sectionId: string, width: number) => number,
) {
  if (canvasWidth <= 0) return []
  const unit = (canvasWidth + PROFILE_BLOCK_GAP) / 24
  const pending = [...blocks].sort((a, b) => a.priority - b.priority || a.sectionId.localeCompare(b.sectionId)).map((block) => {
    const minimumSpan = Math.min(...block.allowedSpans)
    // Compact cards may use quarter width even though toolbar presets start at thirds.
    const columns = [6, ...block.allowedSpans.map((span) => span * 2)]
      .filter((columns, index, all) => all.indexOf(columns) === index && columns >= (minimumSpan <= 4 ? 6 : minimumSpan * 2))
      .sort((a, b) => a - b)
      .filter((columns) => unit * columns - PROFILE_BLOCK_GAP >= Math.min(PROFILE_BLOCK_MIN_WIDTH, canvasWidth))
    const sizes = (columns.length ? columns : [24]).map((columns) => ({ columns,
      height: measureHeight(block.sectionId, unit * columns - PROFILE_BLOCK_GAP) }))
    const shortest = Math.min(...sizes.map((size) => size.height))
    // Avoid squeezing content into a tall narrow card just to save horizontal space.
    const size = sizes.find((size) => size.height <= shortest * 1.25 + 24)!
    return { ...block, ...size }
  })
  const skyline = Array<number>(24).fill(0)
  const placed: (ProfileBlockRect & { span: ProfilePageSpan })[] = []
  while (pending.length) {
    let index = 0
    let column = 0
    let y = Infinity
    pending.forEach((block, candidate) => {
      for (let start = 0; start <= 24 - block.columns; start++) {
        const top = Math.max(...skyline.slice(start, start + block.columns))
        if (top < y) { index = candidate; column = start; y = top }
      }
    })
    // Fill the entire available horizontal run, then justify its cards edge to edge.
    let left = column
    let right = column + pending[index].columns
    while (left > 0 && skyline[left - 1] <= y) left--
    while (right < 24 && skyline[right] <= y) right++
    const [first] = pending.splice(index, 1)
    const group = [first]
    let remaining = right - left - first.columns
    for (let candidate = 0; candidate < pending.length && group.length < 4;) {
      if (pending[candidate].columns <= remaining) {
        const [block] = pending.splice(candidate, 1)
        group.push(block)
        remaining -= block.columns
      } else candidate++
    }
    const widths = group.map((block) => block.columns)
    while (remaining-- > 0) {
      const next = widths.reduce((best, columns, index) => columns / group[index].columns < widths[best] / group[best].columns ? index : best, 0)
      widths[next]++
    }
    column = left
    group.forEach((block, index) => {
      const columns = widths[index]
      const width = unit * columns - PROFILE_BLOCK_GAP
      const height = measureHeight(block.sectionId, width)
      const allowed: readonly ProfilePageSpan[] = block.allowedSpans.length ? block.allowedSpans : [12]
      const span = allowed.reduce((best, next) => Math.abs(next * 2 - columns) < Math.abs(best * 2 - columns) ? next : best)
      placed.push({ sectionId: block.sectionId, span, x: column * unit, y, width, height })
      skyline.fill(y + height + PROFILE_BLOCK_GAP, column, column + columns)
      column += columns
    })
  }
  return placed
}

/** Read approximate rows left to right, allowing a gutter of vertical misalignment. */
export function profileBlockReadingOrder(rects: readonly ProfileBlockRect[]) {
  const remaining = [...rects].sort((a, b) => a.y - b.y || a.x - b.x || a.sectionId.localeCompare(b.sectionId))
  const ordered: ProfileBlockRect[] = []
  while (remaining.length) {
    const top = remaining[0].y
    const count = remaining.findIndex((rect) => rect.y > top + PROFILE_BLOCK_GAP)
    ordered.push(...remaining.splice(0, count === -1 ? remaining.length : count)
      .sort((a, b) => a.x - b.x || a.y - b.y || a.sectionId.localeCompare(b.sectionId)))
  }
  return ordered
}

/** Normalize widths and pack independent-height cards, retaining their spatial intent. */
export function smartProfileBlocks(
  blocks: readonly (ProfileBlockRect & { allowedSpans: readonly ProfilePageSpan[] })[],
  canvasWidth: number,
  measureHeight: (sectionId: string, width: number) => number,
) {
  if (canvasWidth <= 0) return []
  const unit = (canvasWidth + PROFILE_BLOCK_GAP) / 12
  const skyline = Array<number>(12).fill(0)
  const placed: (ProfileBlockRect & { span: ProfilePageSpan })[] = []
  for (const source of profileBlockReadingOrder(blocks)) {
    const allowed = blocks.find((block) => block.sectionId === source.sectionId)!.allowedSpans
    const spans = allowed.filter((span) => unit * span - PROFILE_BLOCK_GAP >= Math.min(PROFILE_BLOCK_MIN_WIDTH, canvasWidth))
    // If only undersized spans are allowed, keep the block usable at full width.
    const candidates: readonly ProfilePageSpan[] = spans.length ? spans : [12]
    const span = candidates.reduce((best, next) => Math.abs(unit * next - PROFILE_BLOCK_GAP - source.width)
      < Math.abs(unit * best - PROFILE_BLOCK_GAP - source.width) ? next : best)
    const width = unit * span - PROFILE_BLOCK_GAP
    const height = measureHeight(source.sectionId, width)
    const preferredX = Math.max(0, Math.min(canvasWidth - width, source.x + (source.width - width) / 2))
    let column = 0
    let y = Infinity
    for (let start = 0; start <= 12 - span; start++) {
      // Begin at canvas edges or existing column boundaries, avoiding stray margins.
      const end = start + span
      if (start !== 0 && end !== 12 && skyline[start] === skyline[start - 1] && skyline[end] === skyline[end - 1]) continue
      const top = Math.max(...skyline.slice(start, start + span))
      if (top < y || (top === y && Math.abs(start * unit - preferredX) < Math.abs(column * unit - preferredX))) {
        column = start
        y = top
      }
    }
    placed.push({ sectionId: source.sectionId, x: column * unit, y, width, height, span })
    skyline.fill(y + height + PROFILE_BLOCK_GAP, column, column + span)
  }
  return placed
}

export function profileBlocksCollide(a: ProfileBlockRect, b: ProfileBlockRect, gap = PROFILE_BLOCK_GAP) {
  const epsilon = 0.5
  return a.x < b.x + b.width + gap - epsilon && a.x + a.width + gap > b.x + epsilon
    && a.y < b.y + b.height + gap - epsilon && a.y + a.height + gap > b.y + epsilon
}

/** Keep the manipulated block fixed and push collisions down, without shared rows. */
export function resolveProfileBlocks(rects: readonly ProfileBlockRect[], canvasWidth: number, activeId?: string) {
  const sorted = [...rects].sort((a, b) => {
    if (a.sectionId === activeId) return -1
    if (b.sectionId === activeId) return 1
    return a.y - b.y || a.x - b.x
  })
  const placed: ProfileBlockRect[] = []
  for (const rect of sorted) {
    const width = Math.min(canvasWidth, Math.max(Math.min(PROFILE_BLOCK_MIN_WIDTH, canvasWidth), rect.width))
    const next = { ...rect, width, x: Math.max(0, Math.min(canvasWidth - width, rect.x)), y: Math.max(0, rect.y) }
    // Each pass clears at least one earlier block; the result cannot cycle.
    let collisions = placed.filter((other) => profileBlocksCollide(next, other))
    while (collisions.length) {
      next.y = Math.max(...collisions.map((other) => other.y + other.height + PROFILE_BLOCK_GAP))
      collisions = placed.filter((other) => profileBlocksCollide(next, other))
    }
    placed.push(next)
  }
  return rects.map((rect) => placed.find((item) => item.sectionId === rect.sectionId)!)
}

export function snapProfileBlock(source: ProfileBlockRect, others: readonly ProfileBlockRect[], canvasWidth: number) {
  const maxX = Math.max(0, canvasWidth - source.width)
  const xTargets = [{ value: 0, guide: 0 }, { value: maxX, guide: canvasWidth }]
  const yTargets = [{ value: 0, guide: 0 }]
  for (const other of others) {
    xTargets.push(
      { value: other.x, guide: other.x },
      { value: other.x + other.width - source.width, guide: other.x + other.width },
      { value: other.x + other.width + PROFILE_BLOCK_GAP, guide: other.x + other.width + PROFILE_BLOCK_GAP },
      { value: other.x - source.width - PROFILE_BLOCK_GAP, guide: other.x - PROFILE_BLOCK_GAP },
    )
    yTargets.push(
      { value: other.y, guide: other.y },
      { value: other.y + other.height - source.height, guide: other.y + other.height },
      { value: other.y + other.height + PROFILE_BLOCK_GAP, guide: other.y + other.height + PROFILE_BLOCK_GAP },
      { value: other.y - source.height - PROFILE_BLOCK_GAP, guide: other.y - PROFILE_BLOCK_GAP },
    )
  }
  const nearest = (targets: { value: number; guide: number }[], value: number, max = Infinity) => {
    const valid = targets.filter((target) => target.value >= 0 && target.value <= max)
    const target = valid.reduce((best, target) => Math.abs(target.value - value) < Math.abs(best.value - value) ? target : best)
    return Math.abs(target.value - value) <= 10 ? target : null
  }
  const x = Math.max(0, Math.min(maxX, source.x))
  const y = Math.max(0, source.y)
  const snapX = nearest(xTargets, x, maxX)
  const snapY = nearest(yTargets, y)
  const guides: ProfileAlignmentGuide[] = []
  if (snapX) guides.push({ axis: 'x', position: snapX.guide })
  if (snapY) guides.push({ axis: 'y', position: snapY.guide })
  return { rect: { ...source, x: snapX?.value ?? x, y: snapY?.value ?? y }, guides }
}

export function snapProfileBlockWidth(source: ProfileBlockRect, requestedWidth: number, others: readonly ProfileBlockRect[], canvasWidth: number) {
  const min = Math.min(PROFILE_BLOCK_MIN_WIDTH, canvasWidth - source.x)
  const width = Math.max(min, Math.min(canvasWidth - source.x, requestedWidth))
  const edges = [canvasWidth, ...others.flatMap((other) => [other.x, other.x + other.width, other.x - PROFILE_BLOCK_GAP])]
  const nearest = edges.reduce((best, edge) => Math.abs(edge - source.x - width) < Math.abs(best - source.x - width) ? edge : best)
  const snapped = Math.abs(nearest - source.x - width) <= 10 && nearest - source.x >= min
  return { width: snapped ? nearest - source.x : width,
    guides: snapped ? [{ axis: 'x' as const, position: nearest }] : [] }
}
