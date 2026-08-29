'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useState, useRef } from 'react'

interface DashboardVenueFiltersProps {
  genres: { id: string; name: string }[]
}

const CAPACITY_OPTIONS = [
  { value: '', label: 'Any size' },
  { value: 'small', label: 'Small (< 150)' },
  { value: 'medium', label: 'Medium (150–400)' },
  { value: 'large', label: 'Large (400+)' },
]

const AGE_OPTIONS = [
  { value: '', label: 'Any age policy' },
  { value: 'all_ages', label: 'All ages' },
  { value: '18_plus', label: '18+' },
  { value: '21_plus', label: '21+' },
]

async function reverseGeocode(lat: number, lon: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
      { headers: { 'Accept-Language': 'en' } }
    )
    const data = await res.json()
    const addr = data.address ?? {}
    const city = addr.city || addr.town || addr.village || addr.county || ''
    const stateCode = addr.state_code?.toUpperCase() ?? ''
    if (!stateCode) return null
    return city ? `${city}, ${stateCode}` : stateCode
  } catch {
    return null
  }
}

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

function LocationFilterInput({
  value,
  geoLoading,
  onChange,
  onClear,
  onUseLocation,
}: {
  value: string
  geoLoading: boolean
  onChange: (value: string) => void
  onClear: () => void
  onUseLocation: () => void
}) {
  const [locationValue, setLocationValue] = useState(value)

  function handleChange(raw: string) {
    setLocationValue(raw)
    onChange(raw)
  }

  function handleClear() {
    setLocationValue('')
    onClear()
  }

  return (
    <div className="relative col-span-2 sm:col-span-1">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#BBBBBB] z-10">
        {geoLoading ? (
          <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 10c0 6-8 13-8 13s-8-7-8-13a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" />
          </svg>
        )}
      </span>
      <input
        type="text"
        value={locationValue}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="City or state..."
        className="w-full appearance-none bg-white border border-[#E8E8E8] rounded-lg pl-8 pr-8 py-2.5 text-sm text-[#252525] placeholder-[#AAAAAA] focus:outline-none focus:border-[#FD6A2F] transition-colors"
      />
      {locationValue ? (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#BBBBBB] hover:text-[#888888] text-base leading-none"
          aria-label="Clear"
        >&times;</button>
      ) : (
        <button
          type="button"
          onClick={onUseLocation}
          disabled={geoLoading}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-[#FD6A2F] hover:text-[#E55A22] disabled:opacity-40 transition-colors"
          aria-label="Use my location"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
          </svg>
        </button>
      )}
    </div>
  )
}

export function DashboardVenueFilters({
  genres,
}: DashboardVenueFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [geoLoading, setGeoLoading] = useState(false)
  const [geoError, setGeoError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const urlLocation = searchParams.get('location') ?? ''

  const pushParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString())
      for (const [key, value] of Object.entries(updates)) {
        if (value) params.set(key, value)
        else params.delete(key)
      }
      params.delete('recommendBand')
      params.delete('page')
      params.delete('view')
      router.push(`/dashboard/venues?${params.toString()}`)
    },
    [router, searchParams]
  )

  function handleSearch(v: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => pushParams({ q: v }), 350)
  }

  function handleLocationInput(raw: string) {
    setGeoError(null)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!raw.trim()) { pushParams({ location: '' }); return }
    debounceRef.current = setTimeout(() => pushParams({ location: raw.trim() }), 350)
  }

  async function handleUseLocation() {
    if (!navigator.geolocation) { setGeoError('Geolocation not supported.'); return }
    setGeoLoading(true)
    setGeoError(null)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const resolved = await reverseGeocode(pos.coords.latitude, pos.coords.longitude)
        setGeoLoading(false)
        if (resolved) pushParams({ location: resolved })
        else setGeoError("Couldn't determine location. Try typing it.")
      },
      (err) => {
        setGeoLoading(false)
        setGeoError(err.code === err.PERMISSION_DENIED
          ? 'Location access denied. Try typing your city or state.'
          : "Couldn't get your location. Try typing it.")
      },
      { timeout: 10000 }
    )
  }

  return (
    <div className="bg-white border border-[#E8E8E8] rounded-xl p-5 mb-6 shadow-sm">
      <p className="text-xs font-semibold text-[#888888] uppercase tracking-widest mb-3">
        Book your tour
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
          placeholder="Search venues…"
          defaultValue={searchParams.get('q') ?? ''}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full bg-[#F5F5F5] rounded-lg pl-10 pr-4 py-2.5 text-sm text-[#252525] placeholder-[#AAAAAA] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#FD6A2F]/20 focus:border-[#FD6A2F] border border-transparent transition-all"
        />
      </div>

      {/* Filter row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {/* Location */}
        <LocationFilterInput
          key={urlLocation}
          value={urlLocation}
          geoLoading={geoLoading}
          onChange={handleLocationInput}
          onClear={() => { setGeoError(null); pushParams({ location: '' }) }}
          onUseLocation={handleUseLocation}
        />

        <CustomSelect value={searchParams.get('capacity') ?? ''} onChange={(v) => pushParams({ capacity: v })}>
          {CAPACITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </CustomSelect>

        <CustomSelect value={searchParams.get('age') ?? ''} onChange={(v) => pushParams({ age: v })}>
          {AGE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </CustomSelect>

        <CustomSelect value={searchParams.get('genre') ?? ''} onChange={(v) => pushParams({ genre: v })}>
          <option value="">All genres</option>
          {genres.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </CustomSelect>
      </div>

      {geoError && <p className="text-xs text-red-400 mt-2">{geoError}</p>}
    </div>
  )
}
