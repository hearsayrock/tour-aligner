'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { ProcessingOverlay } from '@/components/ui/ProcessingOverlay'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setSubmitted(true)
    setLoading(false)
  }

  return (
    <div className="w-full max-w-sm">
      {loading && <ProcessingOverlay />}
      <div className="text-center mb-8">
        <Link href="/">
          <Image src="/touraligner/brand/touraligner-logo.svg" alt="TourAligner" width={160} height={44} priority className="mx-auto" />
        </Link>
      </div>

      <div className="bg-surface border border-border rounded-xl p-8">
        <h1 className="text-xl font-semibold mb-2">Reset your password</h1>

        {submitted ? (
          <div className="text-sm text-text-secondary space-y-3 mt-4">
            <p>Check your email — we sent a reset link to <span className="font-medium text-ink">{email}</span>.</p>
            <p className="text-muted">It may take a minute to arrive. Check your spam folder if you don&apos;t see it.</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted mb-6">
              Enter your email and we&apos;ll send you a link to reset your password.
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm text-muted mb-1.5">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2.5 text-sm placeholder-sand-light focus:outline-none focus:border-brand transition-colors"
                  placeholder="you@example.com"
                />
              </div>

              {error && <p className="text-sm text-danger-text">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-brand text-on-brand font-semibold rounded-lg py-2.5 text-sm hover:bg-brand-dim transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                {loading ? 'Sending…' : 'Send reset link'}
              </button>
            </form>
          </>
        )}
      </div>

      <p className="text-center text-sm text-muted mt-6">
        <Link href="/login" className="text-brand-text hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  )
}
