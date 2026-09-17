'use client'

import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { ChevronDown, SlidersHorizontal } from 'lucide-react'

export function ProfilePageStudioMenu({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
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
  }, [open])
  return <div ref={ref} className="relative shrink-0" onBlur={(event) => {
    if (event.relatedTarget && !ref.current?.contains(event.relatedTarget as Node)) setOpen(false)
  }}>
    <button ref={trigger} type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen((value) => !value)}
      className="flex min-h-10 items-center gap-2 whitespace-nowrap rounded-xl border border-white/20 bg-white/5 px-4 text-sm font-semibold text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FD6A2F]">
      <SlidersHorizontal className="h-4 w-4" /> Studio menu <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
    </button>
    {open && <div id={id} aria-label="Studio options" onClick={(event) => {
      const button = (event.target as HTMLElement).closest('button')
      if (button && !button.disabled && !button.closest('[data-keep-menu-open]')) { setOpen(false); trigger.current?.focus() }
    }} style={{ scrollbarWidth: 'thin', scrollbarColor: '#62564F transparent' }} className="fixed left-3 right-3 top-[72px] z-50 max-h-[calc(100dvh-110px)] overflow-y-auto overscroll-contain rounded-2xl border border-white/15 bg-[#25211E] p-4 text-white shadow-[0_24px_70px_rgba(0,0,0,0.35)] sm:absolute sm:left-auto sm:right-0 sm:top-[calc(100%+12px)] sm:w-[min(560px,calc(100vw-48px))] sm:p-5">
      {children}
    </div>}
  </div>
}
