'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useState, useRef } from 'react'
import { ChevronDown, Crosshair, LoaderCircle, MapPin, Search, X } from 'lucide-react'
import { inputClass } from '@/components/ui/primitives'

interface VenueFiltersProps {
  genres: { id: string; name: string }[]
}

const CAPACITY_OPTIONS = [
  { value: '', label: 'Any size' },
  { value: 'small', label: 'Small (< 150)' },
  { value: 'medium', label: 'Medium (150-400)' },
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
        className={`${inputClass} appearance-none pr-10 cursor-pointer`}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#888888]" />
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
    <div className="relative">
      <span className="pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-[#A0A0A0]">
        {geoLoading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
      </span>
      <input
        type="text"
        value={locationValue}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="City or state"
        className={`${inputClass} pl-10 pr-10`}
      />
      {locationValue ? (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-[#888888] transition-colors hover:bg-[#EFEFEF] hover:text-[#252525]"
          aria-label="Clear location"
        >
          <X className="h-4 w-4" />
        </button>
      ) : (
        <button
          type="button"
          onClick={onUseLocation}
          disabled={geoLoading}
          className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-[#FD6A2F] transition-colors hover:bg-[#FFF3EE] hover:text-[#E55A22] disabled:opacity-40"
          aria-label="Use my location"
        >
          <Crosshair className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}

export function VenueFilters({ genres }: VenueFiltersProps) {
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
      params.delete('page')
      router.push(`/venues?${params.toString()}`)
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
    if (!raw.trim()) {
      pushParams({ location: '' })
      return
    }
    debounceRef.current = setTimeout(() => pushParams({ location: raw.trim() }), 350)
  }

  async function handleUseLocation() {
    if (!navigator.geolocation) {
      setGeoError('Geolocation not supported.')
      return
    }
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
    <div className="sticky top-[73px] z-20 mb-8 rounded-2xl border border-[#E6E6E6] bg-white/95 p-4 shadow-[0_16px_40px_rgba(20,20,20,0.07)] backdrop-blur lg:top-4">
      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A0A0A0]" />
        <input
          type="text"
          placeholder="Search venues or cities"
          defaultValue={searchParams.get('q') ?? ''}
          onChange={(e) => handleSearch(e.target.value)}
          className={`${inputClass} pl-10`}
        />
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
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

      {geoError && <p className="mt-2 text-xs text-red-500">{geoError}</p>}
    </div>
  )
}
