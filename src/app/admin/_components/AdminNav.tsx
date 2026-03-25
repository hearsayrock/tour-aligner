'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const LINKS = [
  { href: '/admin/search',    label: 'Search' },
  { href: '/admin/users',     label: 'Users' },
  { href: '/admin/bands',     label: 'Bands' },
  { href: '/admin/venues',    label: 'Venues' },
  { href: '/admin/inquiries', label: 'Inquiries' },
  { href: '/admin/claims',    label: 'Claims' },
]

export function AdminNav({ pendingClaims = false }: { pendingClaims?: boolean }) {
  const pathname = usePathname()
  return (
    <nav className="flex-1 py-3 px-2 space-y-0.5">
      {LINKS.map(({ href, label }) => {
        const active = pathname.startsWith(href)
        const hasDot = href === '/admin/claims' && pendingClaims
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              active
                ? 'bg-[#FD6A2F]/10 text-[#FD6A2F]'
                : 'text-[#252525] hover:bg-[#F5F5F5]'
            }`}
          >
            {label}
            {hasDot && <span className="w-2 h-2 bg-red-500 rounded-full shrink-0" />}
          </Link>
        )
      })}
    </nav>
  )
}
