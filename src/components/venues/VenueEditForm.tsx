'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Genre, Venue } from '@/types/database'

interface VenueEditFormProps {
  venue: Venue
  genres: Genre[]
  selectedGenreIds: string[]
  showHeader?: boolean
  className?: string
}

const inputClass =
  'w-full bg-[#F5F5F5] border border-[#E8E8E8] rounded-lg px-3 py-2.5 text-sm placeholder-[#AAAAAA] focus:outline-none focus:border-[#FD6A2F] transition-colors'

function Label({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="block text-sm text-[#777777] mb-1.5">
      {children}
    </label>
  )
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold text-[#888888] uppercase tracking-widest mb-5">
      {children}
    </h2>
  )
}

export function VenueEditForm({
  venue,
  genres,
  selectedGenreIds,
  showHeader = true,
  className = 'max-w-2xl mx-auto px-6 py-10 space-y-12',
}: VenueEditFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [description, setDescription] = useState(venue.description ?? '')
  const [address, setAddress] = useState(venue.location_address ?? '')
  const [city, setCity] = useState(venue.location_city)
  const [state, setState] = useState(venue.location_state)
  const [zip, setZip] = useState(venue.location_zip ?? '')
  const [capacity, setCapacity] = useState(venue.capacity?.toString() ?? '')
  const [defaultBillCap, setDefaultBillCap] = useState(venue.default_bill_cap.toString())
  const [ageRequirement, setAgeRequirement] = useState(venue.age_requirement ?? '')
  const [websiteUrl, setWebsiteUrl] = useState(venue.website_url ?? '')
  const [instagramUrl, setInstagramUrl] = useState(venue.instagram_url ?? '')
  const [phone, setPhone] = useState(venue.phone ?? '')
  const [bookingEmail, setBookingEmail] = useState(venue.booking_email ?? '')
  const [selectedGenres, setSelectedGenres] = useState<Set<string>>(
    new Set(selectedGenreIds)
  )

  function toggleGenre(id: string) {
    setSelectedGenres((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()

    const { error: updateError } = await supabase
      .from('venues')
      .update({
        description: description.trim() || null,
        location_address: address.trim() || null,
        location_city: city.trim(),
        location_state: state.trim(),
        location_zip: zip.trim() || null,
        capacity: capacity ? parseInt(capacity, 10) : null,
        default_bill_cap: defaultBillCap ? parseInt(defaultBillCap, 10) : venue.default_bill_cap,
        age_requirement: (ageRequirement || null) as Venue['age_requirement'],
        website_url: websiteUrl.trim() || null,
        instagram_url: instagramUrl.trim() || null,
        phone: phone.trim() || null,
        booking_email: bookingEmail.trim() || null,
      })
      .eq('id', venue.id)

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    // Sync genres
    await supabase.from('venue_genres').delete().eq('venue_id', venue.id)
    if (selectedGenres.size > 0) {
      await supabase.from('venue_genres').insert(
        Array.from(selectedGenres).map((genre_id) => ({
          venue_id: venue.id,
          genre_id,
        }))
      )
    }

    router.push('/dashboard/venues')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className={className}>
      {showHeader && (
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{venue.name}</h1>
            <p className="text-sm text-[#888888] mt-0.5">Edit venue info</p>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="bg-[#FD6A2F] text-white font-semibold rounded-lg px-5 py-2 text-sm hover:bg-[#E55A22] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      )}

      {error && (
        <p className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg px-4 py-3 text-sm">
          {error}
        </p>
      )}

      {/* Location */}
      <section>
        <SectionHeader>Location</SectionHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="address">Street address</Label>
            <input
              id="address"
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className={inputClass}
              placeholder="123 Main St"
            />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="sm:col-span-2">
              <Label htmlFor="city">City *</Label>
              <input
                id="city"
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                required
                className={inputClass}
              />
            </div>
            <div>
              <Label htmlFor="state">State *</Label>
              <input
                id="state"
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                required
                className={inputClass}
                maxLength={2}
              />
            </div>
            <div>
              <Label htmlFor="zip">Zip</Label>
              <input
                id="zip"
                type="text"
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                className={inputClass}
                maxLength={10}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Details */}
      <section>
        <SectionHeader>Details</SectionHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="capacity">Capacity</Label>
            <input
              id="capacity"
              type="number"
              min={1}
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              className={inputClass}
              placeholder="500"
            />
          </div>
          <div>
            <Label htmlFor="default-bill-cap">Default bill cap</Label>
            <input
              id="default-bill-cap"
              type="number"
              min={1}
              value={defaultBillCap}
              onChange={(e) => setDefaultBillCap(e.target.value)}
              className={inputClass}
              placeholder="4"
            />
          </div>
          <div>
            <Label htmlFor="age-requirement">Age requirement</Label>
            <select
              id="age-requirement"
              value={ageRequirement}
              onChange={(e) => setAgeRequirement(e.target.value)}
              className={inputClass}
            >
              <option value="">Not specified</option>
              <option value="all_ages">All ages</option>
              <option value="18_plus">18+</option>
              <option value="21_plus">21+</option>
            </select>
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              className={inputClass + ' resize-y'}
              placeholder="Tell artists about your venue — the room, the vibe, the history."
            />
          </div>
        </div>
      </section>

      {/* Genres */}
      <section>
        <SectionHeader>Genres Booked</SectionHeader>
        <div className="flex flex-wrap gap-2">
          {genres.map((genre) => {
            const selected = selectedGenres.has(genre.id)
            return (
              <button
                key={genre.id}
                type="button"
                onClick={() => toggleGenre(genre.id)}
                className={`text-sm px-3 py-1 rounded-full border transition-colors ${
                  selected
                    ? 'bg-[#FD6A2F] border-[#FD6A2F] text-white font-medium'
                    : 'border-[#E8E8E8] text-[#777777] hover:border-[#CCCCCC] hover:text-[#252525]'
                }`}
              >
                {genre.name}
              </button>
            )
          })}
        </div>
      </section>

      {/* Booking */}
      <section>
        <SectionHeader>Booking Contact</SectionHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="booking-email">Booking email</Label>
            <input
              id="booking-email"
              type="email"
              value={bookingEmail}
              onChange={(e) => setBookingEmail(e.target.value)}
              className={inputClass}
              placeholder="booking@yourvenue.com"
            />
          </div>
          <div>
            <Label htmlFor="phone">Phone</Label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={inputClass}
              placeholder="(555) 000-0000"
            />
          </div>
        </div>
      </section>

      {/* Links */}
      <section>
        <SectionHeader>Links</SectionHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="website">Website</Label>
            <input
              id="website"
              type="url"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              className={inputClass}
              placeholder="https://yourvenue.com"
            />
          </div>
          <div>
            <Label htmlFor="instagram">Instagram</Label>
            <input
              id="instagram"
              type="url"
              value={instagramUrl}
              onChange={(e) => setInstagramUrl(e.target.value)}
              className={inputClass}
              placeholder="https://instagram.com/yourvenue"
            />
          </div>
        </div>
      </section>

      <div className="flex justify-end pb-10">
        <button
          type="submit"
          disabled={loading}
          className="bg-[#FD6A2F] text-white font-semibold rounded-lg px-6 py-2.5 text-sm hover:bg-[#E55A22] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </form>
  )
}
