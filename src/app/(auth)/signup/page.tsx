'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { OAuthButtons } from '@/components/auth/OAuthButtons'

export default function SignupPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [checkEmail, setCheckEmail] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    // Auto-confirmed (e.g. email confirmation disabled in Supabase)
    if (data.session) {
      localStorage.setItem('ta_last_auth_provider', 'email')
      router.push('/onboarding')
      router.refresh()
      return
    }

    // Email confirmation required
    setCheckEmail(true)
    setLoading(false)
  }

  if (checkEmail) {
    return (
      <div className="w-full max-w-sm text-center">
        <div className="mb-8">
          <Link href="/">
            <Image src="/logo.png" alt="TourAligner" width={160} height={40} priority className="mx-auto" />
          </Link>
        </div>
        <div className="bg-[#FFFFFF] border border-[#E8E8E8] rounded-xl p-8">
          <div className="text-4xl mb-4">📬</div>
          <h1 className="text-xl font-semibold mb-2">Check your email</h1>
          <p className="text-sm text-[#888888] leading-relaxed">
            We sent a confirmation link to{' '}
            <span className="text-[#252525] font-medium">{email}</span>. Click it to activate
            your account.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-sm">
      <div className="text-center mb-8">
        <Link href="/">
          <Image src="/logo.png" alt="TourAligner" width={160} height={40} priority className="mx-auto" />
        </Link>
      </div>

      <div className="bg-[#FFFFFF] border border-[#E8E8E8] rounded-xl p-8">
        <h1 className="text-xl font-semibold mb-6">Create account</h1>

        <OAuthButtons />

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
            <label htmlFor="name" className="block text-sm text-[#888888] mb-1.5">
              Your name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="name"
              className="w-full bg-[#F5F5F5] border border-[#E8E8E8] rounded-lg px-3 py-2.5 text-sm placeholder-[#AAAAAA] focus:outline-none focus:border-[#FD6A2F] transition-colors"
              placeholder="Enter your name"
            />
          </div>

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
            <label htmlFor="password" className="block text-sm text-[#888888] mb-1.5">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full bg-[#F5F5F5] border border-[#E8E8E8] rounded-lg px-3 py-2.5 text-sm placeholder-[#AAAAAA] focus:outline-none focus:border-[#FD6A2F] transition-colors"
              placeholder="Min. 8 characters"
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#FD6A2F] text-white font-semibold rounded-lg py-2.5 text-sm hover:bg-[#E55A22] transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>
      </div>

      <p className="text-center text-sm text-[#888888] mt-6">
        Already have an account?{' '}
        <Link href="/login" className="text-[#FD6A2F] hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  )
}
