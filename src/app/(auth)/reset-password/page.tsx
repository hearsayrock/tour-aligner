'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { ProcessingOverlay } from '@/components/ui/ProcessingOverlay'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
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
        <h1 className="text-xl font-semibold mb-2">Choose a new password</h1>
        <p className="text-sm text-muted mb-6">Must be at least 8 characters.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="password" className="block text-sm text-muted mb-1.5">
              New password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2.5 text-sm placeholder-sand-light focus:outline-none focus:border-brand transition-colors"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label htmlFor="confirm" className="block text-sm text-muted mb-1.5">
              Confirm password
            </label>
            <input
              id="confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              autoComplete="new-password"
              className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2.5 text-sm placeholder-sand-light focus:outline-none focus:border-brand transition-colors"
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-sm text-danger-text">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand text-on-brand font-semibold rounded-lg py-2.5 text-sm hover:bg-brand-dim transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {loading ? 'Saving…' : 'Set new password'}
          </button>
        </form>
      </div>
    </div>
  )
}
