'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { ImageCropModal } from '@/components/ui/ImageCropModal'
import type { Genre } from '@/types/database'

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const US_STATES = [
  ['AL', 'Alabama'], ['AK', 'Alaska'], ['AZ', 'Arizona'], ['AR', 'Arkansas'],
  ['CA', 'California'], ['CO', 'Colorado'], ['CT', 'Connecticut'], ['DE', 'Delaware'],
  ['FL', 'Florida'], ['GA', 'Georgia'], ['HI', 'Hawaii'], ['ID', 'Idaho'],
  ['IL', 'Illinois'], ['IN', 'Indiana'], ['IA', 'Iowa'], ['KS', 'Kansas'],
  ['KY', 'Kentucky'], ['LA', 'Louisiana'], ['ME', 'Maine'], ['MD', 'Maryland'],
  ['MA', 'Massachusetts'], ['MI', 'Michigan'], ['MN', 'Minnesota'], ['MS', 'Mississippi'],
  ['MO', 'Missouri'], ['MT', 'Montana'], ['NE', 'Nebraska'], ['NV', 'Nevada'],
  ['NH', 'New Hampshire'], ['NJ', 'New Jersey'], ['NM', 'New Mexico'], ['NY', 'New York'],
  ['NC', 'North Carolina'], ['ND', 'North Dakota'], ['OH', 'Ohio'], ['OK', 'Oklahoma'],
  ['OR', 'Oregon'], ['PA', 'Pennsylvania'], ['RI', 'Rhode Island'], ['SC', 'South Carolina'],
  ['SD', 'South Dakota'], ['TN', 'Tennessee'], ['TX', 'Texas'], ['UT', 'Utah'],
  ['VT', 'Vermont'], ['VA', 'Virginia'], ['WA', 'Washington'], ['WV', 'West Virginia'],
  ['WI', 'Wisconsin'], ['WY', 'Wyoming'], ['DC', 'Washington, D.C.'],
] as const

const TOURING_RADIUS_OPTIONS = [
  { value: 'local',         label: 'Local',         desc: 'Within ~100 miles' },
  { value: 'regional',      label: 'Regional',       desc: 'Multi-state area' },
  { value: 'national',      label: 'National',       desc: 'Across the U.S.' },
  { value: 'international', label: 'International',  desc: 'Worldwide' },
] as const

const STREAMING_FIELDS = [
  { key: 'spotify',     label: 'Spotify',      placeholder: 'https://open.spotify.com/artist/…' },
  { key: 'appleMusic',  label: 'Apple Music',  placeholder: 'https://music.apple.com/…' },
  { key: 'youtube',     label: 'YouTube',      placeholder: 'https://youtube.com/@…' },
  { key: 'soundcloud',  label: 'SoundCloud',   placeholder: 'https://soundcloud.com/…' },
  { key: 'bandcamp',    label: 'Bandcamp',     placeholder: 'https://yourband.bandcamp.com' },
] as const

const SOCIAL_FIELDS = [
  { key: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/…' },
  { key: 'tiktok',    label: 'TikTok',    placeholder: 'https://tiktok.com/@…' },
  { key: 'facebook',  label: 'Facebook',  placeholder: 'https://facebook.com/…' },
  { key: 'twitter',   label: 'Twitter / X', placeholder: 'https://x.com/…' },
] as const

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function slugify(str: string) {
  return str.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

async function uploadPhoto(
  supabase: ReturnType<typeof createClient>,
  file: File,
  bandId: string,
  type: 'profile' | 'cover'
): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `bands/${bandId}/${type}.${ext}`
  const { error } = await supabase.storage.from('band-images').upload(path, file, { upsert: true })
  if (error) throw error
  const { data } = supabase.storage.from('band-images').getPublicUrl(path)
  return data.publicUrl
}

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

type Intent = 'artist' | 'venue'
type Step = 1 | 2 | 3 | 4

type Links = {
  website: string
  spotify: string
  appleMusic: string
  youtube: string
  soundcloud: string
  bandcamp: string
  instagram: string
  tiktok: string
  facebook: string
  twitter: string
}

// ─────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────

const inputClass =
  'w-full bg-[#F5F5F5] border border-[#E8E8E8] rounded-lg px-3 py-2.5 text-sm placeholder-[#AAAAAA] focus:outline-none focus:border-[#FD6A2F] transition-colors text-[#252525]'

function FieldLabel({ htmlFor, children }: { htmlFor?: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="block text-sm text-[#777777] mb-1.5">
      {children}
    </label>
  )
}

interface PhotoZoneProps {
  label: string
  aspectClass: string
  aspect: number
  radiusClass?: string
  previewUrl: string | null
  onFileSelect: (file: File, preview: string) => void
  onRemove: () => void
}

function PhotoZone({ label, aspectClass, aspect, radiusClass = 'rounded-xl', previewUrl, onFileSelect, onRemove }: PhotoZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [cropSrc, setCropSrc] = useState<string | null>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setCropSrc(URL.createObjectURL(file))
    e.target.value = ''
  }

  return (
    <>
      {cropSrc && (
        <ImageCropModal
          src={cropSrc}
          aspect={aspect}
          onComplete={(file, preview) => { setCropSrc(null); onFileSelect(file, preview) }}
          onCancel={() => setCropSrc(null)}
        />
      )}
      <div>
        <p className="text-sm text-[#777777] mb-2">{label}</p>
        <div
          className={`relative ${aspectClass} ${radiusClass} overflow-hidden bg-[#F5F5F5] border-2 border-dashed border-[#E8E8E8] cursor-pointer hover:border-[#FD6A2F] transition-colors group`}
          onClick={() => inputRef.current?.click()}
        >
          {previewUrl ? (
            <>
              <Image src={previewUrl} alt={label} fill className="object-cover" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="text-white text-xs font-medium">Change photo</span>
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onRemove() }}
                className="absolute top-2 right-2 bg-black/60 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-black/80 transition-colors opacity-0 group-hover:opacity-100"
              >
                ×
              </button>
            </>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-[#BBBBBB] group-hover:text-[#FD6A2F] transition-colors">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="m21 15-5-5L5 21" />
              </svg>
              <span className="text-xs">Click to upload</span>
            </div>
          )}
        </div>
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
      </div>
    </>
  )
}

// ─────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────

interface Props {
  userId: string
  userName: string
  genres: Genre[]
}

export default function OnboardingWizard({ userId, userName, genres }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [intent, setIntent] = useState<Intent>('artist')
  const [step, setStep] = useState<Step>(1)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Step 1 — Basic info
  const [artistName, setArtistName] = useState('')
  const [bio, setBio] = useState('')
  const [city, setCity] = useState('')
  const [usState, setUsState] = useState('')

  // Step 2 — Photos
  const [profileFile, setProfileFile] = useState<File | null>(null)
  const [profilePreview, setProfilePreview] = useState<string | null>(null)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)

  // Step 3 — Music & reach
  const [selectedGenreIds, setSelectedGenreIds] = useState<string[]>([])
  const [touringRadius, setTouringRadius] = useState<string>('regional')

  // Step 4 — Links
  const [links, setLinks] = useState<Links>({
    website: '', spotify: '', appleMusic: '', youtube: '',
    soundcloud: '', bandcamp: '', instagram: '', tiktok: '',
    facebook: '', twitter: '',
  })

  function setLink(key: keyof Links, value: string) {
    setLinks(prev => ({ ...prev, [key]: value }))
  }

  function toggleGenre(id: string) {
    setSelectedGenreIds(prev => {
      if (prev.includes(id)) return prev.filter(g => g !== id)
      if (prev.length >= 3) return prev
      return [...prev, id]
    })
  }

  function handleNext() {
    if (step === 1 && !artistName.trim()) {
      setError('Artist name is required.')
      return
    }
    setError('')
    setStep(s => (s < 4 ? (s + 1) as Step : s))
  }

  function handleBack() {
    setError('')
    setStep(s => (s > 1 ? (s - 1) as Step : s))
  }

  async function handleVenueFinish() {
    setSubmitting(true)
    await supabase.from('profiles').update({ primary_role: 'venue' }).eq('id', userId)
    router.push('/venues')
  }

  async function handleArtistFinish() {
    setSubmitting(true)
    setError('')

    try {
      const slug = slugify(artistName.trim())

      const { data: band, error: bandError } = await supabase
        .from('bands')
        .insert({
          user_id: userId,
          name: artistName.trim(),
          slug,
          description: bio.trim() || null,
          location_city: city.trim() || null,
          location_state: usState || null,
          touring_radius: (touringRadius || null) as 'local' | 'regional' | 'national' | 'international' | null,
          website_url: links.website.trim() || null,
          spotify_url: links.spotify.trim() || null,
          apple_music_url: links.appleMusic.trim() || null,
          youtube_url: links.youtube.trim() || null,
          soundcloud_url: links.soundcloud.trim() || null,
          bandcamp_url: links.bandcamp.trim() || null,
          instagram_url: links.instagram.trim() || null,
          tiktok_url: links.tiktok.trim() || null,
          facebook_url: links.facebook.trim() || null,
          twitter_url: links.twitter.trim() || null,
        })
        .select('id')
        .single()

      if (bandError) {
        setError(
          bandError.code === '23505'
            ? 'An artist with that name already exists. Try a slightly different name.'
            : 'Failed to create your profile. Please try again.'
        )
        setSubmitting(false)
        return
      }

      // Upload photos in parallel
      let profilePhotoUrl: string | null = null
      let coverPhotoUrl: string | null = null
      await Promise.all([
        profileFile
          ? uploadPhoto(supabase, profileFile, band.id, 'profile').then(u => { profilePhotoUrl = u })
          : Promise.resolve(),
        coverFile
          ? uploadPhoto(supabase, coverFile, band.id, 'cover').then(u => { coverPhotoUrl = u })
          : Promise.resolve(),
      ])

      if (profilePhotoUrl || coverPhotoUrl) {
        await supabase.from('bands').update({
          ...(profilePhotoUrl ? { profile_photo_url: profilePhotoUrl } : {}),
          ...(coverPhotoUrl  ? { cover_photo_url:   coverPhotoUrl  } : {}),
        }).eq('id', band.id)
      }

      if (selectedGenreIds.length > 0) {
        await supabase.from('band_genres').insert(
          selectedGenreIds.map(genre_id => ({ band_id: band.id, genre_id }))
        )
      }

      await supabase.from('profiles').update({ primary_role: 'artist' }).eq('id', userId)

      router.push('/dashboard')
    } catch {
      setError('Something went wrong. Please try again.')
      setSubmitting(false)
    }
  }

  const TOTAL_STEPS = 4
  const firstName = userName.split(' ')[0] || 'there'

  // ─── Render ───────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col">
      {/* Top bar */}
      <header className="px-6 py-5 flex items-center justify-between border-b border-[#F0F0F0] bg-white">
        <span className="text-base font-bold text-[#252525] tracking-tight">TourAligner</span>
        {intent === 'artist' && (
          <span className="text-xs text-[#AAAAAA]">Step {step} of {TOTAL_STEPS}</span>
        )}
      </header>

      {/* Content */}
      <main className="flex-1 flex flex-col items-center px-4 py-10">
        <div className="w-full max-w-xl">

          {/* Greeting */}
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold text-[#252525] mb-1">
              Welcome{firstName !== 'there' ? `, ${firstName}` : ''}!
            </h1>
            <p className="text-sm text-[#888888]">Let's get your profile set up.</p>
          </div>

          {/* Intent toggle — always at the top */}
          <div className="mb-8">
            <p className="text-sm font-semibold text-[#252525] mb-3 text-center">
              What are you here to do first?
            </p>
            <div className="flex rounded-xl overflow-hidden border border-[#E8E8E8] bg-white shadow-sm">
              <button
                type="button"
                onClick={() => { setIntent('artist'); setStep(1); setError('') }}
                className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                  intent === 'artist'
                    ? 'bg-[#FD6A2F] text-white'
                    : 'text-[#777777] hover:text-[#252525] hover:bg-[#FAFAFA]'
                }`}
              >
                Book shows as an artist
              </button>
              <button
                type="button"
                onClick={() => { setIntent('venue'); setError('') }}
                className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                  intent === 'venue'
                    ? 'bg-[#FD6A2F] text-white'
                    : 'text-[#777777] hover:text-[#252525] hover:bg-[#FAFAFA]'
                }`}
              >
                Manage a venue
              </button>
            </div>
          </div>

          {/* ── VENUE INTENT ── */}
          {intent === 'venue' && (
            <div className="bg-white rounded-2xl border border-[#E8E8E8] p-8 text-center shadow-sm">
              <div className="w-14 h-14 bg-[#FFF4EF] rounded-2xl flex items-center justify-center mx-auto mb-5">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FD6A2F" strokeWidth="1.5">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-[#252525] mb-2">Let's find your venue</h2>
              <p className="text-sm text-[#888888] mb-6 max-w-sm mx-auto">
                Browse the venue directory and claim your venue. Once claimed, you'll be able to receive and manage booking inquiries.
              </p>
              <button
                type="button"
                onClick={handleVenueFinish}
                disabled={submitting}
                className="bg-[#FD6A2F] text-white font-semibold rounded-xl px-6 py-3 text-sm hover:bg-[#E55A22] transition-colors disabled:opacity-50 w-full"
              >
                {submitting ? 'One moment…' : 'Browse the venue directory →'}
              </button>
            </div>
          )}

          {/* ── ARTIST INTENT — step content ── */}
          {intent === 'artist' && (
            <>
              {/* Progress bar */}
              <div className="flex gap-1.5 mb-8">
                {Array.from({ length: TOTAL_STEPS }, (_, i) => (
                  <div
                    key={i}
                    className={`flex-1 h-1 rounded-full transition-colors ${
                      i + 1 <= step ? 'bg-[#FD6A2F]' : 'bg-[#E8E8E8]'
                    }`}
                  />
                ))}
              </div>

              <div className="bg-white rounded-2xl border border-[#E8E8E8] shadow-sm overflow-hidden">
                {/* ── Step 1: Basic Info ── */}
                {step === 1 && (
                  <div className="p-6 sm:p-8 space-y-5">
                    <div>
                      <h2 className="text-lg font-bold text-[#252525] mb-0.5">Tell us about your act</h2>
                      <p className="text-sm text-[#888888]">The basics that venues need to know.</p>
                    </div>

                    <div>
                      <FieldLabel htmlFor="artistName">Artist name <span className="text-[#FD6A2F]">*</span></FieldLabel>
                      <input
                        id="artistName"
                        type="text"
                        value={artistName}
                        onChange={e => setArtistName(e.target.value)}
                        className={inputClass}
                        placeholder="The Midnight"
                        autoFocus
                      />
                    </div>

                    <div>
                      <FieldLabel htmlFor="bio">Bio</FieldLabel>
                      <textarea
                        id="bio"
                        value={bio}
                        onChange={e => setBio(e.target.value)}
                        rows={4}
                        className={inputClass + ' resize-y'}
                        placeholder="Tell venues who you are, what you sound like, and the kind of shows you play."
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <FieldLabel htmlFor="city">Home city</FieldLabel>
                        <input
                          id="city"
                          type="text"
                          value={city}
                          onChange={e => setCity(e.target.value)}
                          className={inputClass}
                          placeholder="Los Angeles"
                        />
                      </div>
                      <div>
                        <FieldLabel htmlFor="usState">State</FieldLabel>
                        <select
                          id="usState"
                          value={usState}
                          onChange={e => setUsState(e.target.value)}
                          className={inputClass}
                        >
                          <option value="">Select…</option>
                          {US_STATES.map(([abbr, name]) => (
                            <option key={abbr} value={abbr}>{abbr} — {name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Step 2: Photos ── */}
                {step === 2 && (
                  <div className="p-6 sm:p-8 space-y-6">
                    <div>
                      <h2 className="text-lg font-bold text-[#252525] mb-0.5">Add your photos</h2>
                      <p className="text-sm text-[#888888]">A great cover and profile photo make your page stand out. You can always change these later.</p>
                    </div>

                    {/* Cover photo — 3:1 */}
                    <PhotoZone
                      label="Cover photo"
                      aspectClass="aspect-[3/1]"
                      radiusClass="rounded-xl"
                      aspect={3}
                      previewUrl={coverPreview}
                      onFileSelect={(file, preview) => { setCoverFile(file); setCoverPreview(preview) }}
                      onRemove={() => { setCoverFile(null); setCoverPreview(null) }}
                    />

                    {/* Profile photo — 1:1 */}
                    <div className="flex items-start gap-5">
                      <div className="w-28 flex-shrink-0">
                        <PhotoZone
                          label="Profile photo"
                          aspectClass="aspect-square"
                          radiusClass="rounded-full"
                          aspect={1}
                          previewUrl={profilePreview}
                          onFileSelect={(file, preview) => { setProfileFile(file); setProfilePreview(preview) }}
                          onRemove={() => { setProfileFile(null); setProfilePreview(null) }}
                        />
                      </div>
                      <div className="pt-7">
                        <p className="text-xs text-[#AAAAAA] leading-relaxed">
                          Square image, at least 400×400px recommended. This appears as your avatar throughout the app.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Step 3: Genres & Radius ── */}
                {step === 3 && (
                  <div className="p-6 sm:p-8 space-y-7">
                    <div>
                      <h2 className="text-lg font-bold text-[#252525] mb-0.5">Your sound & reach</h2>
                      <p className="text-sm text-[#888888]">Help venues understand your music and how far you're willing to travel.</p>
                    </div>

                    {/* Genres */}
                    <div>
                      <div className="flex items-baseline justify-between mb-3">
                        <FieldLabel>Genre <span className="text-[#AAAAAA] font-normal">(up to 3)</span></FieldLabel>
                        {selectedGenreIds.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setSelectedGenreIds([])}
                            className="text-xs text-[#AAAAAA] hover:text-[#555555] transition-colors"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {genres.map((genre) => {
                          const idx = selectedGenreIds.indexOf(genre.id)
                          const isSelected = idx !== -1
                          const isPrimary = idx === 0
                          const isSub = idx > 0
                          const isDisabled = !isSelected && selectedGenreIds.length >= 3

                          return (
                            <button
                              key={genre.id}
                              type="button"
                              onClick={() => toggleGenre(genre.id)}
                              disabled={isDisabled}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                                isSelected
                                  ? 'bg-[#FD6A2F] text-white'
                                  : isDisabled
                                    ? 'bg-[#F5F5F5] text-[#CCCCCC] cursor-not-allowed'
                                    : 'bg-[#F5F5F5] text-[#555555] hover:bg-[#EAEAEA]'
                              }`}
                            >
                              {genre.name}
                              {isPrimary && (
                                <span className="text-[10px] bg-white/25 rounded-full px-1.5 py-0.5 leading-none font-semibold">
                                  Primary
                                </span>
                              )}
                              {isSub && (
                                <span className="text-[10px] bg-white/25 rounded-full px-1.5 py-0.5 leading-none font-semibold">
                                  Sub
                                </span>
                              )}
                            </button>
                          )
                        })}
                      </div>
                      {selectedGenreIds.length === 3 && (
                        <p className="text-xs text-[#AAAAAA] mt-2">Max 3 genres selected. Remove one to swap.</p>
                      )}
                    </div>

                    {/* Travel radius */}
                    <div>
                      <FieldLabel>How far are you willing to travel?</FieldLabel>
                      <div className="grid grid-cols-2 gap-2">
                        {TOURING_RADIUS_OPTIONS.map(opt => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setTouringRadius(opt.value)}
                            className={`text-left px-4 py-3 rounded-xl border-2 transition-all ${
                              touringRadius === opt.value
                                ? 'border-[#FD6A2F] bg-[#FFF4EF]'
                                : 'border-[#E8E8E8] bg-white hover:border-[#CCCCCC]'
                            }`}
                          >
                            <p className={`text-sm font-semibold ${touringRadius === opt.value ? 'text-[#FD6A2F]' : 'text-[#252525]'}`}>
                              {opt.label}
                            </p>
                            <p className="text-xs text-[#888888] mt-0.5">{opt.desc}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Step 4: Links ── */}
                {step === 4 && (
                  <div className="p-6 sm:p-8 space-y-7">
                    <div>
                      <h2 className="text-lg font-bold text-[#252525] mb-0.5">Where can people find you?</h2>
                      <p className="text-sm text-[#888888]">Add your links so venues can listen and connect. All optional.</p>
                    </div>

                    {/* Website */}
                    <div>
                      <FieldLabel htmlFor="website">Website</FieldLabel>
                      <input
                        id="website"
                        type="url"
                        value={links.website}
                        onChange={e => setLink('website', e.target.value)}
                        className={inputClass}
                        placeholder="https://yourband.com"
                      />
                    </div>

                    {/* Streaming */}
                    <div>
                      <p className="text-xs font-semibold text-[#888888] uppercase tracking-widest mb-3">Streaming</p>
                      <div className="space-y-3">
                        {STREAMING_FIELDS.map(field => (
                          <div key={field.key}>
                            <FieldLabel htmlFor={field.key}>{field.label}</FieldLabel>
                            <input
                              id={field.key}
                              type="url"
                              value={links[field.key as keyof Links]}
                              onChange={e => setLink(field.key as keyof Links, e.target.value)}
                              className={inputClass}
                              placeholder={field.placeholder}
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Social */}
                    <div>
                      <p className="text-xs font-semibold text-[#888888] uppercase tracking-widest mb-3">Social</p>
                      <div className="space-y-3">
                        {SOCIAL_FIELDS.map(field => (
                          <div key={field.key}>
                            <FieldLabel htmlFor={field.key}>{field.label}</FieldLabel>
                            <input
                              id={field.key}
                              type="url"
                              value={links[field.key as keyof Links]}
                              onChange={e => setLink(field.key as keyof Links, e.target.value)}
                              className={inputClass}
                              placeholder={field.placeholder}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Error */}
                {error && (
                  <div className="mx-6 sm:mx-8 mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                    {error}
                  </div>
                )}

                {/* Navigation */}
                <div className="px-6 sm:px-8 pb-6 sm:pb-8 pt-2 flex items-center justify-between gap-3 border-t border-[#F5F5F5]">
                  <div>
                    {step > 1 ? (
                      <button
                        type="button"
                        onClick={handleBack}
                        className="text-sm font-medium text-[#777777] hover:text-[#252525] transition-colors px-4 py-2.5"
                      >
                        ← Back
                      </button>
                    ) : (
                      <div />
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {step < TOTAL_STEPS ? (
                      <>
                        {step > 1 && (
                          <button
                            type="button"
                            onClick={handleNext}
                            className="text-sm text-[#AAAAAA] hover:text-[#777777] transition-colors px-3 py-2.5"
                          >
                            Skip
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={handleNext}
                          className="bg-[#FD6A2F] text-white font-semibold rounded-xl px-6 py-2.5 text-sm hover:bg-[#E55A22] transition-colors"
                        >
                          Continue →
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={handleArtistFinish}
                          disabled={submitting}
                          className="text-sm text-[#AAAAAA] hover:text-[#777777] transition-colors px-3 py-2.5 disabled:opacity-50"
                        >
                          Skip
                        </button>
                        <button
                          type="button"
                          onClick={handleArtistFinish}
                          disabled={submitting}
                          className="bg-[#FD6A2F] text-white font-semibold rounded-xl px-6 py-2.5 text-sm hover:bg-[#E55A22] transition-colors disabled:opacity-50"
                        >
                          {submitting ? 'Creating profile…' : 'Finish setup →'}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom skip link */}
              <p className="text-center mt-5 text-xs text-[#AAAAAA]">
                <button
                  type="button"
                  onClick={async () => {
                    setSubmitting(true)
                    await supabase.from('profiles').update({ primary_role: 'artist' }).eq('id', userId)
                    router.push('/dashboard')
                  }}
                  className="hover:text-[#777777] underline transition-colors"
                >
                  Skip setup for now — I'll fill this in later
                </button>
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
