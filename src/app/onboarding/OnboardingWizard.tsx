'use client'

/* eslint-disable react/no-unescaped-entities */

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { ImageCropModal } from '@/components/ui/ImageCropModal'
import { NavAccountMenu } from '@/components/ui/NavAccountMenu'
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
    <div className="relative min-h-screen bg-[#FFFDFC] lg:grid lg:grid-cols-[minmax(330px,0.85fr)_minmax(0,1.65fr)]">
      {/* Desktop welcome panel */}
      <aside className="relative hidden overflow-hidden bg-[#FFF1EA] p-8 lg:flex lg:flex-col xl:p-12">
        <Image src="/logo.png" alt="TourAligner" width={201} height={56} priority className="h-auto w-[201px]" />
        <div className="relative z-10 my-auto max-w-md">
          <p className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-[#D94F1A] shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-[#FD6A2F]" /> Artist setup
          </p>
          <h1 className="text-4xl font-extrabold leading-[1.08] tracking-tight text-[#252525] xl:text-5xl">
            Your next great show starts here.
          </h1>
          <p className="mt-5 max-w-sm text-base leading-relaxed text-[#6D625E] xl:text-lg">
            Build a venue-ready artist profile that puts your sound, story, and reach in the spotlight.
          </p>
          <div className="mt-10 flex items-center gap-3 text-sm font-medium text-[#504640]">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#FD6A2F] font-bold text-white">1</span>
            A polished profile in just a few minutes
          </div>
        </div>
        <div className="relative z-10 flex items-center gap-2 text-xs font-medium text-[#8A7B73]">
          <span className="h-2 w-2 rounded-full bg-[#FD6A2F]" /> Built for artists ready to get booked
        </div>
        <div className="absolute -bottom-24 -right-20 h-72 w-72 rounded-full border-[32px] border-[#FFD6C4]" />
        <div className="absolute right-16 top-32 h-4 w-4 rounded-full bg-[#FD6A2F]" />
        <div className="absolute right-28 top-44 h-2.5 w-2.5 rounded-full bg-[#F5B092]" />
      </aside>

      <section className="flex min-w-0 flex-col">
        {/* Mobile header */}
        <header className="flex items-center justify-between border-b border-[#F0E9E5] bg-white px-5 py-4 lg:hidden">
          <Image src="/logo.png" alt="TourAligner" width={161} height={45} priority className="h-auto w-[161px]" />
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-[#9B918C]">{step} of {TOTAL_STEPS}</span>
            <NavAccountMenu showManageProfiles={false} />
          </div>
        </header>

        <main className="flex flex-1 items-start justify-center px-4 py-7 sm:px-8 sm:py-10 lg:px-10 xl:px-16 xl:py-12">
          <div className="w-full max-w-3xl">
            <div className="mb-7 flex items-end justify-between gap-4 sm:mb-8">
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-[#D95B2B]">Let&apos;s make some noise</p>
                <h1 className="text-2xl font-extrabold tracking-tight text-[#252525] sm:text-3xl">
                  Welcome{firstName !== 'there' ? `, ${firstName}` : ''}!
                </h1>
                <p className="mt-1 text-sm text-[#817671] sm:text-base">Create the artist profile venues will remember.</p>
              </div>
              <div className="hidden shrink-0 rounded-full bg-[#FFF1EA] px-3 py-1.5 text-xs font-bold text-[#C94D1A] sm:block">
                Step {step} of {TOTAL_STEPS}
              </div>
            </div>

            {/* Role selection */}
            <div className="mb-6 sm:mb-7">
              <p className="mb-3 text-sm font-semibold text-[#403936]">What are you here to do first?</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex items-center gap-3 rounded-2xl border-2 border-[#FD6A2F] bg-[#FFF7F3] px-4 py-3.5 shadow-[0_8px_24px_rgba(253,106,47,0.08)]">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#FD6A2F] text-white">
                    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>
                  </span>
                  <span><span className="block text-sm font-bold text-[#252525]">Book shows as an artist</span><span className="block text-xs text-[#8B7D76]">Build your first profile</span></span>
                </div>
                <div aria-disabled="true" className="flex cursor-not-allowed items-center gap-3 rounded-2xl border border-[#E8E3E0] bg-[#F7F6F5] px-4 py-3.5 opacity-70">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#E7E4E2] text-[#A8A19D]">
                    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6M9 9h.01M15 9h.01" /></svg>
                  </span>
                  <span><span className="block text-sm font-bold text-[#817A76]">Manage a venue</span><span className="block text-xs text-[#A49D99]">Coming soon</span></span>
                </div>
              </div>
            </div>

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
                    <div className="grid gap-5 md:grid-cols-[minmax(0,1.25fr)_minmax(220px,0.75fr)]">
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
                        <div className="mt-5">
                          <FieldLabel htmlFor="bio">Bio</FieldLabel>
                          <textarea
                            id="bio"
                            value={bio}
                            onChange={e => setBio(e.target.value)}
                            rows={3}
                            className={inputClass + ' resize-y'}
                            placeholder="Tell venues who you are, what you sound like, and the kind of shows you play."
                          />
                        </div>
                      </div>
                      <div className="space-y-5">
                        <div className="grid grid-cols-2 gap-3 md:grid-cols-1">
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
                        <div className="rounded-xl bg-[#FFF4EF] p-4">
                          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#D95B2B]">First impression</p>
                          <p className="mt-1 text-xs leading-relaxed text-[#796C66]">A clear name, a memorable one-line story, and your home base help venues find the right fit fast.</p>
                        </div>
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
                      <p className="text-sm text-[#888888]">Help venues understand your music and how far you&apos;re willing to travel.</p>
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
                      <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
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

                    <div className="grid gap-7 md:grid-cols-2">
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
          </div>
        </main>
      </section>
      <div className="absolute right-5 top-5 z-20 hidden lg:block xl:right-8 xl:top-8">
        <NavAccountMenu showManageProfiles={false} />
      </div>
    </div>
  )
}
