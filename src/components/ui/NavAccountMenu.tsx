'use client'

import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { CircleUserRound, LogOut, Settings, Shield, Users } from 'lucide-react'
import { signOut } from '@/app/actions/auth'

const ACCOUNT_LINKS = [
  { label: 'Account', href: '/dashboard/account' },
  { label: 'Manage Profiles', href: '/dashboard/profiles' },
]

const itemClass =
  'flex min-h-10 items-center justify-between gap-3 w-full text-left text-sm px-4 py-2.5 text-[#333333] hover:bg-[#F5F5F5] transition-colors'

interface Notifications {
  adminClaims: boolean
}

export function NavAccountMenu({
  isAdmin = false,
  notifications,
  placement = 'bottom',
}: {
  isAdmin?: boolean
  notifications?: Notifications
  placement?: 'bottom' | 'top'
}) {
  const pathname = usePathname()
  const [openPath, setOpenPath] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  const open = openPath === pathname

  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpenPath(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpenPath((current) => (current === pathname ? null : pathname))}
        aria-label="Account menu"
        className={`relative flex h-10 w-10 items-center justify-center rounded-full border border-[#E8E8E8] bg-white transition-colors ${
          open ? 'border-[#CCCCCC] bg-[#F5F5F5]' : 'hover:border-[#CCCCCC]'
        }`}
      >
        <CircleUserRound className="h-5 w-5 text-[#444444]" />
      </button>

      <div
        className={`absolute right-0 z-50 w-52 bg-white border border-[#E8E8E8] rounded-xl shadow-lg overflow-hidden transition-all duration-200 ease-out ${
          placement === 'top' ? 'bottom-[calc(100%+8px)] origin-bottom-right' : 'top-[calc(100%+8px)] origin-top-right'
        } ${
          open
            ? 'opacity-100 scale-100 translate-y-0'
            : `opacity-0 scale-95 pointer-events-none ${placement === 'top' ? 'translate-y-1' : '-translate-y-1'}`
        }`}
      >
        <div className="py-1">
          {ACCOUNT_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className={itemClass}>
              <span className="flex items-center gap-2">
                {link.href === '/dashboard/profiles' ? (
                  <Users className="h-4 w-4 text-[#888888]" />
                ) : (
                  <Settings className="h-4 w-4 text-[#888888]" />
                )}
                {link.label}
              </span>
            </Link>
          ))}
          {isAdmin && (
            <Link href="/admin" className={itemClass}>
              <span className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-[#888888]" />
                Admin panel
              </span>
              {notifications?.adminClaims && (
                <span className="w-2 h-2 bg-red-500 rounded-full shrink-0" />
              )}
            </Link>
          )}
        </div>
        <div className="border-t border-[#F0F0F0] py-1">
          <form action={signOut}>
            <button type="submit" className={itemClass}>
              <span className="flex items-center gap-2">
                <LogOut className="h-4 w-4 text-[#888888]" />
                Sign out
              </span>
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
