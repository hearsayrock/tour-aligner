'use client'

import { useState } from 'react'
import Link from 'next/link'
import { claimVenue } from '@/app/actions/venues'

interface ClaimButtonProps {
  venueId: string
  venueSlug: string
  isLoggedIn: boolean
  hasPendingClaim?: boolean
}

export function ClaimButton({ venueId, venueSlug, isLoggedIn, hasPendingClaim = false }: ClaimButtonProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'pending' | 'error'>(
    hasPendingClaim ? 'pending' : 'idle'
  )
  const [errorMsg, setErrorMsg] = useState('')

  if (!isLoggedIn) {
    return (
      <Link
        href={`/login?redirectTo=/venues/${venueSlug}`}
        className="inline-block border border-[#FD6A2F] text-[#FD6A2F] text-sm font-semibold rounded-lg px-5 py-2.5 hover:bg-[#FD6A2F] hover:text-white transition-colors"
      >
        Claim this venue
      </Link>
    )
  }

  if (status === 'pending') {
    return (
      <div className="inline-flex items-center gap-2 text-sm text-[#888888]">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-yellow-400 shrink-0">
          <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
        </svg>
        <span>Claim pending approval — we&apos;ll be in touch.</span>
      </div>
    )
  }

  async function handleClaim() {
    setStatus('loading')
    const result = await claimVenue(venueId, venueSlug)
    if (result.error) {
      setErrorMsg(result.error)
      setStatus('error')
    } else {
      setStatus('pending')
    }
  }

  return (
    <div>
      <button
        onClick={handleClaim}
        disabled={status === 'loading'}
        className="border border-[#FD6A2F] text-[#FD6A2F] text-sm font-semibold rounded-lg px-5 py-2.5 hover:bg-[#FD6A2F] hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {status === 'loading' ? 'Submitting…' : 'Claim this venue'}
      </button>
      {status === 'error' && (
        <p className="text-sm text-red-400 mt-2">{errorMsg}</p>
      )}
    </div>
  )
}
