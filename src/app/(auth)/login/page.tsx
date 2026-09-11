'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { OAuthButtons } from '@/components/auth/OAuthButtons'
import { ProcessingOverlay } from '@/components/ui/ProcessingOverlay'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [signInPhase, setSignInPhase] = useState<'idle' | 'authenticating' | 'routing'>('idle')
  // Set when sign-in is rejected because the account's email hasn't been confirmed yet.
  const [unconfirmedEmail, setUnconfirmedEmail] = useState<string | null>(null)
  const [resendStatus, setResendStatus] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [resendError, setResendError] = useState<string | null>(null)

  const redirectTo = searchParams.get('redirectTo')
  const oauthError = searchParams.get('error') === 'oauth'
  // Signup confirmation links land here: Supabase appends `code` when the email was
  // confirmed, or `error_description` when the link was invalid or expired.
  const confirmationError = searchParams.get('error_description')
  const emailConfirmed = searchParams.has('code') && !confirmationError
  const loading = signInPhase !== 'idle'

  async function handleResend() {
    if (!unconfirmedEmail) return
    setResendStatus('sending')
    setResendError(null)

    const { error } = await createClient().auth.resend({
      type: 'signup',
      email: unconfirmedEmail,
      options: { emailRedirectTo: `${window.location.origin}/login` },
    })

    if (error) {
      setResendError(error.message)
      setResendStatus('idle')
      return
    }

    setResendStatus('sent')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const startedAt = performance.now()
    setSignInPhase('authenticating')
    setError(null)
    setUnconfirmedEmail(null)
    setResendStatus('idle')
    setResendError(null)

    const supabase = createClient()
    const authStartedAt = performance.now()
    const { data: signInData, error } = await supabase.auth.signInWithPassword({ email, password })
    const authMs = performance.now() - authStartedAt

    if (error) {
      if (error.code === 'email_not_confirmed') {
        setUnconfirmedEmail(email)
        setError('Confirm your email before signing in. Check your inbox for the confirmation link.')
      } else {
        setError(error.message)
      }
      setSignInPhase('idle')
      return
    }

    localStorage.setItem('ta_last_auth_provider', 'email')
    // Authentication is complete. Keep the form disabled while routing, but
    // stop obscuring the page with the mutation overlay during page loading.
    setSignInPhase('routing')

    let destination = redirectTo ?? '/dashboard/profiles'

    // Send new users (no primary_role set) to onboarding, while skipping the
    // dashboard redirect for returning artist and venue users.
    let routingMs = 0
    if (!redirectTo) {
      const routingStartedAt = performance.now()
      const user = signInData.user
      if (!user) {
        setError('We could not finish signing you in. Please try again.')
        setSignInPhase('idle')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('primary_role, is_admin')
        .eq('id', user.id)
        .single()
      if (profile?.is_admin) destination = '/dashboard'
      else if (!profile?.primary_role) destination = '/onboarding'
      routingMs = performance.now() - routingStartedAt
    }

    if (process.env.NODE_ENV === 'development') {
      console.info(`[perf] login password auth=${authMs.toFixed(0)}ms routing=${routingMs.toFixed(0)}ms total=${(performance.now() - startedAt).toFixed(0)}ms`)
      window.sessionStorage.setItem('ta_login_navigation_started_at', String(performance.now()))
    }
    // Keep the sign-in overlay visible until this page unmounts so the root
    // route-loading boundary does not create a second, visibly separate spinner.
    router.push(destination)
  }

  return (
    <div className="w-full max-w-sm">
      {signInPhase === 'authenticating' && <ProcessingOverlay />}
      <div className="text-center mb-8">
        <Link href="/">
          <Image src="/logo.png" alt="TourAligner" width={160} height={40} priority className="mx-auto" />
        </Link>
      </div>

      <div className="bg-[#FFFFFF] border border-[#E8E8E8] rounded-xl p-8">
        <h1 className="text-xl font-semibold mb-6">Sign in</h1>

        {oauthError && (
          <p className="text-sm text-red-400 mb-4">Something went wrong with social login. Please try again.</p>
        )}

        {emailConfirmed && (
          <p className="text-sm text-[#14584E] mb-4">Email confirmed. Sign in to continue.</p>
        )}

        {confirmationError && (
          <p className="text-sm text-red-400 mb-4">{confirmationError}</p>
        )}

        <OAuthButtons next={redirectTo ?? undefined} />

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#E8E8E8]" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-white px-3 text-xs text-[#AAAAAA]">or continue with email</span>
          </div>
        </div>

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

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="password" className="text-sm text-[#888888]">
                Password
              </label>
              <Link href="/forgot-password" className="text-xs text-[#FD6A2F] hover:underline">
                Forgot password?
              </Link>
            </div>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full bg-[#F5F5F5] border border-[#E8E8E8] rounded-lg px-3 py-2.5 text-sm placeholder-[#AAAAAA] focus:outline-none focus:border-[#FD6A2F] transition-colors"
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          {unconfirmedEmail && (
            resendStatus === 'sent' ? (
              <p className="text-sm text-[#14584E]">
                Confirmation email sent to {unconfirmedEmail}. Use the link in the newest email.
              </p>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                disabled={resendStatus === 'sending'}
                className="text-sm text-[#FD6A2F] hover:underline disabled:opacity-50"
              >
                {resendStatus === 'sending' ? 'Sending…' : 'Resend confirmation email'}
              </button>
            )
          )}

          {resendError && <p className="text-sm text-red-400">{resendError}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#FD6A2F] text-white font-semibold rounded-lg py-2.5 text-sm hover:bg-[#E55A22] transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {signInPhase === 'authenticating'
              ? 'Signing in…'
              : signInPhase === 'routing'
                ? 'Loading workspace…'
                : 'Sign in'}
          </button>
        </form>
      </div>

      <p className="text-center text-sm text-[#888888] mt-6">
        Don&apos;t have an account?{' '}
        <Link href="/signup" className="text-[#FD6A2F] hover:underline">
          Sign up
        </Link>
      </p>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
