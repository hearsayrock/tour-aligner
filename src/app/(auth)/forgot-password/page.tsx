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
          <Image src="/logo.png" alt="TourAligner" width={160} height={40} priority className="mx-auto" />
        </Link>
      </div>

      <div className="bg-[#FFFFFF] border border-[#E8E8E8] rounded-xl p-8">
        <h1 className="text-xl font-semibold mb-2">Reset your password</h1>

        {submitted ? (
          <div className="text-sm text-[#555555] space-y-3 mt-4">
            <p>Check your email — we sent a reset link to <span className="font-medium text-[#252525]">{email}</span>.</p>
            <p className="text-[#888888]">It may take a minute to arrive. Check your spam folder if you don&apos;t see it.</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-[#888888] mb-6">
              Enter your email and we&apos;ll send you a link to reset your password.
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm text-[#888888] mb-1.5">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="w-full bg-[#F5F5F5] border border-[#E8E8E8] rounded-lg px-3 py-2.5 text-sm placeholder-[#AAAAAA] focus:outline-none focus:border-[#FD6A2F] transition-colors"
                  placeholder="you@example.com"
                />
              </div>

              {error && <p className="text-sm text-red-400">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#FD6A2F] text-white font-semibold rounded-lg py-2.5 text-sm hover:bg-[#E55A22] transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                {loading ? 'Sending…' : 'Send reset link'}
              </button>
            </form>
          </>
        )}
      </div>

      <p className="text-center text-sm text-[#888888] mt-6">
        <Link href="/login" className="text-[#FD6A2F] hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  )
}
