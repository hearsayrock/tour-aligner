'use client'

import { useState } from 'react'
import Link from 'next/link'

export function SignedOutMobileMenu() {
  const [open, setOpen] = useState(false)

  return (
    <div className="flex items-center gap-2 md:hidden">
      <Link
        href="/signup"
        className="text-sm font-semibold bg-[#FD6A2F] text-white rounded-lg px-4 py-1.5 hover:bg-[#E55A22] transition-colors"
      >
        Get started
      </Link>

      <button
        onClick={() => setOpen((o) => !o)}
        className="p-2 rounded-lg hover:bg-black/5 transition-colors"
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
        <div className="absolute top-14 inset-x-0 bg-white border-b border-[#E8E8E8] shadow-sm py-2">
          <Link
            href="/venues"
            onClick={() => setOpen(false)}
            className="block px-6 py-3 text-sm text-[#252525] hover:bg-[#F5F5F5] transition-colors"
          >
            Browse venues
          </Link>
          <Link
            href="/login"
            onClick={() => setOpen(false)}
            className="block px-6 py-3 text-sm text-[#252525] hover:bg-[#F5F5F5] transition-colors"
          >
            Sign in
          </Link>
        </div>
      )}
    </div>
  )
}
