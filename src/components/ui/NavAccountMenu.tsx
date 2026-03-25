'use client'

import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { signOut } from '@/app/actions/auth'

const ACCOUNT_LINKS = [
  { label: 'View Profile',      href: '/dashboard/profile' },
  { label: 'Edit Profile',      href: '/dashboard/profile/edit' },
  { label: 'Account Settings',  href: '/dashboard/settings' },
  { label: 'Notifications',     href: '/dashboard/notifications' },
]

const itemClass =
  'flex items-center justify-between w-full text-left text-sm px-4 py-2.5 text-[#333333] hover:bg-[#F5F5F5] transition-colors'

interface Notifications {
  any: boolean
  adminClaims: boolean
}

export function NavAccountMenu({
  isAdmin = false,
  notifications,
}: {
  isAdmin?: boolean
  notifications?: Notifications
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const pathname = usePathname()

  useEffect(() => { setOpen(false) }, [pathname])

  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Account menu"
        className={`relative w-8 h-8 flex items-center justify-center rounded-full transition-colors ${
          open ? 'bg-black/10' : 'hover:bg-black/5'
        }`}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="text-[#444444]">
          <circle cx="12" cy="12" r="10" />
          <circle cx="12" cy="9" r="3" />
          <path d="M6.168 18.849A4 4 0 0 1 10 16h4a4 4 0 0 1 3.832 2.849" />
        </svg>
        {notifications?.any && (
          <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-red-500 rounded-full ring-[1.5px] ring-white" />
        )}
      </button>

      <div
        className={`absolute top-[calc(100%+8px)] right-0 z-50 w-52 bg-white border border-[#E8E8E8] rounded-xl shadow-lg overflow-hidden transition-all duration-200 ease-out origin-top-right ${
          open
            ? 'opacity-100 scale-100 translate-y-0'
            : 'opacity-0 scale-95 -translate-y-1 pointer-events-none'
        }`}
      >
        <div className="py-1">
          {ACCOUNT_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className={itemClass}>
              {link.label}
            </Link>
          ))}
          {isAdmin && (
            <Link href="/admin" className={itemClass}>
              Admin panel
              {notifications?.adminClaims && (
                <span className="w-2 h-2 bg-red-500 rounded-full shrink-0" />
              )}
            </Link>
          )}
        </div>
        <div className="border-t border-[#F0F0F0] py-1">
          <form action={signOut}>
            <button type="submit" className={itemClass}>Sign out</button>
          </form>
        </div>
      </div>
    </div>
  )
}
