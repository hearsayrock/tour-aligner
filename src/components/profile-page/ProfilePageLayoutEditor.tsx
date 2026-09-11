'use client'

import { useRouter } from 'next/navigation'
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type DragEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import {
  Check,
  ChevronDown,
  Eye,
  EyeOff,
  GripVertical,
  LoaderCircle,
  Monitor,
  MoveHorizontal,
  PanelRight,
  PencilLine,
  RotateCcw,
  Save,
  Smartphone,
  Undo2,
  X,
} from 'lucide-react'
import { buttonBaseClass, cx } from '@/components/ui/primitives'
import {
  createDefaultProfilePageLayout,
  profilePageLayoutsEqual,
  type ProfilePageLayout,
  type ProfilePageSectionContent,
  type ProfilePageSectionDefinition,
  type ProfilePageSpan,
} from '@/components/profile-page/profile-page-types'

const SPAN_CLASSES: Record<ProfilePageSpan, string> = {
  4: 'col-span-12 lg:col-span-4',
  6: 'col-span-12 lg:col-span-6',
  8: 'col-span-12 lg:col-span-8',
  12: 'col-span-12',
}

const SPAN_LABELS: Record<ProfilePageSpan, string> = {
  4: '⅓',
  6: '½',
  8: '⅔',
  12: 'Full',
}

type SaveResult = { success?: true; error?: string }

type ResizeSession<SectionId extends string> = {
  sectionId: SectionId
  startX: number
  startSpan: ProfilePageSpan
  startLayout: ProfilePageLayout<SectionId>
  gridWidth: number
}

function moveBefore<SectionId extends string>(
  layout: ProfilePageLayout<SectionId>,
  sourceId: SectionId,
  targetId: SectionId
) {
  const visible = layout.sections.filter((section) => section.visible).sort((a, b) => a.order - b.order)
  const hidden = layout.sections.filter((section) => !section.visible).sort((a, b) => a.order - b.order)
  const sourceIndex = visible.findIndex((section) => section.sectionId === sourceId)
  const targetIndex = visible.findIndex((section) => section.sectionId === targetId)
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
  saveAction,
  externalDirty = false,
  inspector,
  inspectorOpen = false,
  onOpenInspector,
  inspectorLabel = 'Customize',
}: {
  initialLayout: ProfilePageLayout<SectionId>
  definitions: readonly ProfilePageSectionDefinition<SectionId>[]
  sections: readonly ProfilePageSectionContent<SectionId>[]
  hero: ReactNode
  className?: string
  style?: CSSProperties
  exitHref: string
  editDetailsHref: string
  saveAction: (layout: ProfilePageLayout<SectionId>) => Promise<SaveResult>
  externalDirty?: boolean
  inspector?: ReactNode
  inspectorOpen?: boolean
  onOpenInspector?: () => void
  inspectorLabel?: string
}) {
  const router = useRouter()
  const [layout, setLayout] = useState(initialLayout)
  const [savedLayout, setSavedLayout] = useState(initialLayout)
  const [history, setHistory] = useState<ProfilePageLayout<SectionId>[]>([])
  const [viewport, setViewport] = useState<'desktop' | 'mobile'>('desktop')
  const [draggedSection, setDraggedSection] = useState<SectionId | null>(null)
  const [dropTarget, setDropTarget] = useState<SectionId | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [savedNotice, setSavedNotice] = useState(false)
  const gridRef = useRef<HTMLDivElement | null>(null)
  const layoutRef = useRef(layout)
  const resizeRef = useRef<ResizeSession<SectionId> | null>(null)
  const contentById = useMemo(
    () => new Map(sections.map((section) => [section.sectionId, section.content])),
    [sections]
  )
  const definitionById = useMemo(
    () => new Map(definitions.map((definition) => [definition.sectionId, definition])),
    [definitions]
  )
  const isDirty = !profilePageLayoutsEqual(layout, savedLayout) || externalDirty

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

  useEffect(() => {
    function warnBeforeUnload(event: BeforeUnloadEvent) {
      if (isDirty) event.preventDefault()
    }
    window.addEventListener('beforeunload', warnBeforeUnload)
    return () => window.removeEventListener('beforeunload', warnBeforeUnload)
  }, [isDirty])

  useEffect(() => {
    function handlePointerMove(event: PointerEvent) {
      const session = resizeRef.current
      if (!session) return
      const definition = definitionById.get(session.sectionId)
      if (!definition) return

      const columnWidth = session.gridWidth / 12
      const requestedSpan = session.startSpan + Math.round((event.clientX - session.startX) / columnWidth)
      const nextSpan = definition.allowedSpans.reduce((nearest, span) => (
        Math.abs(span - requestedSpan) < Math.abs(nearest - requestedSpan) ? span : nearest
      ), session.startSpan)
      const next = {
        ...layoutRef.current,
        sections: layoutRef.current.sections.map((section) => (
          section.sectionId === session.sectionId ? { ...section, span: nextSpan } : section
        )),
      }
      layoutRef.current = next
      setLayout(next)
    }

    function handlePointerUp() {
      const session = resizeRef.current
      if (!session) return
      resizeRef.current = null
      if (!profilePageLayoutsEqual(session.startLayout, layoutRef.current)) {
        setHistory((current) => [...current, session.startLayout])
      }
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [definitionById])

  function handleResizeStart(event: ReactPointerEvent, sectionId: SectionId, span: ProfilePageSpan) {
    if (viewport === 'mobile' || !gridRef.current) return
    event.preventDefault()
    event.stopPropagation()
    resizeRef.current = {
      sectionId,
      startX: event.clientX,
      startSpan: span,
      startLayout: layoutRef.current,
      gridWidth: gridRef.current.getBoundingClientRect().width,
    }
    document.body.style.cursor = 'ew-resize'
    const resetCursor = () => {
      document.body.style.cursor = ''
      window.removeEventListener('pointerup', resetCursor)
    }
    window.addEventListener('pointerup', resetCursor)
  }

  function handleDrop(event: DragEvent, targetId: SectionId) {
    event.preventDefault()
    if (draggedSection && draggedSection !== targetId) {
      commitLayout(moveBefore(layoutRef.current, draggedSection, targetId))
    }
    setDraggedSection(null)
    setDropTarget(null)
  }

  function updateSection(sectionId: SectionId, updates: { span?: ProfilePageSpan; visible?: boolean }) {
    commitLayout({
      ...layoutRef.current,
      sections: layoutRef.current.sections.map((section) => (
        section.sectionId === sectionId ? { ...section, ...updates } : section
      )),
    })
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

  async function save() {
    setSaving(true)
    setSaveError(null)
    setSavedNotice(false)
    try {
      const result = await saveAction(layoutRef.current)
      if (result.error) {
        setSaveError(result.error)
        return
      }
      setSavedLayout(layoutRef.current)
      setHistory([])
      setSavedNotice(true)
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
        <div className="mx-auto flex max-w-[96rem] flex-wrap items-center gap-1 sm:gap-2 lg:flex-nowrap">
          <div className="mr-auto hidden min-w-[180px] 2xl:block">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#FFB99A]">Arrange artist page</p>
            <p className="mt-0.5 text-xs text-white/60">Drag sections or grab a corner to resize.</p>
          </div>

          <div className="hidden rounded-xl border border-white/15 bg-white/5 p-1 sm:flex">
            <button type="button" onClick={() => setViewport('desktop')} className={cx('flex min-h-9 items-center gap-2 rounded-lg px-3 text-xs font-semibold', viewport === 'desktop' ? 'bg-white text-[#252525]' : 'text-white/70 hover:text-white')}>
              <Monitor className="h-4 w-4" /> Desktop
            </button>
            <button type="button" onClick={() => setViewport('mobile')} className={cx('flex min-h-9 items-center gap-2 rounded-lg px-3 text-xs font-semibold', viewport === 'mobile' ? 'bg-white text-[#252525]' : 'text-white/70 hover:text-white')}>
              <Smartphone className="h-4 w-4" /> Mobile
            </button>
          </div>

          <details className="group relative">
            <summary className="flex min-h-10 cursor-pointer list-none items-center gap-2 rounded-xl border border-white/15 px-3 text-xs font-semibold text-white/80 hover:bg-white/10">
              <span className="sm:hidden">Page</span><span className="hidden sm:inline">Page settings</span> <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
            </summary>
            <div className="absolute right-0 top-12 z-50 w-72 rounded-2xl border border-[#E5DDD7] bg-white p-4 text-[#252525] shadow-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#A24A22]">Hero height</p>
              <div className="mt-2 grid grid-cols-3 gap-1.5">
                {(['compact', 'standard', 'cinematic'] as const).map((height) => (
                  <button key={height} type="button" onClick={() => updateHero({ height })} className={cx('rounded-lg border px-2 py-2 text-[11px] font-semibold capitalize', layout.hero.height === height ? 'border-[#252525] bg-[#252525] text-white' : 'border-[#E8E3DE] hover:border-[#BDB4AD]')}>
                    {height}
                  </button>
                ))}
              </div>
              <p className="mt-4 text-xs font-bold uppercase tracking-[0.16em] text-[#A24A22]">Hero alignment</p>
              <div className="mt-2 grid grid-cols-2 gap-1.5">
                {(['left', 'center'] as const).map((alignment) => (
                  <button key={alignment} type="button" onClick={() => updateHero({ alignment })} className={cx('rounded-lg border px-2 py-2 text-xs font-semibold capitalize', layout.hero.alignment === alignment ? 'border-[#252525] bg-[#252525] text-white' : 'border-[#E8E3DE] hover:border-[#BDB4AD]')}>
                    {alignment}
                  </button>
                ))}
              </div>
              {hiddenItems.length > 0 && (
                <>
                  <p className="mt-4 text-xs font-bold uppercase tracking-[0.16em] text-[#A24A22]">Hidden sections</p>
                  <div className="mt-2 space-y-1.5">
                    {hiddenItems.map((item) => (
                      <button key={item.sectionId} type="button" onClick={() => updateSection(item.sectionId, { visible: true })} className="flex w-full items-center justify-between rounded-lg border border-[#E8E3DE] px-3 py-2 text-left text-xs font-semibold hover:border-[#BDB4AD]">
                        {definitionById.get(item.sectionId)?.label ?? item.sectionId}
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </details>

          <button type="button" onClick={undo} disabled={history.length === 0} aria-label="Undo layout change" className="flex min-h-10 items-center gap-2 rounded-xl border border-white/15 px-3 text-xs font-semibold text-white/80 hover:bg-white/10 disabled:opacity-35">
            <Undo2 className="h-4 w-4" /> <span className="hidden lg:inline">Undo</span>
          </button>
          <button type="button" onClick={reset} aria-label="Reset page layout" className="flex min-h-10 items-center gap-2 rounded-xl border border-white/15 px-3 text-xs font-semibold text-white/80 hover:bg-white/10">
            <RotateCcw className="h-4 w-4" /> <span className="hidden lg:inline">Reset layout</span>
          </button>
          {inspector && onOpenInspector && (
            <button type="button" onClick={onOpenInspector} aria-label={inspectorLabel} aria-pressed={inspectorOpen} className={cx('flex min-h-10 items-center gap-2 rounded-xl border px-3 text-xs font-semibold', inspectorOpen ? 'border-white bg-white text-[#252525]' : 'border-white/15 text-white/80 hover:bg-white/10')}>
              <PanelRight className="h-4 w-4" /> <span className="hidden sm:inline">{inspectorLabel}</span>
            </button>
          )}
          <button type="button" onClick={() => navigateAway(editDetailsHref)} className="hidden min-h-10 items-center gap-2 rounded-xl border border-white/15 px-3 text-xs font-semibold text-white/80 hover:bg-white/10 sm:flex">
            <PencilLine className="h-4 w-4" /> Edit content
          </button>
          <button type="button" onClick={() => navigateAway(exitHref, true)} aria-label="Exit page editor" className="flex min-h-10 items-center gap-2 rounded-xl border border-white/15 px-3 text-xs font-semibold text-white/80 hover:bg-white/10">
            <X className="h-4 w-4" /> <span className="hidden sm:inline">Exit</span>
          </button>
          <button type="button" onClick={save} disabled={saving || !isDirty} className={cx(buttonBaseClass('primary'), 'min-h-10')}>
            {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : savedNotice ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            {saving ? 'Saving' : savedNotice ? 'Saved' : <><span className="sm:hidden">Save</span><span className="hidden sm:inline">Save changes</span></>}
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
          <div ref={gridRef} className="artist-page-grid mx-auto grid max-w-7xl grid-cols-12 gap-8 px-6 py-10 lg:px-8 lg:py-12">
            {visibleItems.map((item) => {
              const definition = definitionById.get(item.sectionId)
              return (
                <article
                  key={item.sectionId}
                  className={cx(
                    'group/profile-section relative min-w-0 rounded-[30px] ring-2 ring-transparent transition-[opacity,box-shadow,transform,ring-color]',
                    viewport === 'mobile' ? 'col-span-12' : SPAN_CLASSES[item.span],
                    draggedSection === item.sectionId && 'opacity-45',
                    dropTarget === item.sectionId && 'ring-[#FD6A2F] shadow-[0_0_0_6px_rgba(253,106,47,0.15)]'
                  )}
                  onDragOver={(event) => {
                    event.preventDefault()
                    if (draggedSection && draggedSection !== item.sectionId) setDropTarget(item.sectionId)
                  }}
                  onDragLeave={() => setDropTarget((current) => current === item.sectionId ? null : current)}
                  onDrop={(event) => handleDrop(event, item.sectionId)}
                >
                  <div className="absolute left-3 right-3 top-3 z-30 flex min-h-10 items-center gap-2 rounded-xl border border-white/20 bg-[#1C1816]/92 px-2 text-white opacity-0 shadow-lg backdrop-blur transition-opacity group-hover/profile-section:opacity-100 group-focus-within/profile-section:opacity-100">
                    <button
                      type="button"
                      draggable
                      onDragStart={(event) => {
                        event.dataTransfer.effectAllowed = 'move'
                        event.dataTransfer.setData('text/plain', item.sectionId)
                        setDraggedSection(item.sectionId)
                      }}
                      onDragEnd={() => {
                        setDraggedSection(null)
                        setDropTarget(null)
                      }}
                      className="flex h-8 w-8 cursor-grab items-center justify-center rounded-lg text-white/65 hover:bg-white/10 hover:text-white active:cursor-grabbing"
                      aria-label={`Move ${definition?.label ?? item.sectionId}`}
                    >
                      <GripVertical className="h-4 w-4" />
                    </button>
                    <span className="min-w-0 flex-1 truncate text-xs font-bold">{definition?.label ?? item.sectionId}</span>
                    {viewport === 'desktop' && definition?.allowedSpans.map((span) => (
                      <button key={span} type="button" onClick={() => updateSection(item.sectionId, { span })} className={cx('hidden min-h-7 rounded-md px-2 text-[10px] font-bold sm:block', item.span === span ? 'bg-white text-[#252525]' : 'text-white/65 hover:bg-white/10 hover:text-white')} title={`Set width to ${SPAN_LABELS[span]}`}>
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

                  {viewport === 'desktop' && (
                    <button
                      type="button"
                      onPointerDown={(event) => handleResizeStart(event, item.sectionId, item.span)}
                      className="absolute bottom-1 right-1 z-30 flex h-10 w-10 cursor-ew-resize items-end justify-end rounded-br-[28px] p-2 text-[#FD6A2F] opacity-0 transition-opacity group-hover/profile-section:opacity-100 group-focus-within/profile-section:opacity-100 max-sm:hidden"
                      aria-label={`Resize ${definition?.label ?? item.sectionId}`}
                      title="Drag to resize"
                    >
                      <MoveHorizontal className="h-4 w-4" />
                    </button>
                  )}
                </article>
              )
            })}
          </div>
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
