'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { TERMS_DOCUMENT_KEY, TERMS_DOCUMENT_VERSION } from '@/lib/legal'
import { createClient } from '@/lib/supabase/client'
import { signOut } from '@/app/actions/auth'

function safeDestination(value: string | null) {
  if (value?.startsWith('/') && !value.startsWith('//')) return value
  return '/dashboard'
}

export function TermsAcceptanceForm() {
  const searchParams = useSearchParams()
  const [accepted, setAccepted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!accepted) {
      setError('You must agree to the Terms and Conditions to continue.')
      return
    }

    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { error: acceptanceError } = await supabase.rpc('record_legal_document_acceptance', {
      p_document_key: TERMS_DOCUMENT_KEY,
      p_document_version: TERMS_DOCUMENT_VERSION,
    })

    if (acceptanceError) {
      setError('We could not record your acceptance. Please try again.')
      setLoading(false)
      return
    }

    // A full navigation deliberately forces middleware to re-read the acceptance
    // recorded above. Client-side navigation can retain the pre-acceptance route
    // state and leave this gate visible even after the RPC succeeds.
    window.location.assign(safeDestination(searchParams.get('redirectTo')))
  }

  async function logout() {
    setLoggingOut(true)
    setError(null)
    await signOut()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#252525]/45 px-5 py-8 backdrop-blur-[2px]">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="terms-acceptance-title"
        aria-describedby="terms-acceptance-description"
        className="w-full max-w-md rounded-2xl border border-[#E8E8E8] bg-white p-6 shadow-2xl sm:p-8"
      >
        <p className="text-sm font-semibold tracking-tight text-[#252525]">
          Tour<span className="text-[#FD6A2F]">Aligner</span>
        </p>
        <h1 id="terms-acceptance-title" className="mt-6 text-2xl font-semibold tracking-tight text-[#252525]">
          Updated Terms and Conditions
        </h1>
        <p id="terms-acceptance-description" className="mt-3 text-sm leading-6 text-[#666666]">
          Please review and accept our{' '}
          <Link
            href="/terms"
            target="_blank"
            rel="noreferrer"
            className="font-medium text-[#FD6A2F] underline underline-offset-2 hover:text-[#E55A22]"
          >
            Terms and Conditions
          </Link>{' '}
          to continue using TourAligner.
        </p>

        <form onSubmit={submit} className="mt-7">
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#E8E8E8] bg-[#FAFAFA] p-4 text-sm leading-5 text-[#555555]">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(event) => setAccepted(event.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-[#CCCCCC] text-[#FD6A2F] focus:ring-[#FD6A2F]"
            />
            <span>I have read and agree to the Terms and Conditions.</span>
          </label>

          {error && <p className="mt-4 text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={!accepted || loading || loggingOut}
            className="mt-6 w-full rounded-lg bg-[#FD6A2F] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#E55A22] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Saving acceptance…' : 'Continue using TourAligner'}
          </button>
          <button
            type="button"
            onClick={logout}
            disabled={loading || loggingOut}
            className="mt-3 w-full rounded-lg px-4 py-2.5 text-sm font-medium text-[#666666] transition-colors hover:bg-[#F5F5F5] hover:text-[#252525] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loggingOut ? 'Logging out…' : 'Logout'}
          </button>
        </form>
      </div>
    </div>
  )
}
