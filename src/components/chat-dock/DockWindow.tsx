'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ArrowLeft, ChevronDown, ChevronUp, PanelBottom, X } from 'lucide-react'
import {
  clampChatWindow,
  isChatWindowDrag,
  type ChatWindow,
  type ChatWindowPosition,
} from '@/lib/chat-dock-windows'
import { iconButton } from './DockPrimitives'

export function DockWindow({
  window: chatWindow,
  title,
  mobile,
  selected,
  onActivate,
  onToggle,
  onClose,
  onMove,
  onDock,
  onList,
  children,
}: {
  window: ChatWindow
  title: string
  mobile: boolean
  selected: boolean
  onActivate: () => void
  onToggle: () => void
  onClose: () => void
  onMove: (position: ChatWindowPosition) => void
  onDock: (centerX?: number) => void
  onList: () => void
  children: (controls: ReactNode, fallbackHeader: ReactNode, visible: boolean) => ReactNode
}) {
  const ref = useRef<HTMLElement>(null)
  const [inView, setInView] = useState(false)
  const [dragging, setDragging] = useState(false)
  const dragCleanup = useRef<(() => void) | null>(null)
  const suppressClick = useRef(false)
  const visible = !chatWindow.minimized && (mobile ? selected : inView)

  function toggle() {
    onToggle()
    if (!mobile)
      requestAnimationFrame(() =>
        ref.current?.querySelector<HTMLElement>('[data-chat-window-title]')?.focus()
      )
  }

  useEffect(() => {
    const element = ref.current
    if (!element) return
    const observer = new IntersectionObserver(([entry]) => setInView(entry.intersectionRatio > 0.6), {
      threshold: [0, 0.6, 1],
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!selected || mobile || chatWindow.position) return
    ref.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [selected, mobile, chatWindow.position, chatWindow.z])

  useEffect(() => () => dragCleanup.current?.(), [])

  useEffect(() => {
    if (!mobile && chatWindow.position) {
      const position = chatWindow.position
      function resize() {
        const rect = ref.current?.getBoundingClientRect()
        if (!rect) return
        const next = clampChatWindow(position, { width: innerWidth, height: innerHeight }, rect)
        if (next.x !== position.x || next.y !== position.y) onMove(next)
      }
      window.addEventListener('resize', resize)
      resize()
      return () => window.removeEventListener('resize', resize)
    }
  }, [mobile, chatWindow.position, chatWindow.minimized, onMove])

  useEffect(() => {
    if (!mobile || !selected || chatWindow.minimized) return
    const element = ref.current
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    if (!element?.contains(document.activeElement)) element?.focus()
    function resize() {
      if (!element || !window.visualViewport) return
      element.style.setProperty('--chat-viewport-height', `${window.visualViewport.height}px`)
      element.style.setProperty('--chat-viewport-top', `${window.visualViewport.offsetTop}px`)
    }
    resize()
    window.visualViewport?.addEventListener('resize', resize)
    window.visualViewport?.addEventListener('scroll', resize)
    return () => {
      document.body.style.overflow = overflow
      window.visualViewport?.removeEventListener('resize', resize)
      window.visualViewport?.removeEventListener('scroll', resize)
      if (element) {
        element.style.removeProperty('--chat-viewport-height')
        element.style.removeProperty('--chat-viewport-top')
      }
      if (previousFocus?.isConnected) previousFocus.focus()
    }
  }, [mobile, selected, chatWindow.minimized])

  function titleTarget(target: EventTarget | null) {
    if (!(target instanceof Element) || !target.closest('[data-chat-drag-handle]')) return false
    const button = target.closest('button, a, input, select, textarea')
    return !button || button.hasAttribute('data-chat-window-title')
  }

  function pointerDown(event: React.PointerEvent<HTMLElement>) {
    onActivate()
    if (mobile || event.button !== 0 || !titleTarget(event.target)) return
    const element = ref.current
    if (!element) return
    const rect = element.getBoundingClientRect()
    const start = { x: event.clientX, y: event.clientY }
    const offset = { x: event.clientX - rect.left, y: event.clientY - rect.top }
    let moved = false
    let point = { x: rect.left, y: rect.top }
    const pointerId = event.pointerId
    dragCleanup.current?.()
    function move(next: PointerEvent) {
      if (next.pointerId !== pointerId) return
      if (!moved && !isChatWindowDrag(start, { x: next.clientX, y: next.clientY })) return
      if (!moved) {
        moved = true
        suppressClick.current = true
        setDragging(true)
      }
      next.preventDefault()
      point = clampChatWindow(
        { x: next.clientX - offset.x, y: next.clientY - offset.y },
        { width: innerWidth, height: innerHeight },
        { width: rect.width, height: rect.height }
      )
      onMove(point)
    }
    function clean() {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', cancel)
      document.body.style.userSelect = previousSelect
      dragCleanup.current = null
    }
    function up(next: PointerEvent) {
      if (next.pointerId !== pointerId) return
      clean()
      setDragging(false)
      if (moved && innerHeight - (point.y + rect.height) <= 40) onDock(point.x + rect.width / 2)
      // The browser may emit a click after a drag ends. Only that click is ignored.
      window.setTimeout(() => {
        suppressClick.current = false
      }, 0)
    }
    function cancel() {
      clean()
      setDragging(false)
      suppressClick.current = false
    }
    const previousSelect = document.body.style.userSelect
    document.body.style.userSelect = 'none'
    window.addEventListener('pointermove', move, { passive: false })
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', cancel)
    dragCleanup.current = clean
  }

  const controls = (
    <>
      {mobile ? (
        <button type="button" className={iconButton} aria-label="Back to chats" onClick={onList}>
          <ArrowLeft className="size-4" />
        </button>
      ) : (
        chatWindow.position && (
          <button
            type="button"
            className={iconButton}
            aria-label="Dock conversation"
            title="Dock conversation"
            onClick={() => onDock()}
          >
            <PanelBottom className="size-4" />
          </button>
        )
      )}
      <button
        type="button"
        className={iconButton}
        aria-label={chatWindow.minimized ? `Restore ${title}` : `Minimize ${title}`}
        onClick={toggle}
      >
        {chatWindow.minimized ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
      </button>
      <button type="button" className={iconButton} aria-label={`Close ${title}`} onClick={onClose}>
        <X className="size-4" />
      </button>
    </>
  )
  const header = (
    <div
      data-chat-drag-handle
      className="flex h-14 shrink-0 items-center gap-1 border-b border-[#ECEAE5] px-2.5 md:cursor-grab"
    >
      <button
        type="button"
        data-chat-drag-handle
        data-chat-window-title
        title={title}
        aria-expanded={!chatWindow.minimized}
        className="h-full min-w-0 flex-1 truncate px-2 text-left text-[13px] font-semibold outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#FD6A2F]"
      >
        {title}
      </button>
      {controls}
    </div>
  )

  return (
    <section
      ref={ref}
      tabIndex={-1}
      data-chat-window-id={chatWindow.id}
      data-docked={!chatWindow.position}
      role={mobile && selected ? 'dialog' : 'region'}
      aria-modal={mobile && selected ? true : undefined}
      aria-label={title}
      onFocusCapture={onActivate}
      onPointerDown={pointerDown}
      onClick={(event) => {
        if (titleTarget(event.target)) {
          if (suppressClick.current) {
            event.preventDefault()
            return
          }
          toggle()
        }
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && !event.defaultPrevented) {
          event.preventDefault()
          event.stopPropagation()
          toggle()
        }
        if (mobile && event.key === 'Tab') {
          const items = [
            ...(ref.current?.querySelectorAll<HTMLElement>(
              'button:not(:disabled),a[href],input:not(:disabled),textarea:not(:disabled),select:not(:disabled)'
            ) ?? []),
          ].filter((item) => item.getClientRects().length)
          const first = items[0]
          const last = items.at(-1)
          if (
            event.shiftKey &&
            (document.activeElement === first || document.activeElement === ref.current)
          ) {
            event.preventDefault()
            last?.focus()
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault()
            first?.focus()
          }
        }
      }}
      style={
        mobile
          ? {
              height: 'var(--chat-viewport-height,100dvh)',
              top: 'var(--chat-viewport-top,0px)',
              zIndex: 90 + chatWindow.z,
            }
          : chatWindow.position
            ? {
                position: 'fixed',
                left: chatWindow.position.x,
                top: chatWindow.position.y,
                zIndex: 90 + chatWindow.z,
              }
            : { zIndex: 90 + chatWindow.z }
      }
      className={`chat-popout pointer-events-auto shrink-0 overflow-hidden border border-[#E5E2DC] bg-white text-[#252525] shadow-[0_4px_28px_rgba(35,28,18,0.14)] outline-none ${mobile ? (selected && !chatWindow.minimized ? 'fixed inset-0 flex w-full flex-col' : 'hidden') : `relative flex flex-col ${chatWindow.minimized ? 'w-[240px] rounded-t-xl' : 'h-[560px] max-h-[calc(100dvh-24px)] w-[360px] rounded-t-2xl'}`} ${chatWindow.position && !mobile ? '!rounded-2xl' : ''} ${dragging ? 'select-none ring-2 ring-[#FD6A2F]/40' : ''}`}
    >
      {chatWindow.minimized && header}
      <div className={chatWindow.minimized ? 'hidden' : 'flex min-h-0 flex-1 flex-col'}>
        {children(controls, header, visible)}
      </div>
    </section>
  )
}
