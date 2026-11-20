'use client'

import { useState } from 'react'
import Link from 'next/link'
import { WaitlistButton } from '@/components/marketing/WaitlistButton'

export function SignedOutMobileMenu() {
  const [open, setOpen] = useState(false)

  return (
    <div className="flex items-center gap-2 md:hidden">
      <WaitlistButton label="Join Wait List" onOpenChange={(modalOpen) => modalOpen && setOpen(false)} />

      <button
        onClick={() => setOpen((o) => !o)}
        className="rounded-full p-2 text-ink transition-colors hover:bg-surface-2"
        aria-label="Menu"
        aria-expanded={open}
      >
        {open ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        )}
      </button>

      {open && (
        <div className="absolute inset-x-0 top-16 border-b border-border bg-page py-2">
          <Link
            href="/#product"
            onClick={() => setOpen(false)}
            className="block px-6 py-3 text-sm text-ink transition-colors hover:bg-surface-2"
          >
            Why
          </Link>
          <Link
            href="/#workflow"
            onClick={() => setOpen(false)}
            className="block px-6 py-3 text-sm text-ink transition-colors hover:bg-surface-2"
          >
            How it works
          </Link>
          <Link
            href="/#audiences"
            onClick={() => setOpen(false)}
            className="block px-6 py-3 text-sm text-ink transition-colors hover:bg-surface-2"
          >
            Who it&apos;s for
          </Link>
          <Link
            href="/login"
            onClick={() => setOpen(false)}
            className="block px-6 py-3 text-sm text-ink transition-colors hover:bg-surface-2"
          >
            Sign in
          </Link>
        </div>
      )}
    </div>
  )
}
