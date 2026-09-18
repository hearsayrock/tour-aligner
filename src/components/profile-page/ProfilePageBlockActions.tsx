'use client'

import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { EllipsisVertical } from 'lucide-react'

export function ProfilePageBlockActions({ children, label, compact = false }: { children: ReactNode; label: string; compact?: boolean }) {
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState({ top: 0, right: 0 })
  const menu = useRef<HTMLDivElement>(null)
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const id = useId()

  useEffect(() => {
    if (!open) return
    function outside(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node) && !menu.current?.contains(event.target as Node)) setOpen(false)
    }
    function escape(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      event.preventDefault()
      setOpen(false)
      trigger.current?.focus()
    }
    const dismiss = (event: Event) => {
      if (event.target instanceof Node && menu.current?.contains(event.target)) return
      setOpen(false)
    }
    window.addEventListener('scroll', dismiss, true)
    window.addEventListener('resize', dismiss)
    document.addEventListener('pointerdown', outside)
    document.addEventListener('keydown', escape)
    return () => {
      window.removeEventListener('scroll', dismiss, true)
      window.removeEventListener('resize', dismiss)
      document.removeEventListener('pointerdown', outside)
      document.removeEventListener('keydown', escape)
    }
  }, [open])

  return <div ref={root} data-block-actions className="relative shrink-0 cursor-default" onBlur={(event) => {
    if (event.relatedTarget && !root.current?.contains(event.relatedTarget as Node) && !menu.current?.contains(event.relatedTarget as Node)) setOpen(false)
  }}>
    <button ref={trigger} type="button" aria-label={`${label} actions`} aria-expanded={open} aria-controls={id}
      onClick={() => {
        const rect = trigger.current?.getBoundingClientRect()
        if (rect) setPosition({ top: rect.bottom + 4, right: Math.max(8, window.innerWidth - rect.right) })
        setOpen((current) => !current)
      }}
      className={`flex ${compact ? 'h-5' : 'h-8'} w-8 items-center justify-center rounded-lg text-white hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FD6A2F]`}>
      <EllipsisVertical className="h-4 w-4" />
    </button>
    {open && createPortal(<div ref={menu} style={position} onBlur={(event) => {
      if (event.relatedTarget && !root.current?.contains(event.relatedTarget as Node) && !menu.current?.contains(event.relatedTarget as Node)) setOpen(false)
    }} id={id} aria-label={`${label} actions`} className="fixed z-[100] flex max-h-[70dvh] min-w-40 overflow-y-auto flex-col gap-1 rounded-xl border border-black/10 bg-white p-2 text-[#655B54] shadow-lg" onClick={(event) => {
      if (!(event.target as HTMLElement).closest('button')) return
      setOpen(false)
      trigger.current?.focus()
    }}>
      {children}
    </div>, document.body)}
  </div>
}
