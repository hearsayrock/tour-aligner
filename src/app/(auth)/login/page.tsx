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
  const [loading, setLoading] = useState(false)

  const redirectTo = searchParams.get('redirectTo')
  const oauthError = searchParams.get('error') === 'oauth'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { data: signInData, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    localStorage.setItem('ta_last_auth_provider', 'email')

    let destination = redirectTo ?? '/dashboard/profiles'

    // Send new users (no primary_role set) to onboarding, while skipping the
    // dashboard redirect for returning artist and venue users.
    if (!redirectTo) {
      const user = signInData.user
      if (!user) {
        setError('We could not finish signing you in. Please try again.')
        setLoading(false)
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('primary_role, is_admin')
        .eq('id', user.id)
        .single()
      if (profile?.is_admin) destination = '/dashboard'
      else if (!profile?.primary_role) destination = '/onboarding'
    }

    router.push(destination)
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
        <h1 className="text-xl font-semibold mb-6">Sign in</h1>

        {oauthError && (
          <p className="text-sm text-red-400 mb-4">Something went wrong with social login. Please try again.</p>
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

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#FD6A2F] text-white font-semibold rounded-lg py-2.5 text-sm hover:bg-[#E55A22] transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {loading ? 'Signing in…' : 'Sign in'}
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
