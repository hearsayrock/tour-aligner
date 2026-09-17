'use client'

import { useRouter } from 'next/navigation'
import { flushSync } from 'react-dom'
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import {
  Check,
  Eye,
  EyeOff,
  LayoutGrid,
  GripVertical,
  LoaderCircle,
  Monitor,
  MoveDiagonal2,
  PanelRight,
  PencilLine,
  RotateCcw,
  Save,
  Smartphone,
  WandSparkles,
  Undo2,
  X,
} from 'lucide-react'
import { cx } from '@/components/ui/primitives'
import { nearestProfilePageDragSlot, profilePageDragSlots, type DragSlot } from './profile-page-drag'
import { ProfilePageSurface, measureProfileSurface, measureProfileContent, type ProfileSurfaceGeometry } from './ProfilePageSurface'
import { ProfilePageStudioMenu } from './ProfilePageStudioMenu'
import { PROFILE_BLOCK_GAP, PROFILE_BLOCK_MIN_WIDTH, autoProfileBlocks, profileBlockReadingOrder, smartProfileBlocks, resolveProfileBlocks, resizeProfileBlock, snapProfileBlock, type ProfileResizeEdge, type ProfileBlockRect, type ProfileAlignmentGuide } from './profile-page-freeform'
import {
  createDefaultProfilePageLayout,
  normalizeProfilePageLayout,
  profilePageLayoutsEqual,
  type ProfilePageLayout,
  type ProfilePageSectionContent,
  type ProfilePageSectionDefinition,
  type ProfilePageSpan,
} from '@/components/profile-page/profile-page-types'

const SPAN_LABELS: Record<ProfilePageSpan, string> = {
  4: '⅓',
  6: '½',
  8: '⅔',
  12: 'Full',
}

type SaveResult = { success?: true; error?: string }

const RESIZE_HANDLES: { edge: ProfileResizeEdge; label: string; style: CSSProperties; cursor: string }[] = [
  { edge: 'n', label: 'top edge', cursor: 'ns-resize', style: { top: -5, left: 18, right: 18, height: 12 } },
  { edge: 's', label: 'bottom edge', cursor: 'ns-resize', style: { bottom: -5, left: 18, right: 18, height: 12 } },
  { edge: 'w', label: 'left edge', cursor: 'ew-resize', style: { left: -5, top: 18, bottom: 18, width: 12 } },
  { edge: 'e', label: 'right edge', cursor: 'ew-resize', style: { right: -5, top: 18, bottom: 18, width: 12 } },
  { edge: 'nw', label: 'top-left corner', cursor: 'nwse-resize', style: { top: -5, left: -5, width: 24, height: 24 } },
  { edge: 'ne', label: 'top-right corner', cursor: 'nesw-resize', style: { top: -5, right: -5, width: 24, height: 24 } },
  { edge: 'sw', label: 'bottom-left corner', cursor: 'nesw-resize', style: { bottom: -5, left: -5, width: 24, height: 24 } },
  { edge: 'se', label: 'bottom-right corner', cursor: 'nwse-resize', style: { bottom: -5, right: -5, width: 24, height: 24 } },
]

type PlacementSession<SectionId extends string> = {
  kind: 'move' | 'resize'
  edge?: ProfileResizeEdge
  contentWidth?: number
  contentHeight?: number
  sectionId: SectionId
  pointerId: number
  startX: number
  startY: number
  x: number
  y: number
  offsetX: number
  offsetY: number
  startLayout: ProfilePageLayout<SectionId>
  geometry: ProfileSurfaceGeometry
  source: ProfileBlockRect
  slots: DragSlot[]
  sectionIds: SectionId[]
  index: number
  ghost: HTMLElement | null
  active: boolean
  cursor: string
  userSelect: string
}

function applyProfileGeometry<SectionId extends string>(layout: ProfilePageLayout<SectionId>, rects: readonly ProfileBlockRect[], width: number, heightId?: SectionId): ProfilePageLayout<SectionId> {
  if (!width) return layout
  return { ...layout, schemaVersion: 2, sections: layout.sections.map((item) => {
    const rect = rects.find((rect) => rect.sectionId === item.sectionId)
    if (!rect) return item
    return { ...item, desktop: { ...item.desktop, x: rect.x / (width + PROFILE_BLOCK_GAP), y: rect.y, width: (rect.width + PROFILE_BLOCK_GAP) / (width + PROFILE_BLOCK_GAP),
      ...(item.sectionId === heightId ? { height: rect.height } : {}) } }
  }) }
}

function moveToIndex<SectionId extends string>(
  layout: ProfilePageLayout<SectionId>,
  sourceId: SectionId,
  targetIndex: number,
  sectionIds: readonly SectionId[]
) {
  const visible = layout.sections.filter((section) => sectionIds.includes(section.sectionId)).sort((a, b) => a.order - b.order)
  const hidden = layout.sections.filter((section) => !sectionIds.includes(section.sectionId)).sort((a, b) => a.order - b.order)
  const sourceIndex = visible.findIndex((section) => section.sectionId === sourceId)
  if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return layout

  const reordered = [...visible]
  const [source] = reordered.splice(sourceIndex, 1)
  reordered.splice(targetIndex, 0, source)
  return {
    ...layout,
    sections: [...reordered, ...hidden].map((section, order) => ({ ...section, order })),
  }
}

export function ProfilePageLayoutEditor<SectionId extends string>({
  initialLayout,
  definitions,
  sections,
  hero,
  className,
  style,
  exitHref,
  editDetailsHref,
  onEditDetails,
  saveAction,
  externalDirty = false,
  inspector,
  inspectorOpen = false,
  onOpenInspector,
  inspectorLabel = 'Customize',
  onEditSection,
  editableSectionIds,
  toolbarActions,
}: {
  initialLayout: ProfilePageLayout<SectionId>
  definitions: readonly ProfilePageSectionDefinition<SectionId>[]
  sections: readonly ProfilePageSectionContent<SectionId>[]
  hero: ReactNode
  className?: string
  style?: CSSProperties
  exitHref: string
  editDetailsHref: string
  onEditDetails?: () => void
  saveAction: (layout: ProfilePageLayout<SectionId>) => Promise<SaveResult>
  externalDirty?: boolean
  inspector?: ReactNode
  inspectorOpen?: boolean
  onOpenInspector?: () => void
  inspectorLabel?: string
  onEditSection?: (sectionId: SectionId) => void
  editableSectionIds?: readonly SectionId[]
  toolbarActions?: ReactNode
}) {
  const router = useRouter()
  const [layout, setLayout] = useState(initialLayout)
  const [savedLayout, setSavedLayout] = useState(initialLayout)
  const [history, setHistory] = useState<ProfilePageLayout<SectionId>[]>([])
  const [viewport, setViewport] = useState<'desktop' | 'mobile'>('desktop')
  const [draggedSection, setDraggedSection] = useState<SectionId | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [savedNotice, setSavedNotice] = useState(false)
  const gridRef = useRef<HTMLDivElement | null>(null)
  const layoutRef = useRef(layout)
  const dragRef = useRef<PlacementSession<SectionId> | null>(null)
  const geometryRef = useRef<ProfileSurfaceGeometry>({ width: 0, stacked: true, rects: [] })
  const [guides, setGuides] = useState<ProfileAlignmentGuide[]>([])
  const [stacked, setStacked] = useState(true)
  const contentById = useMemo(
    () => new Map(sections.map((section) => [section.sectionId, section.content])),
    [sections]
  )
  const definitionById = useMemo(
    () => new Map(definitions.map((definition) => [definition.sectionId, definition])),
    [definitions]
  )
  const isDirty = !profilePageLayoutsEqual(layout, savedLayout) || externalDirty

  useEffect(() => {
    const normalized = normalizeProfilePageLayout(layoutRef.current, definitions)
    if (profilePageLayoutsEqual(layoutRef.current, normalized)) return
    layoutRef.current = normalized
    setLayout(normalized)
  }, [definitions])

  function replaceLayout(next: ProfilePageLayout<SectionId>) {
    layoutRef.current = next
    setLayout(next)
  }

  function commitLayout(next: ProfilePageLayout<SectionId>) {
    if (profilePageLayoutsEqual(layoutRef.current, next)) return
    setHistory((current) => [...current, layoutRef.current])
    replaceLayout(next)
    setSaveError(null)
    setSavedNotice(false)
  }

  function readGeometry(): ProfileSurfaceGeometry {
    const grid = gridRef.current
    if (!grid) return geometryRef.current
    return measureProfileSurface(grid)
  }

  function resizeMeasuredBlock(source: ProfileBlockRect, width: number, canvasWidth: number) {
    source.width = Math.min(canvasWidth, Math.max(PROFILE_BLOCK_MIN_WIDTH, width))
    source.x = Math.max(0, Math.min(canvasWidth - source.width, source.x))
    const grid = gridRef.current
    const element = grid?.querySelector<HTMLElement>(`[data-section-id="${CSS.escape(source.sectionId)}"]`)
    if (!grid || !element) return
    // Width buttons and keyboard resizing need the new content height before pushing neighbors.
    source.height = Math.max(measureProfileContent(element, source.width), layoutRef.current.sections.find((item) => item.sectionId === source.sectionId)?.desktop?.height ?? 0)
  }

  useEffect(() => {
    let frame = 0
    function finish(cancel: boolean) {
      const session = dragRef.current
      if (!session) return
      cancelAnimationFrame(frame)
      session.ghost?.remove()
      document.body.style.cursor = session.cursor
      document.body.style.userSelect = session.userSelect
      if (cancel) {
        layoutRef.current = session.startLayout
        setLayout(session.startLayout)
      } else if (session.active) {
        if (!session.geometry.stacked) {
          const grid = gridRef.current
          if (grid) {
            const measured = measureProfileSurface(grid).rects
            const current = session.geometry.rects.map((original) => {
              const actual = measured.find((rect) => rect.sectionId === original.sectionId)
              if (original.sectionId === session.sectionId && actual) return actual
              return { ...original, height: actual?.height ?? original.height }
            })
            // Persist displaced neighbors too, so releasing cannot change the preview.
            const next = applyProfileGeometry(layoutRef.current, resolveProfileBlocks(current, grid.clientWidth, session.sectionId), grid.clientWidth)
            layoutRef.current = next
            setLayout(next)
          }
        }
        if (!profilePageLayoutsEqual(session.startLayout, layoutRef.current)) {
          setHistory((current) => [...current, session.startLayout])
          setSaveError(null)
          setSavedNotice(false)
        }
      }
      dragRef.current = null
      setGuides([])
      setDraggedSection(null)
    }

    function preview() {
      const session = dragRef.current
      const grid = gridRef.current
      if (!session?.active || !grid) return
      if (session.kind === 'move') {
        const top = 120
        const bottom = window.innerHeight - 70
        const scroll = session.y < top ? -Math.min(18, (top - session.y) / 4)
          : session.y > bottom ? Math.min(18, (session.y - bottom) / 4) : 0
        if (scroll) window.scrollBy(0, scroll)
      }
      if (session.ghost) {
        session.ghost.style.left = `${session.x - session.offsetX}px`
        session.ghost.style.top = `${session.y - session.offsetY}px`
      }
      const origin = grid.getBoundingClientRect()
      let next = session.startLayout
      if (session.geometry.stacked) {
        const index = nearestProfilePageDragSlot(session.slots, 0,
          session.y - session.offsetY - origin.top, session.index)
        session.index = index
        next = moveToIndex(session.startLayout, session.sectionId, index, session.sectionIds)
      } else {
        // Use the starting positions every frame to prevent accumulating pushes.
        const rects = session.geometry.rects.map((rect) => ({ ...rect,
          height: grid.querySelector<HTMLElement>(`[data-section-id="${CSS.escape(rect.sectionId)}"]`)?.offsetHeight ?? rect.height }))
        const source = rects.find((rect) => rect.sectionId === session.sectionId)!
        let nextGuides: ProfileAlignmentGuide[]
        if (session.kind === 'resize') {
          const others = rects.filter((rect) => rect.sectionId !== session.sectionId)
          const dx = session.x - session.startX
          const dy = session.y - session.startY
          const proposed = resizeProfileBlock(session.source, session.edge!, dx, dy, session.geometry.width, 0, others)
          const element = grid.querySelector<HTMLElement>(`[data-section-id="${CSS.escape(session.sectionId)}"]`)!
          if (session.contentWidth !== proposed.rect.width) {
            session.contentWidth = proposed.rect.width
            session.contentHeight = measureProfileContent(element, proposed.rect.width)
          }
          const result = resizeProfileBlock(session.source, session.edge!, dx, dy, session.geometry.width, session.contentHeight!, others)
          if (!session.edge!.includes('n') && !session.edge!.includes('s')) {
            result.rect.height = Math.max(session.contentHeight!, session.startLayout.sections.find((item) => item.sectionId === session.sectionId)?.desktop?.height ?? 0)
          }
          Object.assign(source, result.rect)
          nextGuides = result.guides
        } else {
          const result = snapProfileBlock({ ...source, x: session.x - session.offsetX - origin.left,
            y: session.y - session.offsetY - origin.top }, rects.filter((rect) => rect.sectionId !== session.sectionId), session.geometry.width)
          Object.assign(source, result.rect)
          nextGuides = result.guides
        }
        setGuides((old) => JSON.stringify(old) === JSON.stringify(nextGuides) ? old : nextGuides)
        next = applyProfileGeometry(session.startLayout, resolveProfileBlocks(rects, session.geometry.width, session.sectionId), session.geometry.width,
          session.edge?.includes('n') || session.edge?.includes('s') ? session.sectionId : undefined)
      }
      if (!profilePageLayoutsEqual(layoutRef.current, next)) {
        layoutRef.current = next
        setLayout(next)
      }
      frame = requestAnimationFrame(preview)
    }

    function move(event: PointerEvent) {
      const session = dragRef.current
      if (!session || event.pointerId !== session.pointerId) return
      session.x = event.clientX
      session.y = event.clientY
      if (!session.active && Math.hypot(session.x - session.startX, session.y - session.startY) >= 5) {
        session.active = true
        if (session.ghost) session.ghost.style.visibility = 'visible'
        document.body.style.cursor = session.edge ? RESIZE_HANDLES.find((handle) => handle.edge === session.edge)!.cursor : 'grabbing'
        document.body.style.userSelect = 'none'
        setDraggedSection(session.sectionId)
        frame = requestAnimationFrame(preview)
      }
    }
    function up(event: PointerEvent) {
      const session = dragRef.current
      if (event.pointerId !== session?.pointerId) return
      if (session.active) {
        session.x = event.clientX
        session.y = event.clientY
        // Apply the release coordinates even when the last move beat the next frame.
        flushSync(preview)
      }
      finish(false)
    }
    function cancel(event: PointerEvent) {
      if (event.pointerId === dragRef.current?.pointerId) finish(true)
    }
    function key(event: KeyboardEvent) {
      if (event.key === 'Escape' && dragRef.current) {
        event.preventDefault()
        finish(true)
      }
    }
    const blur = () => finish(true)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', cancel)
    window.addEventListener('keydown', key)
    window.addEventListener('blur', blur)
    window.addEventListener('resize', blur)
    return () => {
      finish(true)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', cancel)
      window.removeEventListener('keydown', key)
      window.removeEventListener('blur', blur)
      window.removeEventListener('resize', blur)
    }
  }, [])

  function handlePlacementStart(event: ReactPointerEvent<HTMLButtonElement>, sectionId: SectionId, kind: 'move' | 'resize', edge?: ProfileResizeEdge) {
    const grid = gridRef.current
    const element = event.currentTarget.closest('article')
    if (!grid || !element || event.button !== 0 || dragRef.current) return
    const geometry = readGeometry()
    if (kind === 'resize' && geometry.stacked) return
    const source = geometry.rects.find((rect) => rect.sectionId === sectionId)
    if (!source) return
    event.preventDefault()
    event.stopPropagation()
    const rect = element.getBoundingClientRect()
    let ghost: HTMLElement | null = null
    if (kind === 'move') {
      ghost = element.cloneNode(true) as HTMLElement
      ghost.removeAttribute('data-section-id')
      ghost.querySelectorAll('[id]').forEach((element) => element.removeAttribute('id'))
      ghost.inert = true
      ghost.setAttribute('aria-hidden', 'true')
      Object.assign(ghost.style, { position: 'fixed', width: `${rect.width}px`, height: `${rect.height}px`, left: `${rect.left}px`, top: `${rect.top}px`, margin: '0', pointerEvents: 'none', zIndex: '90', opacity: '0.7', visibility: 'hidden', boxShadow: '0 24px 60px rgba(0,0,0,0.25)', transition: 'none' })
      grid.appendChild(ghost)
    }
    const sectionIds = geometry.rects.map((item) => item.sectionId as SectionId)
    dragRef.current = {
      kind, edge, sectionId, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY,
      x: event.clientX, y: event.clientY, offsetX: event.clientX - rect.left, offsetY: event.clientY - rect.top,
      startLayout: layoutRef.current, geometry, source, sectionIds,
      slots: profilePageDragSlots(geometry.rects.map((rect) => ({ ...rect, span: 12 })), sectionId, geometry.width, 0, parseFloat(getComputedStyle(grid).rowGap) || 20),
      index: sectionIds.indexOf(sectionId), ghost, active: false,
      cursor: document.body.style.cursor, userSelect: document.body.style.userSelect,
    }
  }

  function handlePlacementKey(event: React.KeyboardEvent, sectionId: SectionId, edge?: ProfileResizeEdge) {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key) || dragRef.current) return
    const geometry = readGeometry()
    const source = geometry.rects.find((rect) => rect.sectionId === sectionId)
    const horizontal = event.key === 'ArrowLeft' || event.key === 'ArrowRight'
    if (!source || (edge && (geometry.stacked || (horizontal ? !edge.includes('e') && !edge.includes('w') : !edge.includes('n') && !edge.includes('s'))))) return
    event.preventDefault()
    if (geometry.stacked) {
      const ids = geometry.rects.map((rect) => rect.sectionId as SectionId)
      const index = ids.indexOf(sectionId)
      const target = Math.max(0, Math.min(ids.length - 1, index + (event.key === 'ArrowUp' || event.key === 'ArrowLeft' ? -1 : 1)))
      commitLayout(moveToIndex(layoutRef.current, sectionId, target, ids))
    } else {
      const step = event.shiftKey ? 40 : 10
      if (edge) {
        const dx = event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0
        const dy = event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0
        const proposed = resizeProfileBlock(source, edge, dx, dy, geometry.width, 0, [], false)
        const element = gridRef.current!.querySelector<HTMLElement>(`[data-section-id="${CSS.escape(sectionId)}"]`)!
        const contentHeight = measureProfileContent(element, proposed.rect.width)
        Object.assign(source, resizeProfileBlock(source, edge, dx, dy, geometry.width, contentHeight, [], false).rect)
        if (!edge.includes('n') && !edge.includes('s')) source.height = Math.max(contentHeight, layoutRef.current.sections.find((item) => item.sectionId === sectionId)?.desktop?.height ?? 0)
      }
      else {
        source.x += event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0
        source.y += event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0
      }
      commitLayout(applyProfileGeometry(layoutRef.current, resolveProfileBlocks(geometry.rects, geometry.width, sectionId), geometry.width,
        edge?.includes('n') || edge?.includes('s') ? sectionId : undefined))
    }
  }

  useEffect(() => {
    function warnBeforeUnload(event: BeforeUnloadEvent) {
      if (isDirty) event.preventDefault()
    }
    window.addEventListener('beforeunload', warnBeforeUnload)
    return () => window.removeEventListener('beforeunload', warnBeforeUnload)
  }, [isDirty])

  function updateSection(sectionId: SectionId, updates: { span?: ProfilePageSpan; visible?: boolean }) {
    let next = layoutRef.current
    if (updates.span) {
      const geometry = readGeometry()
      if (!geometry.stacked) {
        const source = geometry.rects.find((rect) => rect.sectionId === sectionId)
        if (source) {
          resizeMeasuredBlock(source, (geometry.width + PROFILE_BLOCK_GAP) * updates.span / 12 - PROFILE_BLOCK_GAP, geometry.width)
          next = applyProfileGeometry(next, resolveProfileBlocks(geometry.rects, geometry.width, sectionId), geometry.width)
        }
      }
    }
    commitLayout({ ...next, sections: next.sections.map((section) => (
      section.sectionId === sectionId ? { ...section, ...updates } : section
    )) })
  }

  function updateHero(updates: Partial<ProfilePageLayout<SectionId>['hero']>) {
    commitLayout({
      ...layoutRef.current,
      hero: { ...layoutRef.current.hero, ...updates },
    })
  }

  function undo() {
    const previous = history.at(-1)
    if (!previous) return
    setHistory((current) => current.slice(0, -1))
    replaceLayout(previous)
    setSaveError(null)
    setSavedNotice(false)
  }

  function reset() {
    commitLayout(createDefaultProfilePageLayout(definitions))
  }

  function arrangeLayout(mode: 'smart' | 'auto') {
    const grid = gridRef.current
    const geometry = readGeometry()
    if (!grid || geometry.stacked || dragRef.current) return
    const measureHeight = (sectionId: string, width: number) => {
      const element = grid.querySelector<HTMLElement>(`[data-section-id="${CSS.escape(sectionId)}"]`)!
      return measureProfileContent(element, width)
    }
    const arranged = mode === 'auto' ? autoProfileBlocks(geometry.rects.map((rect) => ({ sectionId: rect.sectionId,
      priority: definitionById.get(rect.sectionId as SectionId)?.defaultOrder ?? Infinity,
      allowedSpans: definitionById.get(rect.sectionId as SectionId)?.allowedSpans ?? [4, 6, 8, 12],
    })), geometry.width, measureHeight) : smartProfileBlocks(geometry.rects.map((rect) => ({ ...rect,
      allowedSpans: definitionById.get(rect.sectionId as SectionId)?.allowedSpans ?? [4, 6, 8, 12],
    })), geometry.width, measureHeight)
    const orderedIds = profileBlockReadingOrder(arranged).map((rect) => rect.sectionId)
    const previous = layoutRef.current
    const remaining = previous.sections.filter((item) => !orderedIds.includes(item.sectionId)).sort((a, b) => a.order - b.order)
    const next = { ...previous, schemaVersion: 2 as const, sections: [...orderedIds.map((id) => previous.sections.find((item) => item.sectionId === id)!), ...remaining]
      .map((item, order) => {
        const rect = arranged.find((rect) => rect.sectionId === item.sectionId)
        if (!rect) return { ...item, order }
        // Arrangement returns to content-driven height, removing manual blank space.
        return { ...item, order, span: rect.span, desktop: { x: rect.x / (geometry.width + PROFILE_BLOCK_GAP),
          y: rect.y, width: (rect.width + PROFILE_BLOCK_GAP) / (geometry.width + PROFILE_BLOCK_GAP) } }
      }) }
    commitLayout(next)
  }

  async function save() {
    const savingLayout = layoutRef.current
    setSaving(true)
    setSaveError(null)
    setSavedNotice(false)
    try {
      const result = await saveAction(savingLayout)
      if (result.error) {
        setSaveError(result.error)
        return
      }
      setSavedLayout(savingLayout)
      const unchanged = profilePageLayoutsEqual(layoutRef.current, savingLayout)
      if (unchanged) setHistory([])
      setSavedNotice(unchanged)
      router.refresh()
    } catch {
      setSaveError('Your page changes could not be saved. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  function navigateAway(href: string, replace = false) {
    if (isDirty && !window.confirm('Leave without saving your page changes?')) return
    if (replace) router.replace(href)
    else router.push(href)
  }

  const hiddenItems = layout.sections.filter((item) => !item.visible && contentById.has(item.sectionId))
  const visibleItems = layout.sections
    .filter((item) => item.visible && contentById.has(item.sectionId))
    .sort((a, b) => a.order - b.order)

  return (
    <div className="relative z-[60] min-h-screen bg-[#DED9D2]">
      <div className="sticky top-0 z-50 border-b border-black/10 bg-[#1C1816]/95 px-2 py-3 text-white shadow-xl backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-[96rem] items-center gap-2">
          <div className="mr-auto hidden min-w-[180px] 2xl:block">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#FFB99A]">Profile studio</p>
            <p className="mt-0.5 text-xs text-white/60">Drag by the handle to preview a spot. Release to place. Escape to cancel. Drag any edge or corner to resize.</p>
          </div>

          <div className="mr-auto flex min-w-0 items-center gap-3 2xl:hidden">
            <p className="truncate text-[10px] font-bold uppercase tracking-[0.12em] text-[#FFB99A] sm:text-xs">Profile studio</p>
          </div>
          <ProfilePageStudioMenu>
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#FFB99A]">Arrange blocks</p>
                <button type="button" onClick={() => arrangeLayout('auto')} disabled={stacked || saving || draggedSection !== null || visibleItems.length === 0}
                  className="flex w-full items-start gap-3 rounded-xl border border-[#FD6A2F]/30 bg-[#FD6A2F]/10 p-3 text-left transition hover:bg-[#FD6A2F]/20 disabled:opacity-35">
                  <LayoutGrid className="mt-0.5 h-4 w-4 shrink-0 text-[#FFB99A]" />
                  <span><span className="block text-sm font-semibold">Auto Arrange</span><span className="mt-1 block text-xs leading-5 text-white/60">Fit blocks to content and fill space from the top down.</span></span>
                </button>
                <button type="button" onClick={() => arrangeLayout('smart')} disabled={stacked || saving || draggedSection !== null || visibleItems.length === 0}
                  className="flex w-full items-start gap-3 rounded-xl p-3 text-left transition hover:bg-white/5 disabled:opacity-35">
                  <WandSparkles className="mt-0.5 h-4 w-4 shrink-0 text-white/70" />
                  <span><span className="block text-sm font-semibold">Smart Layout</span><span className="mt-1 block text-xs leading-5 text-white/60">Tidy widths and spacing around your current arrangement.</span></span>
                </button>
                {stacked && <p className="px-3 text-xs leading-5 text-white/50">{viewport === 'mobile' ? 'Switch to Desktop to arrange blocks.' : 'Use a wider window to arrange blocks.'}</p>}
                <div className="grid grid-cols-2 gap-2 border-t border-white/10 pt-3">
                  <button type="button" onClick={undo} disabled={history.length === 0 || draggedSection !== null} aria-label="Undo layout change" className="flex min-h-10 items-center justify-center gap-2 rounded-lg bg-white/5 px-2 text-xs font-semibold hover:bg-white/10 disabled:opacity-35"><Undo2 className="h-4 w-4" /> Undo</button>
                  <button type="button" onClick={reset} disabled={draggedSection !== null} aria-label="Reset page layout" className="flex min-h-10 items-center justify-center gap-2 rounded-lg bg-white/5 px-2 text-xs font-semibold hover:bg-white/10"><RotateCcw className="h-4 w-4" /> Reset layout</button>
                </div>
                <p className="px-1 text-xs leading-5 text-white/45">Undo restores your previous arrangement.</p>
                <div className="border-t border-white/10 pt-3">
                  <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#FFB99A]">Edit page</p>
                  <div className="flex flex-wrap gap-2">{toolbarActions}</div>
                  {inspector && onOpenInspector && <button type="button" onClick={onOpenInspector} aria-label={inspectorLabel} aria-pressed={inspectorOpen} className="mt-2 flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-sm font-semibold hover:bg-white/5"><PanelRight className="h-4 w-4" />{inspectorLabel}</button>}
                  <button type="button" onClick={() => onEditDetails ? onEditDetails() : navigateAway(editDetailsHref)} className="flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-sm font-semibold hover:bg-white/5"><PencilLine className="h-4 w-4" /> Edit content</button>
                  <button type="button" onClick={() => navigateAway(exitHref, true)} aria-label="Exit profile studio" className="flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-sm font-semibold text-white/60 hover:bg-white/5"><X className="h-4 w-4" /> Exit</button>
                </div>
              </div>
              <div data-keep-menu-open className="space-y-4 border-t border-white/10 pt-4 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
                <div>
                  <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#FFB99A]">Preview</p>
                  <div className="grid grid-cols-2 gap-1 rounded-xl bg-black/20 p-1">
                    <button type="button" onClick={() => setViewport('desktop')} aria-pressed={viewport === 'desktop'} className={cx('flex min-h-9 items-center justify-center gap-2 rounded-lg text-xs font-semibold', viewport === 'desktop' ? 'bg-white text-[#252525]' : 'text-white/60 hover:text-white')}><Monitor className="h-4 w-4" /> Desktop</button>
                    <button type="button" onClick={() => setViewport('mobile')} aria-pressed={viewport === 'mobile'} className={cx('flex min-h-9 items-center justify-center gap-2 rounded-lg text-xs font-semibold', viewport === 'mobile' ? 'bg-white text-[#252525]' : 'text-white/60 hover:text-white')}><Smartphone className="h-4 w-4" /> Mobile</button>
                  </div>
                </div>
                <div>
                  <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#FFB99A]">Page settings</p>
                  <p className="text-xs text-white/60">Top section height</p>
                  <div className="mt-2 grid grid-cols-3 gap-1">
                    {(['compact', 'standard', 'cinematic'] as const).map((height) => <button key={height} type="button" onClick={() => updateHero({ height })} aria-pressed={layout.hero.height === height} className={cx('min-h-9 rounded-lg px-1 text-[10px] font-semibold capitalize', layout.hero.height === height ? 'bg-white text-[#252525]' : 'bg-white/5 hover:bg-white/10')}>{height}</button>)}
                  </div>
                  <p className="mt-4 text-xs text-white/60">Top section alignment</p>
                  <div className="mt-2 grid grid-cols-2 gap-1">
                    {(['left', 'center'] as const).map((alignment) => <button key={alignment} type="button" onClick={() => updateHero({ alignment })} aria-pressed={layout.hero.alignment === alignment} className={cx('min-h-9 rounded-lg text-xs font-semibold capitalize', layout.hero.alignment === alignment ? 'bg-white text-[#252525]' : 'bg-white/5 hover:bg-white/10')}>{alignment}</button>)}
                  </div>
                </div>
                {hiddenItems.length > 0 && <div>
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#FFB99A]">Hidden sections</p>
                  {hiddenItems.map((item) => <button key={item.sectionId} type="button" onClick={() => updateSection(item.sectionId, { visible: true })} className="flex min-h-10 w-full items-center justify-between gap-2 rounded-lg px-2 text-left text-xs font-semibold hover:bg-white/5">{definitionById.get(item.sectionId)?.label ?? item.sectionId}<Eye className="h-3.5 w-3.5 shrink-0" /></button>)}
                </div>}
              </div>
            </div>
          </ProfilePageStudioMenu>
          <button type="button" onClick={save} disabled={saving || !isDirty} className="inline-flex h-10 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-[#FD6A2F] bg-[#FD6A2F] px-3 text-xs font-semibold text-white transition-colors hover:border-[#E55A22] hover:bg-[#E55A22] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FD6A2F] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
            {saving ? <LoaderCircle className="h-4 w-4 shrink-0 animate-spin" /> : savedNotice ? <Check className="h-4 w-4 shrink-0" /> : <Save className="h-4 w-4 shrink-0" />}
            {saving ? 'Saving' : savedNotice ? 'Saved' : 'Save'}
          </button>
        </div>
        {saveError && <p className="mx-auto mt-2 max-w-7xl rounded-lg bg-red-400/15 px-3 py-2 text-xs text-red-100">{saveError}</p>}
      </div>

      <div className={cx('transition-[max-width,margin,box-shadow] duration-300', inspectorOpen && viewport === 'desktop' && 'lg:mr-[390px]', viewport === 'mobile' && 'profile-page-editor-mobile mx-auto max-w-[430px] shadow-2xl')}>
        <div
          className={cx('profile-page-frame overflow-hidden', className)}
          data-hero-height={layout.hero.height}
          data-hero-alignment={layout.hero.alignment}
          style={style}
        >
          {hero}
          <ProfilePageSurface items={visibleItems} mobile={viewport === 'mobile'} activeId={draggedSection} guides={guides}
            surfaceRef={gridRef} onGeometry={(geometry) => { geometryRef.current = geometry; setStacked(geometry.stacked) }}
            renderItem={(item, placementClass, placementStyle) => {
              const definition = definitionById.get(item.sectionId)
              return (
                <article
                  key={item.sectionId}
                  data-section-id={item.sectionId}
                  style={placementStyle}
                  className={cx(
                    'group/profile-section relative min-w-0 rounded-[30px] ring-2 transition-[opacity,box-shadow,ring-color,left,top] motion-reduce:transition-none',
                    placementClass,
                    draggedSection === item.sectionId ? 'duration-0 opacity-60 ring-[#FD6A2F] shadow-[0_0_0_6px_rgba(253,106,47,0.15)]' : 'duration-150 ring-transparent'
                  )}
                >
                  <div className="absolute left-3 right-3 top-3 z-30 flex min-h-10 items-center gap-2 rounded-xl border border-white/20 bg-[#1C1816]/92 px-2 text-white opacity-0 shadow-lg backdrop-blur transition-opacity group-hover/profile-section:opacity-100 group-focus-within/profile-section:opacity-100">
                    <button
                      type="button"
                      onPointerDown={(event) => handlePlacementStart(event, item.sectionId, 'move')}
                      onKeyDown={(event) => handlePlacementKey(event, item.sectionId)}
                      title="Drag to place. Use arrow keys to move."
                      className="flex h-8 w-8 shrink-0 touch-none cursor-grab items-center justify-center rounded-lg text-white/65 hover:bg-white/10 hover:text-white active:cursor-grabbing"
                      aria-label={`Move ${definition?.label ?? item.sectionId}`}
                    >
                      <GripVertical className="h-4 w-4" />
                    </button>
                    <span className="min-w-0 flex-1 truncate text-xs font-bold">{definition?.label ?? item.sectionId}</span>
                    {onEditSection && editableSectionIds?.includes(item.sectionId) && (
                      <button type="button" onClick={() => onEditSection(item.sectionId)} className="flex min-h-7 items-center gap-1 rounded-md px-2 text-[10px] font-bold text-white/75 hover:bg-white/10 hover:text-white">
                        <PencilLine className="h-3 w-3" /> Edit
                      </button>
                    )}
                    {viewport === 'desktop' && definition?.allowedSpans.map((span) => (
                      <button key={span} type="button" onClick={() => updateSection(item.sectionId, { span })} className={cx('hidden min-h-7 rounded-md px-2 text-[10px] font-bold sm:block', (!item.desktop && item.span === span) || (item.desktop && Math.abs(item.desktop.width - span / 12) < 0.005) ? 'bg-white text-[#252525]' : 'text-white/65 hover:bg-white/10 hover:text-white')} title={`Set width to ${SPAN_LABELS[span]}`}>
                        {SPAN_LABELS[span]}
                      </button>
                    ))}
                    {!definition?.required && (
                      <button type="button" onClick={() => updateSection(item.sectionId, { visible: false })} className="flex h-8 w-8 items-center justify-center rounded-lg text-white/65 hover:bg-white/10 hover:text-white" aria-label={`Hide ${definition?.label ?? item.sectionId}`}>
                        <EyeOff className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {contentById.get(item.sectionId)}

                  {viewport === 'desktop' && RESIZE_HANDLES.map((handle) => (
                    <button
                      key={handle.edge}
                      type="button"
                      onPointerDown={(event) => handlePlacementStart(event, item.sectionId, 'resize', handle.edge)}
                      onKeyDown={(event) => handlePlacementKey(event, item.sectionId, handle.edge)}
                      style={{ ...handle.style, cursor: handle.cursor }}
                      className="profile-resize-handle absolute z-30 flex touch-none items-center justify-center rounded text-[#FD6A2F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FD6A2F]"
                      aria-label={`Resize ${definition?.label ?? item.sectionId}: ${handle.label}`}
                      title="Drag to resize. Use arrow keys to resize."
                    >
                      {handle.edge === 'se' && <MoveDiagonal2 className="pointer-events-none h-4 w-4 opacity-0 group-hover/profile-section:opacity-100 group-focus-within/profile-section:opacity-100" />}
                    </button>
                  ))}
                </article>
              )
            }} />
        </div>
      </div>
      {inspector && inspectorOpen && (
        <aside className="fixed inset-x-0 bottom-0 z-[70] max-h-[82vh] overflow-y-auto rounded-t-[28px] border border-[#DDD4CC] bg-white shadow-[0_-20px_60px_rgba(26,20,16,0.24)] lg:inset-y-0 lg:left-auto lg:top-[65px] lg:w-[390px] lg:rounded-none lg:border-y-0 lg:border-r-0 lg:shadow-[-18px_0_50px_rgba(26,20,16,0.16)]">
          {inspector}
        </aside>
      )}
    </div>
  )
}
