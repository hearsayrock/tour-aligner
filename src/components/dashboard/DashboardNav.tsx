'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { NavAccountMenu } from '@/components/ui/NavAccountMenu'

interface Notifications {
  inquiries: boolean
  pendingClaims: boolean
  adminClaims: boolean
}

const NAV_LINKS = [
  { label: 'Dashboard',  href: '/dashboard' },
  { label: 'Bands',      href: '/dashboard/bands' },
  { label: 'Venues',     href: '/dashboard/venues' },
  { label: 'Inquiries',  href: '/dashboard/inquiries' },
]

const dropdownClass =
  'absolute top-[calc(100%+8px)] right-0 z-50 w-52 bg-white border border-[#E8E8E8] rounded-xl shadow-lg overflow-hidden'

const dropdownItemClass =
  'block w-full text-left text-sm px-4 py-2.5 text-[#333333] hover:bg-[#F5F5F5] transition-colors'

const dropdownTransition = (open: boolean) =>
  `transition-all duration-200 ease-out origin-top-right ${
    open ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-1 pointer-events-none'
  }`

function Dot() {
  return <span className="absolute -top-0.5 -right-1 w-2 h-2 bg-red-500 rounded-full ring-[1.5px] ring-[#FAFAFA]" />
}

export function DashboardNav({
  isAdmin = false,
  notifications,
}: {
  isAdmin?: boolean
  notifications?: Notifications
}) {
  const pathname = usePathname()
  const [navOpen, setNavOpen] = useState(false)
  const navRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setNavOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => { setNavOpen(false) }, [pathname])

  function isActive(href: string) {
    return href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href)
  }

  function dotForLink(href: string) {
    if (!notifications) return false
    if (href === '/dashboard/inquiries') return notifications.inquiries
    if (href === '/dashboard/venues') return notifications.pendingClaims
    return false
  }

  const hasAnyNotification = !!(
    notifications?.inquiries ||
    notifications?.pendingClaims ||
    notifications?.adminClaims
  )

  return (
    <header className="relative border-b border-[#E8E8E8] bg-[#FAFAFA]">
      <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">

        {/* Logo */}
        <Link href="/dashboard" className="flex items-center">
          <Image src="/logo.png" alt="TourAligner" width={130} height={34} priority />
        </Link>

        {/* Right side controls */}
        <div className="flex items-center gap-1">

          {/* Desktop nav links */}
          <nav className="hidden sm:flex items-center gap-1 mr-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`relative text-sm px-3 py-1.5 rounded-md transition-colors ${
                  isActive(link.href)
                    ? 'text-[#252525] bg-[#EBEBEB]'
                    : 'text-[#888888] hover:text-[#252525]'
                }`}
              >
                {link.label}
                {dotForLink(link.href) && <Dot />}
              </Link>
            ))}
          </nav>

          {/* Account menu */}
          <NavAccountMenu
            isAdmin={isAdmin}
            notifications={{ any: hasAnyNotification, adminClaims: notifications?.adminClaims ?? false }}
          />

          {/* Hamburger — mobile only */}
          <div ref={navRef} className="sm:hidden relative">
            <button
              type="button"
              onClick={() => setNavOpen((v) => !v)}
              aria-label={navOpen ? 'Close menu' : 'Open menu'}
              className="w-8 h-8 flex flex-col items-center justify-center gap-[5px] focus-visible:outline-none"
            >
              <span className={`block h-[2px] w-5 bg-[#252525] rounded-full origin-center transition-all duration-300 ease-in-out ${navOpen ? 'translate-y-[7px] rotate-45' : ''}`} />
              <span className={`block h-[2px] w-5 bg-[#252525] rounded-full transition-all duration-300 ease-in-out ${navOpen ? 'opacity-0 scale-x-0' : ''}`} />
              <span className={`block h-[2px] w-5 bg-[#252525] rounded-full origin-center transition-all duration-300 ease-in-out ${navOpen ? '-translate-y-[7px] -rotate-45' : ''}`} />
            </button>

            {/* Mobile nav dropdown */}
            <div className={`${dropdownClass} ${dropdownTransition(navOpen)}`}>
              <div className="py-1">
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`${dropdownItemClass} flex items-center justify-between ${isActive(link.href) ? 'font-medium text-[#252525] bg-[#F5F5F5]' : ''}`}
                  >
                    {link.label}
                    {dotForLink(link.href) && (
                      <span className="w-2 h-2 bg-red-500 rounded-full shrink-0" />
                    )}
                  </Link>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </header>
  )
}
