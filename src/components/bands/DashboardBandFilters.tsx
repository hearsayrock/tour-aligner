'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useRef } from 'react'

interface DashboardBandFiltersProps {
  genres: { id: string; name: string }[]
}

const RADIUS_OPTIONS = [
  { value: '', label: 'Any touring range' },
  { value: 'local', label: 'Local' },
  { value: 'regional', label: 'Regional' },
  { value: 'national', label: 'National' },
  { value: 'international', label: 'International' },
]

const ARTIST_TYPE_OPTIONS = [
  { value: '', label: 'Solo or band' },
  { value: 'solo', label: 'Solo artist' },
  { value: 'band', label: 'Full band' },
]

function CustomSelect({
  value,
  onChange,
  children,
}: {
  value: string
  onChange: (v: string) => void
  children: React.ReactNode
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none bg-white border border-[#E8E8E8] rounded-lg px-3 py-2.5 pr-8 text-sm text-[#252525] focus:outline-none focus:border-[#FD6A2F] transition-colors cursor-pointer"
      >
        {children}
      </select>
      <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#888888] text-[9px]">
        ▼
      </span>
    </div>
  )
}

export function DashboardBandFilters({ genres }: DashboardBandFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const pushParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString())
      for (const [key, value] of Object.entries(updates)) {
        if (value) params.set(key, value)
        else params.delete(key)
      }
      params.set('tab', 'directory')
      params.delete('page')
      params.delete('view')
      router.push(`/dashboard/bands?${params.toString()}`)
    },
    [router, searchParams]
  )

  function handleSearch(v: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => pushParams({ q: v }), 350)
  }

  return (
    <div className="bg-white border border-[#E8E8E8] rounded-xl p-5 mb-6 shadow-sm">
      <p className="text-xs font-semibold text-[#888888] uppercase tracking-widest mb-3">
        Find artists
      </p>

      {/* Search */}
      <div className="relative mb-3">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#BBBBBB]">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
        </span>
        <input
          type="text"
          placeholder="Search bands and artists…"
          defaultValue={searchParams.get('q') ?? ''}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full bg-[#F5F5F5] rounded-lg pl-10 pr-4 py-2.5 text-sm text-[#252525] placeholder-[#AAAAAA] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#FD6A2F]/20 focus:border-[#FD6A2F] border border-transparent transition-all"
        />
      </div>

      {/* Filter row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <CustomSelect value={searchParams.get('genre') ?? ''} onChange={(v) => pushParams({ genre: v })}>
          <option value="">All genres</option>
          {genres.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </CustomSelect>

        <CustomSelect value={searchParams.get('radius') ?? ''} onChange={(v) => pushParams({ radius: v })}>
          {RADIUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </CustomSelect>

        <CustomSelect value={searchParams.get('artistType') ?? ''} onChange={(v) => pushParams({ artistType: v })}>
          {ARTIST_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </CustomSelect>
      </div>
    </div>
  )
}
