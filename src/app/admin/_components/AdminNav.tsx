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
    <nav aria-label="Admin navigation" className="flex gap-1 overflow-x-auto p-2 lg:flex-1 lg:flex-col lg:px-3 lg:py-5">
      {LINKS.map(({ href, label }) => {
        const active = pathname.startsWith(href)
        const hasDot = href === '/admin/claims' && pendingClaims
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={`flex items-center min-h-10 shrink-0 justify-between gap-2 px-3 py-2 rounded-ds-lg text-sm font-medium transition-colors ${
              active
                ? 'bg-cream text-cocoa'
                : 'text-ink hover:bg-surface-2'
            }`}
          >
            {label}
            {hasDot && <span className="w-2 h-2 bg-brand rounded-full shrink-0" />}
          </Link>
        )
      })}
    </nav>
  )
}
