// Model the same dense packing as the editor's 12-column CSS grid.
// Targets stay fixed for a drag so reflow cannot make the preview oscillate.
export type DragGridItem = { sectionId: string; span: number; height: number }
export type DragSlot = { index: number; x: number; y: number }

export function profilePageGridSpan(columnEnd: string) {
  // Mobile preview uses `1 / -1` on a single-column grid.
  const span = Number(columnEnd.match(/^span (\d+)$/)?.[1])
  return span >= 1 && span <= 12 ? span : 12
}

export function profilePageDragSlots(
  items: readonly DragGridItem[],
  sourceId: string,
  width: number,
  columnGap: number,
  rowGap: number
): DragSlot[] {
  const source = items.find((item) => item.sectionId === sourceId)
  if (!source) return []
  const others = items.filter((item) => item.sectionId !== sourceId)
  const columnWidth = (width - columnGap * 11) / 12
  return Array.from({ length: items.length }, (_, index) => {
    const reordered = [...others]
    reordered.splice(index, 0, source)
    const rows: { occupied: boolean[]; height: number }[] = []
    let sourceRow = 0
    let sourceColumn = 0
    for (const item of reordered) {
      let rowIndex = 0
      let column = 0
      while (true) {
        const row = rows[rowIndex] ?? { occupied: Array<boolean>(12).fill(false), height: 0 }
        rows[rowIndex] = row
        column = row.occupied.findIndex((_, start) => start + item.span <= 12
          && row.occupied.slice(start, start + item.span).every((occupied) => !occupied))
        if (column !== -1) break
        rowIndex++
      }
      const row = rows[rowIndex]
      row.occupied.fill(true, column, column + item.span)
      row.height = Math.max(row.height, item.height)
      if (item.sectionId === sourceId) {
        sourceRow = rowIndex
        sourceColumn = column
      }
    }
    return { index, x: sourceColumn * (columnWidth + columnGap),
      y: rows.slice(0, sourceRow).reduce((height, row) => height + row.height + rowGap, 0) }
  })
}

export function nearestProfilePageDragSlot(slots: readonly DragSlot[], x: number, y: number, currentIndex: number) {
  const current = slots.find((slot) => slot.index === currentIndex)
  if (!current) return currentIndex
  const distance = (slot: DragSlot) => Math.hypot(slot.x - x, slot.y - y)
  const nearest = slots.reduce((best, slot) => distance(slot) < distance(best) ? slot : best, current)
  // A small dead zone prevents flicker at the midpoint between two slots.
  return distance(nearest) + 12 < distance(current) ? nearest.index : currentIndex
}
