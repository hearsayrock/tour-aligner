'use client'

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
    <section
      aria-labelledby="terms-acceptance-title"
      className="mt-6 rounded-2xl border border-[#F7C6B2] bg-[#FFFAF7] p-7 sm:p-8"
    >
      <h2 id="terms-acceptance-title" className="text-2xl font-semibold tracking-tight text-[#252525]">
        Accept the current Terms
      </h2>
      <p className="mt-3 leading-7 text-[#555555]">
        To continue using TourAligner, confirm that you have read and agree to these Terms and Conditions.
      </p>

      <form onSubmit={submit} className="mt-6">
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#E8E8E8] bg-white p-4 leading-6 text-[#555555]">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(event) => setAccepted(event.target.checked)}
            className="mt-1 h-4 w-4 shrink-0 rounded border-[#CCCCCC] text-[#FD6A2F] focus:ring-[#FD6A2F]"
          />
          <span>I have read and agree to the Terms and Conditions.</span>
        </label>

        {error && <p className="mt-4 text-sm text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={!accepted || loading || loggingOut}
          className="mt-6 w-full rounded-lg bg-[#FD6A2F] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#E55A22] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? 'Saving acceptance…' : 'Accept and continue'}
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
    </section>
  )
}
