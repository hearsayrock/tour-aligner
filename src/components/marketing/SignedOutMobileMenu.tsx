'use client'

import { useState } from 'react'
import Link from 'next/link'

export function SignedOutMobileMenu() {
  const [open, setOpen] = useState(false)

  return (
    <div className="flex items-center gap-2 md:hidden">
      <Link
        href="/signup"
        className="rounded-xl bg-[#FD6A2F] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#E55A22]"
      >
        Start free
      </Link>

      <button
        onClick={() => setOpen((o) => !o)}
        className="rounded-xl p-2 transition-colors hover:bg-black/5"
        aria-label="Menu"
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
        <div className="absolute inset-x-0 top-16 border-b border-[#E8E8E8] bg-white/95 py-2 shadow-sm backdrop-blur-xl">
          <Link
            href="/#product"
            onClick={() => setOpen(false)}
            className="block px-6 py-3 text-sm text-[#252525] transition-colors hover:bg-[#F5F5F5]"
          >
            Why
          </Link>
          <Link
            href="/#workflow"
            onClick={() => setOpen(false)}
            className="block px-6 py-3 text-sm text-[#252525] transition-colors hover:bg-[#F5F5F5]"
          >
            How it works
          </Link>
          <Link
            href="/#audiences"
            onClick={() => setOpen(false)}
            className="block px-6 py-3 text-sm text-[#252525] transition-colors hover:bg-[#F5F5F5]"
          >
            Who it&apos;s for
          </Link>
          <Link
            href="/venues"
            onClick={() => setOpen(false)}
            className="block px-6 py-3 text-sm text-[#252525] transition-colors hover:bg-[#F5F5F5]"
          >
            Venues
          </Link>
          <Link
            href="/events"
            onClick={() => setOpen(false)}
            className="block px-6 py-3 text-sm text-[#252525] transition-colors hover:bg-[#F5F5F5]"
          >
            Events
          </Link>
          <Link
            href="/login"
            onClick={() => setOpen(false)}
            className="block px-6 py-3 text-sm text-[#252525] transition-colors hover:bg-[#F5F5F5]"
          >
            Sign in
          </Link>
        </div>
      )}
    </div>
  )
}
