'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { ImageCropModal } from '@/components/ui/ImageCropModal'
import type { Genre, Band } from '@/types/database'

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface ShowDateInput {
  show_date: string
  venue_name: string
  city: string
  state: string
  ticket_url: string
}

interface BandFormInitial {
  id: string
  name: string
  tagline: string
  location_city: string
  location_state: string
  description: string
  touring_radius: string
  website_url: string
  instagram_url: string
  spotify_url: string
  youtube_url: string
  bandcamp_url: string
  apple_music_url: string
  tiktok_url: string
  soundcloud_url: string
  facebook_url: string
  twitter_url: string
  members: string[]
  selectedGenreIds: string[]
  showDates: ShowDateInput[]
  profile_photo_url: string
  cover_photo_url: string
  featured_track_url: string
  artist_type: 'solo' | 'band' | ''
  set_length_min: string
}

interface BandFormProps {
  mode: 'create' | 'edit'
  userId: string
  genres: Genre[]
  initial?: Partial<BandFormInitial>
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

const TOURING_RADIUS_OPTIONS = [
  { value: 'local', label: 'Local (within ~100 mi)' },
  { value: 'regional', label: 'Regional (multi-state)' },
  { value: 'national', label: 'National' },
  { value: 'international', label: 'International' },
]

const SOCIAL_FIELDS: { key: keyof SocialFields; label: string; placeholder: string }[] = [
  { key: 'website_url', label: 'Website', placeholder: 'https://yourband.com' },
  { key: 'spotify_url', label: 'Spotify', placeholder: 'https://open.spotify.com/artist/...' },
  { key: 'apple_music_url', label: 'Apple Music', placeholder: 'https://music.apple.com/...' },
  { key: 'youtube_url', label: 'YouTube', placeholder: 'https://youtube.com/@...' },
  { key: 'soundcloud_url', label: 'SoundCloud', placeholder: 'https://soundcloud.com/...' },
  { key: 'bandcamp_url', label: 'Bandcamp', placeholder: 'https://yourband.bandcamp.com' },
  { key: 'instagram_url', label: 'Instagram', placeholder: 'https://instagram.com/...' },
  { key: 'tiktok_url', label: 'TikTok', placeholder: 'https://tiktok.com/@...' },
  { key: 'facebook_url', label: 'Facebook', placeholder: 'https://facebook.com/...' },
  { key: 'twitter_url', label: 'Twitter / X', placeholder: 'https://x.com/...' },
]

type SocialFields = Pick<
  BandFormInitial,
  | 'website_url'
  | 'spotify_url'
  | 'apple_music_url'
  | 'youtube_url'
  | 'soundcloud_url'
  | 'bandcamp_url'
  | 'instagram_url'
  | 'tiktok_url'
  | 'facebook_url'
  | 'twitter_url'
>

const emptyShowDate = (): ShowDateInput => ({
  show_date: '',
  venue_name: '',
  city: '',
  state: '',
  ticket_url: '',
})

async function uploadPhoto(
  supabase: ReturnType<typeof createClient>,
  file: File,
  bandId: string,
  type: 'profile' | 'cover'
): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `bands/${bandId}/${type}.${ext}`
  const { error } = await supabase.storage
    .from('band-images')
    .upload(path, file, { upsert: true })
  if (error) throw error
  const { data } = supabase.storage.from('band-images').getPublicUrl(path)
  return data.publicUrl
}

// ─────────────────────────────────────────────────────────────
// Shared UI
// ─────────────────────────────────────────────────────────────

const inputClass =
  'w-full rounded-xl border border-[#E2E2E2] bg-[#F7F7F7] px-4 py-3 text-sm text-[#252525] placeholder-[#A3A3A3] transition-colors focus:border-[#FD6A2F] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FD6A2F]/15'

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-5 text-sm font-semibold text-[#252525]">
      {children}
    </h2>
  )
}

function Label({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-[#626262]">
      {children}
    </label>
  )
}

// ─────────────────────────────────────────────────────────────
// Photo upload sub-component
// ─────────────────────────────────────────────────────────────

interface PhotoUploadProps {
  label: string
  existingUrl: string
  aspectClass: string
  radiusClass?: string
  aspect: number             // numeric ratio for cropper e.g. 1 or 3
  onFileSelect: (file: File, previewUrl: string) => void
  onRemove: () => void
  previewUrl: string | null
}

function PhotoUpload({
  label,
  existingUrl,
  aspectClass,
  radiusClass = 'rounded-xl',
  aspect,
  onFileSelect,
  onRemove,
  previewUrl,
}: PhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const displayUrl = previewUrl || existingUrl

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setCropSrc(URL.createObjectURL(file))
    // reset so same file can be re-selected
    e.target.value = ''
  }

  return (
    <>
      {cropSrc && (
        <ImageCropModal
          src={cropSrc}
          aspect={aspect}
          onComplete={(file, preview) => {
            setCropSrc(null)
            onFileSelect(file, preview)
          }}
          onCancel={() => setCropSrc(null)}
        />
      )}
      <div>
        <p className="text-sm text-[#777777] mb-2">{label}</p>
        <div
          className={`relative ${aspectClass} ${radiusClass} overflow-hidden bg-[#F5F5F5] border-2 border-dashed border-[#E8E8E8] cursor-pointer hover:border-[#FD6A2F] transition-colors group`}
          onClick={() => inputRef.current?.click()}
        >
          {displayUrl ? (
            <>
              <Image
                src={displayUrl}
                alt={label}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, 672px"
                unoptimized={!!previewUrl}
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="text-white text-sm font-medium">Change photo</span>
              </div>
            </>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-[#BBBBBB] group-hover:text-[#FD6A2F] transition-colors">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <span className="text-xs">Upload {label.toLowerCase()}</span>
            </div>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
        {displayUrl && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onRemove() }}
            className="mt-1.5 text-xs text-[#AAAAAA] hover:text-red-400 transition-colors"
          >
            Remove
          </button>
        )}
      </div>
    </>
  )
}

// ─────────────────────────────────────────────────────────────
// Form
// ─────────────────────────────────────────────────────────────

export function BandForm({ mode, userId, genres, initial = {} }: BandFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Basic fields
  const [name, setName] = useState(initial.name ?? '')
  const [tagline, setTagline] = useState(initial.tagline ?? '')
  const [city, setCity] = useState(initial.location_city ?? '')
  const [state, setState] = useState(initial.location_state ?? '')
  const [description, setDescription] = useState(initial.description ?? '')
  const [touringRadius, setTouringRadius] = useState(initial.touring_radius ?? '')
  const [artistType, setArtistType] = useState<'solo' | 'band' | ''>(initial.artist_type ?? '')
  const [setLengthMin, setSetLengthMin] = useState(initial.set_length_min ?? '')

  // Photos
  const [profileFile, setProfileFile] = useState<File | null>(null)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [profilePreview, setProfilePreview] = useState<string | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  // Track if user explicitly removed an existing photo
  const [removeProfile, setRemoveProfile] = useState(false)
  const [removeCover, setRemoveCover] = useState(false)

  function handleProfileSelect(file: File, previewUrl: string) {
    setProfileFile(file)
    setProfilePreview(previewUrl)
    setRemoveProfile(false)
  }

  function handleCoverSelect(file: File, previewUrl: string) {
    setCoverFile(file)
    setCoverPreview(previewUrl)
    setRemoveCover(false)
  }

  // Featured track
  const [featuredTrackUrl, setFeaturedTrackUrl] = useState((initial as { featured_track_url?: string }).featured_track_url ?? '')

  // Social fields
  const [socials, setSocials] = useState<SocialFields>({
    website_url: initial.website_url ?? '',
    spotify_url: initial.spotify_url ?? '',
    apple_music_url: initial.apple_music_url ?? '',
    youtube_url: initial.youtube_url ?? '',
    soundcloud_url: initial.soundcloud_url ?? '',
    bandcamp_url: initial.bandcamp_url ?? '',
    instagram_url: initial.instagram_url ?? '',
    tiktok_url: initial.tiktok_url ?? '',
    facebook_url: initial.facebook_url ?? '',
    twitter_url: initial.twitter_url ?? '',
  })

  // Genres
  const [selectedGenres, setSelectedGenres] = useState<Set<string>>(
    new Set(initial.selectedGenreIds ?? [])
  )

  // Members
  const [members, setMembers] = useState<string[]>(
    initial.members?.length ? initial.members : ['']
  )

  // Show dates
  const [showDates, setShowDates] = useState<ShowDateInput[]>(
    initial.showDates?.length ? initial.showDates : []
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

  function updateMember(index: number, value: string) {
    setMembers((prev) => prev.map((m, i) => (i === index ? value : m)))
  }

  function removeMember(index: number) {
    setMembers((prev) => prev.filter((_, i) => i !== index))
  }

  function updateShowDate(index: number, field: keyof ShowDateInput, value: string) {
    setShowDates((prev) =>
      prev.map((d, i) => (i === index ? { ...d, [field]: value } : d))
    )
  }

  function removeShowDate(index: number) {
    setShowDates((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setError('Band name is required.')
      return
    }

    setLoading(true)
    setError(null)
    const supabase = createClient()

    const bandPayload = {
      name: name.trim(),
      tagline: tagline.trim() || null,
      location_city: city.trim() || null,
      location_state: state.trim() || null,
      description: description.trim() || null,
      touring_radius: (touringRadius || null) as Band['touring_radius'],
      artist_type: (artistType || null) as Band['artist_type'],
      set_length_min: setLengthMin ? parseInt(String(setLengthMin), 10) : null,
      website_url: socials.website_url.trim() || null,
      instagram_url: socials.instagram_url.trim() || null,
      spotify_url: socials.spotify_url.trim() || null,
      youtube_url: socials.youtube_url.trim() || null,
      bandcamp_url: socials.bandcamp_url.trim() || null,
      apple_music_url: socials.apple_music_url.trim() || null,
      tiktok_url: socials.tiktok_url.trim() || null,
      soundcloud_url: socials.soundcloud_url.trim() || null,
      facebook_url: socials.facebook_url.trim() || null,
      twitter_url: socials.twitter_url.trim() || null,
      featured_track_url: featuredTrackUrl.trim() || null,
      members: members.map((m) => m.trim()).filter(Boolean),
    }

    const validDates = showDates.filter(
      (d) => d.show_date && d.venue_name.trim() && d.city.trim() && d.state.trim()
    )

    let bandId: string

    if (mode === 'create') {
      const slug = slugify(name.trim())
      const { data: band, error: insertError } = await supabase
        .from('bands')
        .insert({ ...bandPayload, user_id: userId, slug })
        .select('id')
        .single()

      if (insertError) {
        setError(
          insertError.code === '23505'
            ? 'A band with that name already exists. Try a slightly different name.'
            : insertError.message
        )
        setLoading(false)
        return
      }
      bandId = band.id
    } else {
      const { error: updateError } = await supabase
        .from('bands')
        .update(bandPayload)
        .eq('id', initial.id!)

      if (updateError) {
        setError(updateError.message)
        setLoading(false)
        return
      }
      bandId = initial.id!
    }

    // Upload photos and collect URL updates
    const photoUpdates: { profile_photo_url?: string | null; cover_photo_url?: string | null } = {}

    try {
      if (profileFile) {
        photoUpdates.profile_photo_url = await uploadPhoto(supabase, profileFile, bandId, 'profile')
      } else if (removeProfile) {
        photoUpdates.profile_photo_url = null
      }

      if (coverFile) {
        photoUpdates.cover_photo_url = await uploadPhoto(supabase, coverFile, bandId, 'cover')
      } else if (removeCover) {
        photoUpdates.cover_photo_url = null
      }
    } catch {
      setError('Photo upload failed. Your other changes were saved.')
      setLoading(false)
      router.push('/dashboard/bands')
      return
    }

    if (Object.keys(photoUpdates).length > 0) {
      await supabase.from('bands').update(photoUpdates).eq('id', bandId)
    }

    // Sync genres
    await supabase.from('band_genres').delete().eq('band_id', bandId)
    if (selectedGenres.size > 0) {
      await supabase.from('band_genres').insert(
        Array.from(selectedGenres).map((genre_id) => ({ band_id: bandId, genre_id }))
      )
    }

    // Sync show dates
    await supabase.from('band_show_dates').delete().eq('band_id', bandId)
    if (validDates.length > 0) {
      await supabase.from('band_show_dates').insert(
        validDates.map((d) => ({
          band_id: bandId,
          show_date: d.show_date,
          venue_name: d.venue_name.trim(),
          city: d.city.trim(),
          state: d.state.trim(),
          ticket_url: d.ticket_url.trim() || null,
        }))
      )
    }

    router.push('/dashboard/bands')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10 space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-[#E6E6E6] bg-white p-5 shadow-[0_14px_34px_rgba(20,20,20,0.04)] sm:p-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#A24A22]">Artist profile</p>
          <h1 className="text-3xl font-bold tracking-tight text-[#181818]">
            {mode === 'create' ? 'Add an artist' : 'Edit artist'}
          </h1>
          <p className="mt-2 text-sm text-[#777777]">Keep the profile complete so venues can evaluate fit quickly.</p>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex min-h-10 items-center justify-center rounded-xl bg-[#FD6A2F] px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#E55A22] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? 'Saving…' : mode === 'create' ? 'Create band' : 'Save changes'}
        </button>
      </div>

      {error && (
        <p className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg px-4 py-3 text-sm">
          {error}
        </p>
      )}

      {/* Photos */}
      <section>
        <SectionHeader>Photos</SectionHeader>
        <div className="space-y-5">
          <PhotoUpload
            label="Cover photo"
            existingUrl={removeCover ? '' : (initial.cover_photo_url ?? '')}
            aspectClass="aspect-[3/1]"
            radiusClass="rounded-xl"
            aspect={3}
            onFileSelect={handleCoverSelect}
            onRemove={() => { setCoverFile(null); setCoverPreview(null); setRemoveCover(true) }}
            previewUrl={coverPreview}
          />
          <div className="max-w-[160px]">
            <PhotoUpload
              label="Profile photo"
              existingUrl={removeProfile ? '' : (initial.profile_photo_url ?? '')}
              aspectClass="aspect-square"
              radiusClass="rounded-full"
              aspect={1}
              onFileSelect={handleProfileSelect}
              onRemove={() => { setProfileFile(null); setProfilePreview(null); setRemoveProfile(true) }}
              previewUrl={profilePreview}
            />
          </div>
        </div>
      </section>

      {/* Basic Info */}
      <section>
        <SectionHeader>Basic Info</SectionHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Artist name *</Label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className={inputClass}
              placeholder="The Midnight"
            />
          </div>
          <div>
            <Label htmlFor="tagline">Tagline</Label>
            <input
              id="tagline"
              type="text"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              className={inputClass}
              placeholder="Synth-pop from Los Angeles"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="city">Home city</Label>
              <input
                id="city"
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className={inputClass}
                placeholder="Los Angeles"
              />
            </div>
            <div>
              <Label htmlFor="state">State</Label>
              <input
                id="state"
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                className={inputClass}
                placeholder="CA"
                maxLength={2}
              />
            </div>
          </div>

          {/* Artist type + set length */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-[#777777] mb-2">Artist type</p>
              <div className="flex rounded-lg overflow-hidden border border-[#E8E8E8] w-fit">
                {(['', 'solo', 'band'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setArtistType(type)}
                    className={`text-sm px-4 py-2 transition-colors ${
                      artistType === type
                        ? 'bg-[#FD6A2F] text-white font-medium'
                        : 'bg-[#F5F5F5] text-[#777777] hover:text-[#252525]'
                    }`}
                  >
                    {type === '' ? 'Unset' : type === 'solo' ? 'Solo artist' : 'Band'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label htmlFor="setLength">Set length (minutes)</Label>
              <input
                id="setLength"
                type="number"
                min={1}
                max={240}
                value={setLengthMin}
                onChange={(e) => setSetLengthMin(e.target.value)}
                className={inputClass}
                placeholder="45"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="bio">Bio</Label>
            <textarea
              id="bio"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              className={inputClass + ' resize-y'}
              placeholder="Tell venues who you are, what you sound like, and what kind of shows you play."
            />
          </div>
        </div>
      </section>

      {/* Touring */}
      <section>
        <SectionHeader>Touring</SectionHeader>
        <div className="space-y-6">
          <div>
            <Label htmlFor="radius">Touring radius</Label>
            <select
              id="radius"
              value={touringRadius}
              onChange={(e) => setTouringRadius(e.target.value)}
              className={inputClass}
            >
              <option value="">Select radius…</option>
              {TOURING_RADIUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <p className="text-sm text-[#777777] mb-3">Genres</p>
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
          </div>
        </div>
      </section>

      {/* Featured Track */}
      <section>
        <SectionHeader>Featured Track</SectionHeader>
        <div>
          <Label htmlFor="featuredTrack">Spotify track, album, or playlist URL</Label>
          <input
            id="featuredTrack"
            type="url"
            value={featuredTrackUrl}
            onChange={(e) => setFeaturedTrackUrl(e.target.value)}
            className={inputClass}
            placeholder="https://open.spotify.com/track/…"
          />
          <p className="text-xs text-[#AAAAAA] mt-1.5">
            This will be embedded as a playable player on your public profile.
          </p>
        </div>
      </section>

      {/* Social Links */}
      <section>
        <SectionHeader>Social Links</SectionHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {SOCIAL_FIELDS.map(({ key, label, placeholder }) => (
            <div key={key}>
              <Label htmlFor={key}>{label}</Label>
              <input
                id={key}
                type="url"
                value={socials[key]}
                onChange={(e) => setSocials((prev) => ({ ...prev, [key]: e.target.value }))}
                className={inputClass}
                placeholder={placeholder}
              />
            </div>
          ))}
        </div>
      </section>

      {/* Band Members */}
      <section>
        <SectionHeader>Band Members</SectionHeader>
        <div className="space-y-2">
          {members.map((member, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="text"
                value={member}
                onChange={(e) => updateMember(i, e.target.value)}
                className={inputClass}
                placeholder="Name (instrument / role)"
              />
              <button
                type="button"
                onClick={() => removeMember(i)}
                className="text-[#CCCCCC] hover:text-red-400 transition-colors text-lg leading-none shrink-0"
                aria-label="Remove member"
              >
                ×
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setMembers((prev) => [...prev, ''])}
            className="text-sm text-[#888888] hover:text-[#FD6A2F] transition-colors mt-1"
          >
            + Add member
          </button>
        </div>
      </section>

      {/* Show Dates */}
      <section>
        <SectionHeader>Upcoming Shows</SectionHeader>
        <div className="space-y-3">
          {showDates.map((date, i) => (
            <div
              key={i}
              className="bg-[#FFFFFF] border border-[#E8E8E8] rounded-xl p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#888888]">Show {i + 1}</span>
                <button
                  type="button"
                  onClick={() => removeShowDate(i)}
                  className="text-sm text-[#CCCCCC] hover:text-red-400 transition-colors"
                >
                  Remove
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor={`date-${i}`}>Date *</Label>
                  <input
                    id={`date-${i}`}
                    type="date"
                    value={date.show_date}
                    onChange={(e) => updateShowDate(i, 'show_date', e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <Label htmlFor={`venue-${i}`}>Venue name *</Label>
                  <input
                    id={`venue-${i}`}
                    type="text"
                    value={date.venue_name}
                    onChange={(e) => updateShowDate(i, 'venue_name', e.target.value)}
                    className={inputClass}
                    placeholder="The Fillmore"
                  />
                </div>
                <div>
                  <Label htmlFor={`city-${i}`}>City *</Label>
                  <input
                    id={`city-${i}`}
                    type="text"
                    value={date.city}
                    onChange={(e) => updateShowDate(i, 'city', e.target.value)}
                    className={inputClass}
                    placeholder="San Francisco"
                  />
                </div>
                <div>
                  <Label htmlFor={`state-${i}`}>State *</Label>
                  <input
                    id={`state-${i}`}
                    type="text"
                    value={date.state}
                    onChange={(e) => updateShowDate(i, 'state', e.target.value)}
                    className={inputClass}
                    placeholder="CA"
                    maxLength={2}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor={`ticket-${i}`}>Ticket URL</Label>
                  <input
                    id={`ticket-${i}`}
                    type="url"
                    value={date.ticket_url}
                    onChange={(e) => updateShowDate(i, 'ticket_url', e.target.value)}
                    className={inputClass}
                    placeholder="https://..."
                  />
                </div>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setShowDates((prev) => [...prev, emptyShowDate()])}
            className="text-sm text-[#888888] hover:text-[#FD6A2F] transition-colors"
          >
            + Add show
          </button>
        </div>
      </section>

      {/* Bottom save */}
      {error && (
        <p className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg px-4 py-3 text-sm">
          {error}
        </p>
      )}
      <div className="flex justify-end pb-10">
        <button
          type="submit"
          disabled={loading}
          className="bg-[#FD6A2F] text-white font-semibold rounded-lg px-6 py-2.5 text-sm hover:bg-[#E55A22] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Saving…' : mode === 'create' ? 'Create band' : 'Save changes'}
        </button>
      </div>
    </form>
  )
}
