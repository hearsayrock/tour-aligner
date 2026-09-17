'use client'

import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from 'react'
import { PROFILE_BLOCK_GAP, resolveProfileBlocks, type ProfileAlignmentGuide, type ProfileBlockRect } from './profile-page-freeform'
import type { ProfilePageLayoutItem } from './profile-page-types'

export type ProfileSurfaceGeometry = { width: number; stacked: boolean; rects: ProfileBlockRect[] }

/** Measure intrinsic content independently of an authored desktop height. */
export function measureProfileContent(element: HTMLElement, width = element.offsetWidth) {
  const clone = element.cloneNode(true) as HTMLElement
  clone.removeAttribute('data-section-id')
  clone.querySelectorAll('[id]').forEach((child) => child.removeAttribute('id'))
  clone.inert = true
  clone.setAttribute('aria-hidden', 'true')
  Object.assign(clone.style, { position: 'absolute', width: `${width}px`, height: 'auto', minHeight: '0', visibility: 'hidden', pointerEvents: 'none', transition: 'none' })
  element.parentElement?.appendChild(clone)
  const height = clone.offsetHeight
  clone.remove()
  return height
}

export function measureProfileSurface(surface: HTMLDivElement): ProfileSurfaceGeometry {
  return { width: surface.clientWidth, stacked: surface.dataset.stacked === 'true',
    rects: [...surface.querySelectorAll<HTMLElement>(':scope > [data-section-id]')].map((element) => ({
      sectionId: element.dataset.sectionId!,
      // CSS transitions can show an intermediate position. Save the actual target.
      x: element.style.position === 'absolute' ? parseFloat(element.style.left) : element.offsetLeft,
      y: element.style.position === 'absolute' ? parseFloat(element.style.top) : element.offsetTop,
      width: element.offsetWidth, height: element.offsetHeight,
    })) }
}

const SPAN_CLASSES = { 4: 'lg:col-span-4', 6: 'lg:col-span-6', 8: 'lg:col-span-8', 12: 'lg:col-span-12' }

/** The studio and public page share width measurement, placement, and content reflow. */
export function ProfilePageSurface<SectionId extends string>({ items, mobile = false, activeId, guides = [], surfaceRef, onGeometry, renderItem }: {
  items: readonly ProfilePageLayoutItem<SectionId>[]
  mobile?: boolean
  activeId?: string | null
  guides?: readonly ProfileAlignmentGuide[]
  surfaceRef?: RefObject<HTMLDivElement | null>
  onGeometry?: (geometry: ProfileSurfaceGeometry) => void
  renderItem: (item: ProfilePageLayoutItem<SectionId>, className: string, style?: CSSProperties) => ReactNode
}) {
  const localRef = useRef<HTMLDivElement>(null)
  const ref = surfaceRef ?? localRef
  const [size, setSize] = useState({ width: 0, desktop: false })
  const [heights, setHeights] = useState<Record<string, number>>({})
  const callbackRef = useRef(onGeometry)
  useLayoutEffect(() => { callbackRef.current = onGeometry }, [onGeometry])

  useLayoutEffect(() => {
    const surface = ref.current
    if (!surface) return
    const media = window.matchMedia('(min-width: 1024px)')
    const measure = () => {
      const width = surface.clientWidth
      setSize((old) => old.width === width && old.desktop === media.matches ? old : { width, desktop: media.matches })
      const next: Record<string, number> = {}
      surface.querySelectorAll<HTMLElement>(':scope > [data-section-id]').forEach((element) => {
        next[element.dataset.sectionId!] = element.style.height ? measureProfileContent(element) : element.offsetHeight
      })
      setHeights((old) => Object.keys(next).length === Object.keys(old).length && Object.keys(next).every((id) => old[id] === next[id]) ? old : next)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(surface)
    surface.querySelectorAll(':scope > [data-section-id]').forEach((element) => observer.observe(element))
    // Images and other asynchronous content can change inside a manually sized card.
    surface.querySelectorAll(':scope > [data-section-id] > :not(.absolute)').forEach((content) => {
      observer.observe(content)
      content.querySelectorAll('*').forEach((element) => observer.observe(element))
    })
    media.addEventListener('change', measure)
    return () => { observer.disconnect(); media.removeEventListener('change', measure) }
  }, [ref, items])

  const stacked = mobile || (size.width > 0 && (!size.desktop || size.width < 640))
  const freeform = !stacked && size.width > 0 && items.some((item) => item.desktop)
  const rects: ProfileBlockRect[] = []
  // Newly added blocks without saved placement start below the existing content.
  for (const item of items) {
    if (!item.desktop) continue
    rects.push({ sectionId: item.sectionId, x: item.desktop.x * (size.width + PROFILE_BLOCK_GAP), y: item.desktop.y,
      width: item.desktop.width * (size.width + PROFILE_BLOCK_GAP) - PROFILE_BLOCK_GAP, height: Math.max(item.desktop.height ?? 0, heights[item.sectionId] ?? 0) })
  }
  const existing = resolveProfileBlocks(rects, size.width, activeId ?? undefined)
  let bottom = existing.reduce((height, rect) => Math.max(height, rect.y + rect.height + PROFILE_BLOCK_GAP), 0)
  for (const item of items) {
    if (item.desktop) continue
    rects.push({ sectionId: item.sectionId, x: 0, y: bottom,
      width: (size.width + PROFILE_BLOCK_GAP) * item.span / 12 - PROFILE_BLOCK_GAP, height: heights[item.sectionId] ?? 0 })
    bottom += (heights[item.sectionId] ?? 0) + PROFILE_BLOCK_GAP
  }
  const placed = resolveProfileBlocks(rects, size.width, activeId ?? undefined)
  const height = placed.reduce((height, rect) => Math.max(height, rect.y + rect.height), 0)

  useLayoutEffect(() => {
    const surface = ref.current
    if (!surface) return
    callbackRef.current?.(measureProfileSurface(surface))
  })

  return <div className="profile-page-surface-shell mx-auto max-w-7xl px-6 py-10 lg:px-8 lg:py-12">
    <div ref={ref} className="artist-page-grid profile-page-surface relative grid grid-cols-1 gap-8 lg:grid-cols-12"
      data-stacked={stacked} data-freeform={freeform} style={freeform ? { height } : stacked ? { alignItems: 'stretch' } : undefined}>
      {items.map((item) => {
        const rect = placed.find((rect) => rect.sectionId === item.sectionId)
        return renderItem(item, `min-w-0 ${SPAN_CLASSES[item.span]}`, freeform && rect ? {
          position: 'absolute', left: rect.x, top: rect.y, width: rect.width,
          ...(item.desktop?.height !== undefined ? { height: rect.height } : {}),
        } : undefined)
      })}
      {freeform && guides.map((guide, index) => <div key={`${guide.axis}:${index}`} aria-hidden="true"
        className="pointer-events-none absolute z-40 bg-[#FD6A2F]"
        style={guide.axis === 'x' ? { top: 0, bottom: 0, left: guide.position, width: 1 }
          : { left: 0, right: 0, top: guide.position, height: 1 }} />)}
    </div>
  </div>
}
