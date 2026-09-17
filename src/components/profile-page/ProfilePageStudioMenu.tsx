'use client'

import { useEffect, useId, useRef, type ReactNode } from 'react'
import { ChevronDown, SlidersHorizontal, type LucideIcon } from 'lucide-react'

export function ProfilePageStudioMenu({ children, label, icon: Icon = SlidersHorizontal, open, onOpenChange: setOpen }: { children: ReactNode; label: string; icon?: LucideIcon; open: boolean; onOpenChange: (open: boolean) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const id = useId()
  useEffect(() => {
    if (!open) return
    const outside = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false)
    }
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); setOpen(false); trigger.current?.focus() }
    }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('keydown', escape)
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape) }
  }, [open, setOpen])
  return <div ref={ref} className="relative shrink-0" onBlur={(event) => {
    if (event.relatedTarget && !ref.current?.contains(event.relatedTarget as Node)) setOpen(false)
  }}>
    <button ref={trigger} type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}
      className="flex min-h-10 items-center gap-2 whitespace-nowrap rounded-lg px-3 text-xs font-semibold text-white/70 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FD6A2F]">
      <Icon className="h-4 w-4" /> {label} <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
    </button>
    {open && <div id={id} aria-label={label} onClick={(event) => {
      const button = (event.target as HTMLElement).closest('button')
      if (button && !button.disabled && !button.closest('[data-keep-menu-open]')) { setOpen(false); trigger.current?.focus() }
    }} style={{ scrollbarWidth: 'thin', scrollbarColor: '#62564F transparent' }} className="fixed left-3 right-3 top-[calc(var(--studio-header-height)+8px)] z-50 max-h-[calc(100dvh-110px)] overflow-y-auto overscroll-contain rounded-2xl border border-white/15 bg-[#25211E] p-4 text-white shadow-[0_24px_70px_rgba(0,0,0,0.35)] sm:absolute sm:left-auto sm:right-0 sm:top-[calc(100%+12px)] sm:w-[min(320px,calc(100vw-48px))] sm:p-5">
      {children}
    </div>}
  </div>
}
