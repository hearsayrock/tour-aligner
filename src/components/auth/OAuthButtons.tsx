'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const LAST_PROVIDER_KEY = 'ta_last_auth_provider'

type Provider = 'google' | 'facebook'

const PROVIDERS: { id: Provider; label: string; icon: React.ReactNode }[] = [
  {
    id: 'google',
    label: 'Continue with Google',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
        <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
        <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
        <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
      </svg>
    ),
  },
  {
    id: 'facebook',
    label: 'Continue with Facebook',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M18 9a9 9 0 1 0-10.406 8.892V11.25H5.309V9h2.285V7.013c0-2.256 1.343-3.502 3.4-3.502.985 0 2.016.176 2.016.176v2.215h-1.136c-1.119 0-1.468.695-1.468 1.407V9h2.498l-.399 2.25H10.406V17.892A9.003 9.003 0 0 0 18 9z" fill="#1877F2"/>
      </svg>
    ),
  },
]

interface OAuthButtonsProps {
  next?: string
}

export function OAuthButtons({ next }: OAuthButtonsProps) {
  const [lastProvider] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(LAST_PROVIDER_KEY)
  })
  const [loading, setLoading] = useState<Provider | null>(null)

  async function handleOAuth(provider: Provider) {
    setLoading(provider)
    localStorage.setItem(LAST_PROVIDER_KEY, provider)
    const supabase = createClient()
    const redirectTo = `${window.location.origin}/auth/callback${next ? `?next=${encodeURIComponent(next)}` : ''}`
    await supabase.auth.signInWithOAuth({ provider, options: { redirectTo } })
  }

  return (
    <div className="space-y-2.5">
      {PROVIDERS.map(({ id, label, icon }) => (
        <button
          key={id}
          onClick={() => handleOAuth(id)}
          disabled={loading !== null}
          className="relative w-full flex items-center justify-center gap-2.5 bg-[#F5F5F5] border border-[#E8E8E8] hover:border-[#CCCCCC] rounded-lg px-4 py-2.5 text-sm font-medium text-[#252525] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {icon}
          <span>{loading === id ? 'Redirecting…' : label}</span>
          {lastProvider === id && (
            <span className="absolute right-0 top-0 text-[11px] font-normal text-[#888888] bg-[#EBEBEB] rounded-tr-lg rounded-bl-lg px-1.5 py-0.5 leading-none">
              Last used
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
