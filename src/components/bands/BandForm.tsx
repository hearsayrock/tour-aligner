'use client'

import { useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Eye, Palette, Plus, Search, Sparkles, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ImageCropModal } from '@/components/ui/ImageCropModal'
import { ProcessingOverlay } from '@/components/ui/ProcessingOverlay'
import type { Genre, Band, Json } from '@/types/database'

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

interface LyricInput {
  title: string
  body: string
}

interface BandFormInitial {
  id: string
  slug: string
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
  lyrics: LyricInput[]
  profile_photo_url: string
  cover_photo_url: string
  profile_background_url: string
  profile_theme: Json
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

const APPEARANCE_PRESETS = [
  { name: 'Sunset', accent: '#FD6A2F', background: 'paper' as const },
  { name: 'Electric', accent: '#6D5EF9', background: 'night' as const },
  { name: 'Ocean', accent: '#00A6A6', background: 'mist' as const },
  { name: 'Lime light', accent: '#7AAE23', background: 'paper' as const },
]

type ProfileTheme = {
  accent: string
  background: 'paper' | 'night' | 'mist'
  buttonStyle: 'rounded' | 'square' | 'pill'
  wallpaperOpacity: number
}

const DEFAULT_THEME: ProfileTheme = {
  accent: '#FD6A2F',
  background: 'paper',
  buttonStyle: 'rounded',
  wallpaperOpacity: 12,
}

function parseProfileTheme(value: Json | undefined): ProfileTheme {
  if (!value || Array.isArray(value) || typeof value !== 'object') return DEFAULT_THEME
  const candidate = value as Record<string, Json | undefined>
  const accent = typeof candidate.accent === 'string' && /^#[0-9A-Fa-f]{6}$/.test(candidate.accent)
    ? candidate.accent.toUpperCase()
    : DEFAULT_THEME.accent
  const background = candidate.background === 'night' || candidate.background === 'mist' || candidate.background === 'paper'
    ? candidate.background
    : DEFAULT_THEME.background
  const buttonStyle = candidate.buttonStyle === 'square' || candidate.buttonStyle === 'pill' || candidate.buttonStyle === 'rounded'
    ? candidate.buttonStyle
    : DEFAULT_THEME.buttonStyle
  const wallpaperOpacity = typeof candidate.wallpaperOpacity === 'number'
    ? Math.round(Math.min(100, Math.max(0, candidate.wallpaperOpacity)))
    : DEFAULT_THEME.wallpaperOpacity
  return { accent, background, buttonStyle, wallpaperOpacity }
}

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

const emptyLyric = (): LyricInput => ({ title: '', body: '' })

async function uploadPhoto(
  supabase: ReturnType<typeof createClient>,
  file: File,
  bandId: string,
  type: 'profile' | 'cover' | 'background'
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
    <h2 className="text-lg font-semibold tracking-tight text-[#171717]">
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

function GenrePicker({
  genres,
  selectedGenres,
  onAdd,
  onRemove,
}: {
  genres: Genre[]
  selectedGenres: Set<string>
  onAdd: (id: string) => void
  onRemove: (id: string) => void
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const selected = genres.filter((genre) => selectedGenres.has(genre.id))
  const matches = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return genres
      .filter((genre) => !selectedGenres.has(genre.id))
      .filter((genre) => !normalized || genre.name.toLowerCase().includes(normalized))
      .slice(0, 6)
  }, [genres, query, selectedGenres])
  const isAtLimit = selectedGenres.size >= 3

  function choose(id: string) {
    onAdd(id)
    setQuery('')
    setOpen(false)
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <Label htmlFor="genre-search">Your sound</Label>
        <span className={`text-xs font-semibold ${isAtLimit ? 'text-[#B24B26]' : 'text-[#8A8A8A]'}`}>
          {selectedGenres.size}/3 selected
        </span>
      </div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8A8A8A]" />
        <input
          id="genre-search"
          type="text"
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(event) => { setQuery(event.target.value); setOpen(true) }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && matches[0] && !isAtLimit) {
              event.preventDefault()
              choose(matches[0].id)
            }
            if (event.key === 'Escape') setOpen(false)
          }}
          disabled={isAtLimit}
          className={`${inputClass} pl-11 disabled:cursor-not-allowed disabled:opacity-60`}
          placeholder={isAtLimit ? 'Remove a genre to make a change' : 'Start typing a genre…'}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open && !isAtLimit}
          aria-controls="genre-options"
        />
        {open && !isAtLimit && matches.length > 0 && (
          <div id="genre-options" role="listbox" className="absolute z-20 mt-2 w-full overflow-hidden rounded-2xl border border-[#E7DED7] bg-white p-1.5 shadow-[0_18px_38px_rgba(33,24,18,0.14)]">
            {matches.map((genre) => (
              <button
                key={genre.id}
                type="button"
                role="option"
                aria-selected="false"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(genre.id)}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-medium text-[#303030] transition-colors hover:bg-[#FFF2EB] hover:text-[#A84216]"
              >
                {genre.name}
                <Plus className="h-4 w-4" />
              </button>
            ))}
          </div>
        )}
      </div>
      {selected.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {selected.map((genre) => (
            <button
              key={genre.id}
              type="button"
              onClick={() => onRemove(genre.id)}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-[#252525] px-3 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5"
            >
              {genre.name}
              <X className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="sr-only">Remove {genre.name}</span>
            </button>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-xs leading-5 text-[#888888]">Choose up to three genres so venues can understand where you fit.</p>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Form
// ─────────────────────────────────────────────────────────────

export function BandForm({ mode, userId, genres, initial = {} }: BandFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [nameChangeDialogOpen, setNameChangeDialogOpen] = useState(false)
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
  const [backgroundFile, setBackgroundFile] = useState<File | null>(null)
  const [profilePreview, setProfilePreview] = useState<string | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [backgroundPreview, setBackgroundPreview] = useState<string | null>(null)
  // Track if user explicitly removed an existing photo
  const [removeProfile, setRemoveProfile] = useState(false)
  const [removeCover, setRemoveCover] = useState(false)
  const [removeBackground, setRemoveBackground] = useState(false)
  const [profileTheme, setProfileTheme] = useState<ProfileTheme>(() => parseProfileTheme(initial.profile_theme))

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

  function handleBackgroundSelect(file: File, previewUrl: string) {
    setBackgroundFile(file)
    setBackgroundPreview(previewUrl)
    setRemoveBackground(false)
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
  const [lyrics, setLyrics] = useState<LyricInput[]>(initial.lyrics ?? [])

  function addGenre(id: string) {
    setSelectedGenres((prev) => {
      if (prev.has(id) || prev.size >= 3) return prev
      const next = new Set(prev)
      next.add(id)
      return next
    })
  }

  function removeGenre(id: string) {
    setSelectedGenres((prev) => {
      const next = new Set(prev)
      next.delete(id)
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

  function updateLyric(index: number, field: keyof LyricInput, value: string) {
    setLyrics((prev) => prev.map((lyric, i) => (i === index ? { ...lyric, [field]: value } : lyric)))
  }

  function removeLyric(index: number) {
    setLyrics((prev) => prev.filter((_, i) => i !== index))
  }

  const publicPreviewHref = initial.slug
    ? `/bands/${initial.slug}?draft=${encodeURIComponent(JSON.stringify({
        name,
        tagline,
        description,
        location_city: city,
        location_state: state,
        touring_radius: touringRadius || null,
        artist_type: artistType || null,
        set_length_min: setLengthMin ? parseInt(setLengthMin, 10) : null,
        featured_track_url: featuredTrackUrl,
        profile_theme: profileTheme,
        genre_names: genres.filter((genre) => selectedGenres.has(genre.id)).map((genre) => genre.name),
        ...socials,
      }))}`
    : null

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
      profile_theme: profileTheme,
    }

    const validDates = showDates.filter(
      (d) => d.show_date && d.venue_name.trim() && d.city.trim() && d.state.trim()
    )
    const validLyrics = lyrics.filter((lyric) => lyric.title.trim() && lyric.body.trim())

    let bandId: string

    if (mode === 'create') {
      const { data: band, error: insertError } = await supabase
        .from('bands')
        .insert({ ...bandPayload, user_id: userId, slug: slugify(name.trim()) })
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
    const photoUpdates: { profile_photo_url?: string | null; cover_photo_url?: string | null; profile_background_url?: string | null } = {}

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

      if (backgroundFile) {
        photoUpdates.profile_background_url = await uploadPhoto(supabase, backgroundFile, bandId, 'background')
      } else if (removeBackground) {
        photoUpdates.profile_background_url = null
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

    await supabase.from('band_lyrics').delete().eq('band_id', bandId)
    if (validLyrics.length > 0) {
      await supabase.from('band_lyrics').insert(
        validLyrics.map((lyric, sort_order) => ({
          band_id: bandId,
          title: lyric.title.trim(),
          body: lyric.body.trim(),
          sort_order,
        }))
      )
    }

    router.push('/dashboard/bands')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-7xl space-y-6 px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
      {(loading || cancelling) && <ProcessingOverlay />}
      <header className="relative overflow-hidden rounded-[28px] bg-[#1C1816] px-6 py-7 text-white shadow-[0_20px_60px_rgba(35,20,12,0.18)] sm:px-8 sm:py-9">
        <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-[#FD6A2F]/35 blur-3xl" />
        <div className="absolute -bottom-24 left-1/3 h-52 w-52 rounded-full bg-[#FAE4D7]/10 blur-3xl" />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#FFB99A]"><Sparkles className="h-3.5 w-3.5" /> Artist studio</p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{mode === 'create' ? 'Build your artist page' : 'Make your artist page unforgettable'}</h1>
            <p className="mt-3 text-sm leading-6 text-white/70">This is the page venues see first. Shape the story, sound, and visual world that make you a fit.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => { setCancelling(true); router.push('/dashboard/bands') }} disabled={loading || cancelling} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/25 bg-transparent px-4 py-2.5 text-sm font-bold text-white/82 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50">Cancel</button>
            {mode === 'edit' && publicPreviewHref && <a href={publicPreviewHref} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-white/20"><Eye className="h-4 w-4" /> View public page</a>}
            <button type="submit" disabled={loading} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-[#221814] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50">
              {loading ? 'Saving…' : mode === 'create' ? 'Create artist page' : 'Save changes'}
            </button>
          </div>
        </div>
      </header>

      {error && (
        <p className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg px-4 py-3 text-sm">
          {error}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <div className="space-y-6">
          <section className="rounded-[28px] border border-[#EAE3DD] bg-white p-5 shadow-[0_12px_32px_rgba(32,22,16,0.04)] sm:p-7">
            <div className="mb-6"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#A24A22]">The essentials</p><SectionHeader>Tell venues who they&apos;re booking</SectionHeader></div>
            <div className="space-y-4">
          <div>
            <div className="mb-1.5 flex items-center justify-between gap-3">
              <Label htmlFor="name">Artist name *</Label>
              {mode === 'edit' && (
                <button
                  type="button"
                  onClick={() => setNameChangeDialogOpen(true)}
                  className="text-xs font-medium text-[#888888] underline-offset-2 transition-colors hover:text-[#A24A22] hover:underline"
                >
                  Request name change
                </button>
              )}
            </div>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={mode === 'edit'}
              className={`${inputClass} disabled:cursor-not-allowed disabled:border-[#E6E1DD] disabled:bg-[#F3F1EF] disabled:text-[#69635F]`}
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="mb-1.5 text-sm font-medium text-[#626262]">Artist type</p>
              <div className="flex overflow-hidden rounded-xl border border-[#E8E8E8]">
                {(['', 'solo', 'band'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setArtistType(type)}
                    className={`text-sm px-4 py-2 transition-colors ${
                      artistType === type
                        ? 'bg-[#252525] text-white font-medium'
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

          <div className="pt-1">
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

          <section className="rounded-[28px] border border-[#EAE3DD] bg-white p-5 shadow-[0_12px_32px_rgba(32,22,16,0.04)] sm:p-7">
            <div className="mb-6"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#A24A22]">Booking signal</p><SectionHeader>Make your fit instantly clear</SectionHeader></div>
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
              <GenrePicker genres={genres} selectedGenres={selectedGenres} onAdd={addGenre} onRemove={removeGenre} />
            </div>
          </section>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-6">
          <section className="overflow-hidden rounded-[28px] border border-[#EAE3DD] bg-white shadow-[0_12px_32px_rgba(32,22,16,0.04)]">
            <div className="border-b border-[#F0EAE5] px-5 py-5"><p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#A24A22]"><Palette className="h-3.5 w-3.5" /> Visual identity</p><h2 className="mt-2 text-lg font-semibold tracking-tight text-[#171717]">Set the mood</h2><p className="mt-1 text-sm leading-5 text-[#777777]">A consistent look makes your page feel intentional.</p></div>
            <div className="space-y-5 p-5">
              <div className="overflow-hidden rounded-2xl bg-[#1D1A18] p-4 text-white" style={{ backgroundColor: profileTheme.background === 'night' ? '#15131B' : profileTheme.background === 'mist' ? '#183E49' : '#2D2420' }}>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/60">Live direction</p>
                <div className="mt-7 flex items-end gap-3"><div className="h-12 w-12 rounded-xl border border-white/20 bg-white/15" /><div><p className="text-lg font-bold">{name || 'Your artist name'}</p><p className="text-xs text-white/65">{tagline || 'Your unmistakable vibe'}</p></div></div>
                <button type="button" className={`mt-5 px-3 py-2 text-xs font-bold text-white ${profileTheme.buttonStyle === 'pill' ? 'rounded-full' : profileTheme.buttonStyle === 'square' ? 'rounded-md' : 'rounded-xl'}`} style={{ backgroundColor: profileTheme.accent }}>Listen now</button>
              </div>
              <div><Label htmlFor="accent-color">Signature color</Label><div className="flex gap-2"><input id="accent-color" type="color" value={profileTheme.accent} onChange={(event) => setProfileTheme((theme) => ({ ...theme, accent: event.target.value.toUpperCase() }))} className="h-11 w-12 cursor-pointer rounded-xl border border-[#E2E2E2] bg-[#F7F7F7] p-1" /><input value={profileTheme.accent} onChange={(event) => { const value = event.target.value.toUpperCase(); if (/^#[0-9A-F]{0,6}$/.test(value)) setProfileTheme((theme) => ({ ...theme, accent: value })) }} className={inputClass} maxLength={7} aria-label="Signature color hex value" /></div></div>
              <div><p className="mb-2 text-sm font-medium text-[#626262]">Page atmosphere</p><div className="grid grid-cols-2 gap-2">{APPEARANCE_PRESETS.map((preset) => <button key={preset.name} type="button" onClick={() => setProfileTheme((theme) => ({ ...theme, accent: preset.accent, background: preset.background }))} className={`flex items-center gap-2 rounded-xl border p-2 text-left text-xs font-semibold ${profileTheme.accent === preset.accent && profileTheme.background === preset.background ? 'border-[#252525] bg-[#FAF8F6]' : 'border-[#E8E8E8] hover:border-[#C8C0BA]'}`}><span className="h-5 w-5 rounded-full" style={{ backgroundColor: preset.accent }} />{preset.name}</button>)}</div></div>
              <div><p className="mb-2 text-sm font-medium text-[#626262]">Link style</p><div className="grid grid-cols-3 gap-2">{(['rounded', 'square', 'pill'] as const).map((style) => <button key={style} type="button" onClick={() => setProfileTheme((theme) => ({ ...theme, buttonStyle: style }))} className={`min-h-10 border text-xs font-semibold capitalize ${style === 'pill' ? 'rounded-full' : style === 'square' ? 'rounded-md' : 'rounded-xl'} ${profileTheme.buttonStyle === style ? 'border-[#252525] bg-[#252525] text-white' : 'border-[#E8E8E8] text-[#777777]'}`}>{style}</button>)}</div></div>
              <PhotoUpload label="Backdrop / wallpaper" existingUrl={removeBackground ? '' : (initial.profile_background_url ?? '')} aspectClass="aspect-[16/8]" aspect={2} onFileSelect={handleBackgroundSelect} onRemove={() => { setBackgroundFile(null); setBackgroundPreview(null); setRemoveBackground(true) }} previewUrl={backgroundPreview} />
              <div>
                <div className="mb-2 flex items-center justify-between gap-3"><Label htmlFor="wallpaper-opacity">Wallpaper opacity</Label><output htmlFor="wallpaper-opacity" className="text-xs font-semibold text-[#A24A22]">{profileTheme.wallpaperOpacity}%</output></div>
                <input id="wallpaper-opacity" type="range" min="0" max="100" step="1" value={profileTheme.wallpaperOpacity} onChange={(event) => setProfileTheme((theme) => ({ ...theme, wallpaperOpacity: Number(event.target.value) }))} className="w-full cursor-pointer" style={{ accentColor: profileTheme.accent }} />
                <p className="mt-1.5 text-xs leading-5 text-[#777777]">Lower keeps the wallpaper subtle; higher lets the image take over.</p>
              </div>
            </div>
          </section>
        </aside>
      </div>

      <section className="rounded-[28px] border border-[#EAE3DD] bg-white p-5 shadow-[0_12px_32px_rgba(32,22,16,0.04)] sm:p-7">
        <div className="mb-5"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#A24A22]">Profile imagery</p><SectionHeader>Give your page a face and a stage</SectionHeader></div>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_180px]">
          <PhotoUpload label="Cover photo" existingUrl={removeCover ? '' : (initial.cover_photo_url ?? '')} aspectClass="aspect-[4/1]" aspect={3} onFileSelect={handleCoverSelect} onRemove={() => { setCoverFile(null); setCoverPreview(null); setRemoveCover(true) }} previewUrl={coverPreview} />
          <PhotoUpload label="Profile photo" existingUrl={removeProfile ? '' : (initial.profile_photo_url ?? '')} aspectClass="aspect-square" radiusClass="rounded-3xl" aspect={1} onFileSelect={handleProfileSelect} onRemove={() => { setProfileFile(null); setProfilePreview(null); setRemoveProfile(true) }} previewUrl={profilePreview} />
        </div>
      </section>

      {/* Featured Track */}
      <section className="rounded-[28px] border border-[#EAE3DD] bg-white p-5 shadow-[0_12px_32px_rgba(32,22,16,0.04)] sm:p-7">
        <div className="mb-5"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#A24A22]">First listen</p><SectionHeader>Feature the track that sells the room</SectionHeader></div>
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

      {/* Lyrics */}
      <details className="group rounded-2xl border border-[#EAE3DD] bg-white px-5 py-1 shadow-[0_10px_24px_rgba(32,22,16,0.03)] sm:px-7">
        <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4"><div><SectionHeader>Lyrics</SectionHeader><p className="mt-1 text-sm text-[#777777]">Optional — share the words behind your music.</p></div><span className="text-xl text-[#888888] transition-transform group-open:rotate-45">+</span></summary>
        <div className="border-t border-[#F0EAE5] py-5">
        <p className="mb-4 text-sm text-[#777777]">Publish song lyrics for visitors to read on your public artist profile.</p>
        <div className="space-y-4">
          {lyrics.map((lyric, i) => (
            <div key={i} className="rounded-xl border border-[#E8E8E8] bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor={`lyric-title-${i}`}>Song title</Label>
                <button type="button" onClick={() => removeLyric(i)} className="text-sm text-[#AAAAAA] hover:text-red-400">
                  Remove
                </button>
              </div>
              <input
                id={`lyric-title-${i}`}
                value={lyric.title}
                onChange={(e) => updateLyric(i, 'title', e.target.value)}
                className={inputClass}
                placeholder="Song title"
              />
              <Label htmlFor={`lyric-body-${i}`}><span className="mt-4 block">Lyrics</span></Label>
              <textarea
                id={`lyric-body-${i}`}
                value={lyric.body}
                onChange={(e) => updateLyric(i, 'body', e.target.value)}
                rows={8}
                className={`${inputClass} resize-y font-mono leading-6`}
                placeholder="Paste your lyrics here…"
              />
            </div>
          ))}
          <button type="button" onClick={() => setLyrics((prev) => [...prev, emptyLyric()])} className="text-sm text-[#888888] hover:text-[#FD6A2F]">
            + Add lyrics
          </button>
        </div>
        </div>
      </details>

      {/* Social Links */}
      <details className="group rounded-2xl border border-[#EAE3DD] bg-white px-5 py-1 shadow-[0_10px_24px_rgba(32,22,16,0.03)] sm:px-7">
        <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4"><div><SectionHeader>Links & listening</SectionHeader><p className="mt-1 text-sm text-[#777777]">Optional — give venues and fans the right next click.</p></div><span className="text-xl text-[#888888] transition-transform group-open:rotate-45">+</span></summary>
        <div className="grid grid-cols-1 gap-4 border-t border-[#F0EAE5] py-5 sm:grid-cols-2">
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
      </details>

      {/* Band Members */}
      <details className="group rounded-2xl border border-[#EAE3DD] bg-white px-5 py-1 shadow-[0_10px_24px_rgba(32,22,16,0.03)] sm:px-7">
        <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4"><div><SectionHeader>Members</SectionHeader><p className="mt-1 text-sm text-[#777777]">Optional — introduce the people on stage.</p></div><span className="text-xl text-[#888888] transition-transform group-open:rotate-45">+</span></summary>
        <div className="space-y-2 border-t border-[#F0EAE5] py-5">
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
      </details>

      {/* Show Dates */}
      <details className="group rounded-2xl border border-[#EAE3DD] bg-white px-5 py-1 shadow-[0_10px_24px_rgba(32,22,16,0.03)] sm:px-7">
        <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4"><div><SectionHeader>Upcoming shows</SectionHeader><p className="mt-1 text-sm text-[#777777]">Optional — share dates you want fans to find.</p></div><span className="text-xl text-[#888888] transition-transform group-open:rotate-45">+</span></summary>
        <div className="space-y-3 border-t border-[#F0EAE5] py-5">
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
      </details>

      {mode === 'edit' && nameChangeDialogOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#17120F]/35 p-4 backdrop-blur-sm"
          onMouseDown={() => setNameChangeDialogOpen(false)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="name-change-dialog-title"
            className="w-full max-w-md rounded-3xl border border-[#EAE3DD] bg-white p-6 shadow-[0_24px_70px_rgba(28,19,14,0.28)]"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <h2 id="name-change-dialog-title" className="text-xl font-bold tracking-tight text-[#171717]">Request name change</h2>
            <p className="mt-3 text-sm leading-6 text-[#626262]">
              Please email <a href="mailto:support@touraligner.com" className="font-semibold text-[#A24A22] underline underline-offset-2">support@touraligner.com</a> to request a name change.
            </p>
            <div className="mt-6 flex justify-end">
              <button type="button" onClick={() => setNameChangeDialogOpen(false)} className="rounded-xl bg-[#252525] px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-black">Close</button>
            </div>
          </section>
        </div>
      )}

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
          className="rounded-xl bg-[#252525] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? 'Saving…' : mode === 'create' ? 'Create band' : 'Save changes'}
        </button>
      </div>
    </form>
  )
}
