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
      console.error('Unable to record legal-document acceptance.', acceptanceError)
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
      className="mt-6 rounded-2xl border border-danger-border bg-surface p-7 sm:p-8"
    >
      <h2 id="terms-acceptance-title" className="text-2xl font-semibold tracking-tight text-ink">
        Accept the current Terms
      </h2>
      <p className="mt-3 leading-7 text-text-secondary">
        To continue using TourAligner, confirm that you have read and agree to these Terms and Conditions.
      </p>

      <form onSubmit={submit} className="mt-6">
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-white p-4 leading-6 text-text-secondary">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(event) => setAccepted(event.target.checked)}
            className="mt-1 h-4 w-4 shrink-0 rounded border-border-strong text-brand-text focus:ring-brand"
          />
          <span>I have read and agree to the Terms and Conditions.</span>
        </label>

        {error && <p className="mt-4 text-sm text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={!accepted || loading || loggingOut}
          className="mt-6 w-full rounded-lg bg-brand px-4 py-3 text-sm font-semibold text-on-brand transition-colors hover:bg-brand-dim disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? 'Saving acceptance…' : 'Accept and continue'}
        </button>
        <button
          type="button"
          onClick={logout}
          disabled={loading || loggingOut}
          className="mt-3 w-full rounded-lg px-4 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-2 hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loggingOut ? 'Logging out…' : 'Logout'}
        </button>
      </form>
    </section>
  )
}
