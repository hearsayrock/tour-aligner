'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useRef } from 'react'

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
        className="w-full appearance-none bg-white border border-border rounded-lg px-3 py-2.5 pr-8 text-sm text-ink focus:outline-none focus:border-brand transition-colors cursor-pointer"
      >
        {children}
      </select>
      <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted text-[9px]">
        ▼
      </span>
    </div>
  )
}

export function DashboardBandFilters({ genres }: DashboardBandFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  const query = searchParams.get('q') ?? ''
  useEffect(() => {
    if (searchInputRef.current) searchInputRef.current.value = query
  }, [query])
  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
  }, [searchParams])

  const pushParams = useCallback(
    (updates: Record<string, string>) => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      const params = new URLSearchParams(searchParams.toString())
      for (const [key, value] of Object.entries(updates)) {
        if (value) params.set(key, value)
        else params.delete(key)
      }
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
    <div className="bg-white border border-border rounded-xl p-5 mb-6 shadow-sm">
      <p className="text-xs font-semibold text-muted uppercase tracking-widest mb-3">
        Find artists
      </p>

      {/* Search */}
      <div className="relative mb-3">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-sand-light">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
        </span>
        <input
          type="text"
          ref={searchInputRef}
          aria-label="Search artists by name or city"
          placeholder="Search bands and artists…"
          defaultValue={searchParams.get('q') ?? ''}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full bg-surface-2 rounded-lg pl-10 pr-4 py-2.5 text-sm text-ink placeholder-sand-light focus:outline-none focus:bg-white focus:ring-2 focus:ring-brand/20 focus:border-brand border border-transparent transition-all"
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
