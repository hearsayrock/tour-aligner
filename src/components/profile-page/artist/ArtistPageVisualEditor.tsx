'use client'

import { useEffect, useMemo, useRef, useState, type CSSProperties, type ChangeEvent } from 'react'
import { ImageIcon, Link2, Music2, Palette, Plus, SlidersHorizontal, Trash2, Type, Upload, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ImageCropModal } from '@/components/ui/ImageCropModal'
import { ProfilePageLayoutEditor } from '@/components/profile-page/ProfilePageLayoutEditor'
import { ArtistPageHero } from '@/components/profile-page/artist/ArtistPageHero'
import {
  ARTIST_PAGE_SECTION_DEFINITIONS,
  getArtistProfileAppearance,
  type ArtistPageCustomization,
  type ArtistPageEditableContent,
  type ArtistPageImageChanges,
  type ArtistPageSectionId,
  type ArtistProfileAppearance,
  type ArtistProfileTheme,
} from '@/components/profile-page/artist/artist-page-config'
import type { ProfilePageLayout } from '@/components/profile-page/profile-page-types'
import {
  createArtistPageSections,
  type ArtistContentSection,
  type ArtistPageLyric,
  type ArtistPageShow,
} from '@/components/profile-page/artist/ArtistPageSections'
import type { Band, Genre } from '@/types/database'

type SaveResult = { success?: true; error?: string }
type ArtistImageType = 'profile' | 'cover' | 'background'
type ProfileFrameStyle = CSSProperties & {
  '--profile-accent': string
  '--profile-button-radius': string
}

const APPEARANCE_PRESETS = [
  { name: 'Stage light', accent: '#FD6A2F', background: 'paper' as const },
  { name: 'After dark', accent: '#E879F9', background: 'night' as const },
  { name: 'Pacific', accent: '#0E7490', background: 'mist' as const },
  { name: 'Lime light', accent: '#7AAE23', background: 'paper' as const },
]

const BUTTON_RADIUS: Record<ArtistProfileAppearance['buttonStyle'], string> = {
  rounded: '1rem',
  square: '0.375rem',
  pill: '9999px',
}

const CONTENT_SECTIONS: { id: ArtistContentSection; label: string; icon: typeof Type }[] = [
  { id: 'identity', label: 'Identity', icon: Type },
  { id: 'details', label: 'Details', icon: SlidersHorizontal },
  { id: 'music', label: 'Music', icon: Music2 },
  { id: 'links', label: 'Links', icon: Link2 },
  { id: 'lyrics', label: 'Lyrics', icon: Music2 },
]

const LINK_FIELDS: { key: keyof ArtistPageEditableContent; label: string; placeholder: string }[] = [
  { key: 'website_url', label: 'Website', placeholder: 'https://yourband.com' },
  { key: 'spotify_url', label: 'Spotify', placeholder: 'https://open.spotify.com/artist/...' },
  { key: 'apple_music_url', label: 'Apple Music', placeholder: 'https://music.apple.com/...' },
  { key: 'youtube_url', label: 'YouTube', placeholder: 'https://youtube.com/@...' },
  { key: 'soundcloud_url', label: 'SoundCloud', placeholder: 'https://soundcloud.com/...' },
  { key: 'bandcamp_url', label: 'Bandcamp', placeholder: 'https://yourband.bandcamp.com' },
  { key: 'instagram_url', label: 'Instagram', placeholder: 'https://instagram.com/...' },
  { key: 'tiktok_url', label: 'TikTok', placeholder: 'https://tiktok.com/@...' },
  { key: 'facebook_url', label: 'Facebook', placeholder: 'https://facebook.com/...' },
  { key: 'twitter_url', label: 'X', placeholder: 'https://x.com/...' },
]

function createEditableContent(band: Band, genreIds: string[], lyrics: ArtistPageLyric[]): ArtistPageEditableContent {
  return {
    name: band.name,
    tagline: band.tagline ?? '',
    description: band.description ?? '',
    location_city: band.location_city ?? '',
    location_state: band.location_state ?? '',
    touring_radius: band.touring_radius ?? '',
    artist_type: band.artist_type ?? '',
    set_length_min: band.set_length_min ? String(band.set_length_min) : '',
    featured_track_url: band.featured_track_url ?? '',
    website_url: band.website_url ?? '',
    instagram_url: band.instagram_url ?? '',
    spotify_url: band.spotify_url ?? '',
    youtube_url: band.youtube_url ?? '',
    bandcamp_url: band.bandcamp_url ?? '',
    apple_music_url: band.apple_music_url ?? '',
    tiktok_url: band.tiktok_url ?? '',
    soundcloud_url: band.soundcloud_url ?? '',
    facebook_url: band.facebook_url ?? '',
    twitter_url: band.twitter_url ?? '',
    genre_ids: genreIds,
    lyrics: lyrics.map(({ id, title, body }) => ({ id, title, body })),
  }
}

function contentEqual(left: ArtistPageEditableContent, right: ArtistPageEditableContent) {
  return JSON.stringify(left) === JSON.stringify(right)
}

function previewBand(band: Band, content: ArtistPageEditableContent): Band {
  const nullable = (value: string) => value.trim() || null
  return {
    ...band,
    name: content.name || 'Untitled artist',
    tagline: nullable(content.tagline),
    description: nullable(content.description),
    location_city: nullable(content.location_city),
    location_state: nullable(content.location_state),
    touring_radius: content.touring_radius || null,
    artist_type: content.artist_type || null,
    set_length_min: content.set_length_min ? Number(content.set_length_min) : null,
    featured_track_url: nullable(content.featured_track_url),
    website_url: nullable(content.website_url),
    instagram_url: nullable(content.instagram_url),
    spotify_url: nullable(content.spotify_url),
    youtube_url: nullable(content.youtube_url),
    bandcamp_url: nullable(content.bandcamp_url),
    apple_music_url: nullable(content.apple_music_url),
    tiktok_url: nullable(content.tiktok_url),
    soundcloud_url: nullable(content.soundcloud_url),
    facebook_url: nullable(content.facebook_url),
    twitter_url: nullable(content.twitter_url),
  }
}

function appearancesEqual(left: ArtistProfileAppearance, right: ArtistProfileAppearance) {
  return JSON.stringify(left) === JSON.stringify(right)
}

async function uploadArtistImage(file: File, bandId: string, type: ArtistImageType) {
  const supabase = createClient()
  const path = `bands/${bandId}/${type}.jpg`
  const { error } = await supabase.storage
    .from('band-images')
    .upload(path, file, { cacheControl: '3600', contentType: 'image/jpeg', upsert: true })
  if (error) throw error
  return supabase.storage.from('band-images').getPublicUrl(path).data.publicUrl
}

function AppearanceImageField({
  label,
  description,
  value,
  previewUrl,
  removed,
  aspect,
  aspectClass,
  onChange,
  onRemove,
}: {
  label: string
  description: string
  value: string | null
  previewUrl: string | null
  removed: boolean
  aspect: number
  aspectClass: string
  onChange: (file: File, previewUrl: string) => void
  onRemove: () => void
}) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const displayUrl = removed ? null : previewUrl ?? value

  function closeCrop() {
    if (cropSrc) URL.revokeObjectURL(cropSrc)
    setCropSrc(null)
  }

  function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setCropSrc(URL.createObjectURL(file))
  }

  return (
    <div>
      {cropSrc && (
        <ImageCropModal
          src={cropSrc}
          aspect={aspect}
          onComplete={(file, nextPreviewUrl) => {
            closeCrop()
            onChange(file, nextPreviewUrl)
          }}
          onCancel={closeCrop}
        />
      )}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[#252525]">{label}</p>
          <p className="mt-0.5 text-xs leading-5 text-[#777777]">{description}</p>
        </div>
        <ImageIcon className="mt-0.5 h-4 w-4 shrink-0 text-[#A24A22]" />
      </div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className={`group relative mt-3 block w-full overflow-hidden rounded-2xl border border-dashed border-[#D9D1CA] bg-[#F6F3EF] text-[#777777] transition-colors hover:border-[#FD6A2F] ${aspectClass}`}
      >
        {displayUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={displayUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-xs font-semibold">
            <Upload className="h-5 w-5" /> Choose image
          </span>
        )}
        <span className="absolute inset-0 flex items-center justify-center bg-black/45 text-xs font-bold text-white opacity-0 transition-opacity group-hover:opacity-100">
          Replace and crop
        </span>
      </button>
      <input ref={inputRef} type="file" accept="image/*" onChange={chooseFile} className="hidden" />
      {displayUrl && (
        <button type="button" onClick={onRemove} className="mt-2 inline-flex min-h-8 items-center gap-1.5 text-xs font-semibold text-[#9B3D2C] hover:text-[#75291D]">
          <Trash2 className="h-3.5 w-3.5" /> Remove
        </button>
      )}
    </div>
  )
}

function ContentInspector({
  content,
  setContent,
  availableGenres,
  activeSection,
  setActiveSection,
  dirty,
  onReset,
  onClose,
  advancedHref,
}: {
  content: ArtistPageEditableContent
  setContent: React.Dispatch<React.SetStateAction<ArtistPageEditableContent>>
  availableGenres: Pick<Genre, 'id' | 'name'>[]
  activeSection: ArtistContentSection
  setActiveSection: (section: ArtistContentSection) => void
  dirty: boolean
  onReset: () => void
  onClose: () => void
  advancedHref: string
}) {
  const fieldClass = 'mt-2 min-h-11 w-full rounded-xl border border-[#DDD5CE] bg-white px-3 text-sm text-[#333333] outline-none transition focus:border-[#FD6A2F] focus:ring-2 focus:ring-[#FD6A2F]/15'
  const labelClass = 'block text-sm font-semibold text-[#444444]'
  const update = <Key extends keyof ArtistPageEditableContent>(key: Key, value: ArtistPageEditableContent[Key]) => {
    setContent((current) => ({ ...current, [key]: value }))
  }

  function toggleGenre(id: string) {
    setContent((current) => {
      const selected = current.genre_ids.includes(id)
      if (!selected && current.genre_ids.length >= 3) return current
      return { ...current, genre_ids: selected ? current.genre_ids.filter((genreId) => genreId !== id) : [...current.genre_ids, id] }
    })
  }

  return (
    <div className="p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[#A24A22]"><Type className="h-4 w-4" /> Page content</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-[#171717]">Tell the artist&apos;s story</h2>
          <p className="mt-1 text-sm leading-6 text-[#777777]">Edits preview on the page immediately and publish with the main Save button.</p>
        </div>
        <button type="button" onClick={onClose} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[#777777] hover:bg-[#F2EEE9] hover:text-[#252525]" aria-label="Close content panel"><X className="h-4 w-4" /></button>
      </div>

      <div className="mt-6 flex gap-1 overflow-x-auto rounded-2xl bg-[#F2EEE9] p-1">
        {CONTENT_SECTIONS.map(({ id, label, icon: Icon }) => (
          <button key={id} type="button" onClick={() => setActiveSection(id)} className={`flex min-h-9 shrink-0 items-center gap-1.5 rounded-xl px-2.5 text-[11px] font-semibold ${activeSection === id ? 'bg-white text-[#252525] shadow-sm' : 'text-[#746961] hover:text-[#252525]'}`}>
            <Icon className="h-3.5 w-3.5" /> {label}
          </button>
        ))}
      </div>

      <div className="mt-7 space-y-5">
        {activeSection === 'identity' && (
          <>
            <label className={labelClass}>Artist name <span className="text-[#C2410C]">*</span><input value={content.name} maxLength={120} onChange={(event) => update('name', event.target.value)} className={fieldClass} /></label>
            <label className={labelClass}>Tagline<input value={content.tagline} maxLength={180} onChange={(event) => update('tagline', event.target.value)} placeholder="One line that captures the vibe" className={fieldClass} /></label>
            <label className={labelClass}>Bio<textarea value={content.description} maxLength={5000} rows={8} onChange={(event) => update('description', event.target.value)} placeholder="Tell fans and venues what makes this artist unforgettable." className={`${fieldClass} py-3 leading-6`} /></label>
          </>
        )}

        {activeSection === 'details' && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <label className={labelClass}>City<input value={content.location_city} maxLength={120} onChange={(event) => update('location_city', event.target.value)} className={fieldClass} /></label>
              <label className={labelClass}>State / region<input value={content.location_state} maxLength={120} onChange={(event) => update('location_state', event.target.value)} className={fieldClass} /></label>
            </div>
            <label className={labelClass}>Artist type<select value={content.artist_type} onChange={(event) => update('artist_type', event.target.value as ArtistPageEditableContent['artist_type'])} className={fieldClass}><option value="">Not listed</option><option value="solo">Solo artist</option><option value="band">Band</option></select></label>
            <label className={labelClass}>Touring radius<select value={content.touring_radius} onChange={(event) => update('touring_radius', event.target.value as ArtistPageEditableContent['touring_radius'])} className={fieldClass}><option value="">Not listed</option><option value="local">Local</option><option value="regional">Regional</option><option value="national">Nationwide</option><option value="international">Worldwide</option></select></label>
            <label className={labelClass}>Typical set length<input value={content.set_length_min} inputMode="numeric" onChange={(event) => { if (/^\d{0,3}$/.test(event.target.value)) update('set_length_min', event.target.value) }} placeholder="Minutes" className={fieldClass} /></label>
          </>
        )}

        {activeSection === 'music' && (
          <>
            <div>
              <p className={labelClass}>Genres <span className="font-normal text-[#888888]">(up to 3)</span></p>
              <div className="mt-3 flex flex-wrap gap-2">
                {availableGenres.map((genre) => {
                  const selected = content.genre_ids.includes(genre.id)
                  const disabled = !selected && content.genre_ids.length >= 3
                  return <button key={genre.id} type="button" disabled={disabled} onClick={() => toggleGenre(genre.id)} className={`min-h-9 rounded-full border px-3 text-xs font-semibold ${selected ? 'border-[#252525] bg-[#252525] text-white' : 'border-[#DED7D0] bg-white text-[#655B54] hover:border-[#BEB4AC] disabled:cursor-not-allowed disabled:opacity-35'}`}>{genre.name}</button>
                })}
              </div>
            </div>
            <label className={labelClass}>Featured Spotify track, album, playlist, or artist<input type="url" value={content.featured_track_url} onChange={(event) => update('featured_track_url', event.target.value)} placeholder="https://open.spotify.com/track/..." className={fieldClass} /></label>
          </>
        )}

        {activeSection === 'links' && LINK_FIELDS.map(({ key, label, placeholder }) => (
          <label key={key} className={labelClass}>{label}<input type="url" value={content[key] as string} onChange={(event) => update(key, event.target.value)} placeholder={placeholder} className={fieldClass} /></label>
        ))}

        {activeSection === 'lyrics' && (
          <>
            <p className="text-sm leading-6 text-[#777777]">Publish lyrics directly on the artist page. Incomplete entries are ignored when saving.</p>
            {content.lyrics.map((lyric, index) => (
              <div key={lyric.id ?? `new-${index}`} className="rounded-2xl border border-[#E5DED8] bg-[#FAF8F5] p-4">
                <div className="flex items-center justify-between gap-3"><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#766B63]">Song {index + 1}</p><button type="button" onClick={() => update('lyrics', content.lyrics.filter((_, lyricIndex) => lyricIndex !== index))} className="flex h-8 w-8 items-center justify-center rounded-lg text-[#9B3D2C] hover:bg-red-50" aria-label={`Remove lyric ${index + 1}`}><Trash2 className="h-4 w-4" /></button></div>
                <input value={lyric.title} maxLength={160} onChange={(event) => update('lyrics', content.lyrics.map((item, lyricIndex) => lyricIndex === index ? { ...item, title: event.target.value } : item))} placeholder="Song title" className={fieldClass} />
                <textarea value={lyric.body} maxLength={20000} rows={8} onChange={(event) => update('lyrics', content.lyrics.map((item, lyricIndex) => lyricIndex === index ? { ...item, body: event.target.value } : item))} placeholder="Paste lyrics here…" className={`${fieldClass} py-3 leading-6`} />
              </div>
            ))}
            <button type="button" onClick={() => update('lyrics', [...content.lyrics, { title: '', body: '' }])} className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[#CFC5BD] text-xs font-semibold text-[#655B54] hover:border-[#FD6A2F] hover:text-[#A84216]"><Plus className="h-4 w-4" /> Add lyrics</button>
          </>
        )}
      </div>

      <div className="mt-8 space-y-2 border-t border-[#EAE3DD] pt-6">
        <button type="button" onClick={onReset} disabled={!dirty} className="min-h-10 w-full rounded-xl border border-[#DCD3CC] text-xs font-semibold text-[#655B54] hover:border-[#B9AEA6] disabled:cursor-not-allowed disabled:opacity-40">Revert content changes</button>
        <a href={advancedHref} className="flex min-h-10 items-center justify-center text-xs font-semibold text-[#777777] hover:text-[#252525]">Open advanced Artist Studio</a>
      </div>
    </div>
  )
}

export function ArtistPageVisualEditor({
  band,
  selectedGenreIds,
  availableGenres,
  shows,
  lyrics,
  initialTheme,
  initialCoverImage,
  initialProfileImage,
  initialWallpaperImage,
  exitHref,
  editDetailsHref,
  saveAction,
}: {
  band: Band
  selectedGenreIds: string[]
  availableGenres: Pick<Genre, 'id' | 'name'>[]
  shows: ArtistPageShow[]
  lyrics: ArtistPageLyric[]
  initialTheme: ArtistProfileTheme
  initialCoverImage: string | null
  initialProfileImage: string | null
  initialWallpaperImage: string | null
  exitHref: string
  editDetailsHref: string
  saveAction: (customization: ArtistPageCustomization) => Promise<SaveResult>
}) {
  const initialAppearance = getArtistProfileAppearance(initialTheme)
  const [appearance, setAppearance] = useState(initialAppearance)
  const [savedAppearance, setSavedAppearance] = useState(initialAppearance)
  const [content, setContent] = useState(() => createEditableContent(band, selectedGenreIds, lyrics))
  const [savedContent, setSavedContent] = useState(() => createEditableContent(band, selectedGenreIds, lyrics))
  const [inspectorOpen, setInspectorOpen] = useState(true)
  const [inspectorMode, setInspectorMode] = useState<'appearance' | 'content'>('appearance')
  const [contentSection, setContentSection] = useState<ArtistContentSection>('identity')

  const [profileFile, setProfileFile] = useState<File | null>(null)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [backgroundFile, setBackgroundFile] = useState<File | null>(null)
  const [profilePreview, setProfilePreview] = useState<string | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [backgroundPreview, setBackgroundPreview] = useState<string | null>(null)
  const [profileRemoved, setProfileRemoved] = useState(false)
  const [coverRemoved, setCoverRemoved] = useState(false)
  const [backgroundRemoved, setBackgroundRemoved] = useState(false)
  const [profileImage, setProfileImage] = useState(initialProfileImage)
  const [coverImage, setCoverImage] = useState(initialCoverImage)
  const [wallpaperImage, setWallpaperImage] = useState(initialWallpaperImage)

  useEffect(() => () => {
    if (profilePreview) URL.revokeObjectURL(profilePreview)
  }, [profilePreview])
  useEffect(() => () => {
    if (coverPreview) URL.revokeObjectURL(coverPreview)
  }, [coverPreview])
  useEffect(() => () => {
    if (backgroundPreview) URL.revokeObjectURL(backgroundPreview)
  }, [backgroundPreview])

  const imagesDirty = !!profileFile || !!coverFile || !!backgroundFile || profileRemoved || coverRemoved || backgroundRemoved
  const appearanceDirty = !appearancesEqual(appearance, savedAppearance) || imagesDirty
  const contentDirty = !contentEqual(content, savedContent)
  const displayProfileImage = profileRemoved ? null : profilePreview ?? profileImage
  const displayCoverImage = coverRemoved ? '/concert-hero.jpg' : coverPreview ?? coverImage ?? '/concert-hero.jpg'
  const displayWallpaperImage = backgroundRemoved ? null : backgroundPreview ?? wallpaperImage
  const wallpaperBase = appearance.background === 'night' ? '23,21,27' : appearance.background === 'mist' ? '237,247,246' : '247,244,238'
  const pageBackground = appearance.background === 'night' ? '#17151B' : appearance.background === 'mist' ? '#EDF7F6' : '#F7F4EE'
  const overlayOpacity = 1 - (appearance.wallpaperOpacity / 100)
  const frameStyle: ProfileFrameStyle = {
    ...(displayWallpaperImage
      ? {
          backgroundImage: `linear-gradient(rgba(${wallpaperBase},${overlayOpacity}), rgba(${wallpaperBase},${overlayOpacity})), url("${displayWallpaperImage}")`,
          backgroundSize: 'cover',
          backgroundAttachment: 'fixed',
        }
      : { backgroundColor: pageBackground }),
    '--profile-accent': appearance.accent,
    '--profile-button-radius': BUTTON_RADIUS[appearance.buttonStyle],
  }
  const draftBand = useMemo(() => previewBand(band, content), [band, content])
  const draftGenreNames = useMemo(() => availableGenres.filter((genre) => content.genre_ids.includes(genre.id)).map((genre) => genre.name), [availableGenres, content.genre_ids])
  const draftLyrics = useMemo(() => content.lyrics
    .filter((lyric) => lyric.title.trim() && lyric.body.trim())
    .map((lyric, sort_order) => ({ id: lyric.id ?? `draft-${sort_order}`, title: lyric.title, body: lyric.body, sort_order })), [content.lyrics])

  function openAppearance() {
    setInspectorMode('appearance')
    setInspectorOpen(true)
  }

  function openContent(section: ArtistContentSection = 'identity') {
    setContentSection(section)
    setInspectorMode('content')
    setInspectorOpen(true)
  }

  const sections = createArtistPageSections({
    band: draftBand,
    shows,
    lyrics: draftLyrics,
    isOwner: true,
    isEditing: true,
    onEditContent: openContent,
  })

  function resetAppearance() {
    setAppearance(savedAppearance)
    setProfileFile(null)
    setCoverFile(null)
    setBackgroundFile(null)
    setProfilePreview(null)
    setCoverPreview(null)
    setBackgroundPreview(null)
    setProfileRemoved(false)
    setCoverRemoved(false)
    setBackgroundRemoved(false)
  }

  function resetContent() {
    setContent(savedContent)
  }

  async function saveCustomization(layout: ProfilePageLayout<ArtistPageSectionId>): Promise<SaveResult> {
    if (!content.name.trim()) return { error: 'Artist name is required.' }
    const urls = [{ key: 'featured_track_url' as const, label: 'Featured track' }, ...LINK_FIELDS.map(({ key, label }) => ({ key, label }))]
    for (const { key, label } of urls) {
      const value = content[key] as string
      if (!value.trim()) continue
      try {
        const url = new URL(value)
        if (url.protocol !== 'http:' && url.protocol !== 'https:') return { error: `${label} must use an http or https URL.` }
      } catch {
        return { error: `${label} must be a complete URL.` }
      }
    }
    try {
      const imageChanges: ArtistPageImageChanges = {}
      const uploads = await Promise.all([
        profileFile ? uploadArtistImage(profileFile, band.id, 'profile') : Promise.resolve(null),
        coverFile ? uploadArtistImage(coverFile, band.id, 'cover') : Promise.resolve(null),
        backgroundFile ? uploadArtistImage(backgroundFile, band.id, 'background') : Promise.resolve(null),
      ])

      if (profileFile) imageChanges.profile = 'replace'
      else if (profileRemoved) imageChanges.profile = 'remove'
      if (coverFile) imageChanges.cover = 'replace'
      else if (coverRemoved) imageChanges.cover = 'remove'
      if (backgroundFile) imageChanges.background = 'replace'
      else if (backgroundRemoved) imageChanges.background = 'remove'

      const result = await saveAction({ layout, appearance, imageChanges, content })
      if (result.error) return result

      const [nextProfileImage, nextCoverImage, nextWallpaperImage] = uploads
      if (imageChanges.profile === 'replace') setProfileImage(nextProfileImage)
      else if (imageChanges.profile === 'remove') setProfileImage(null)
      if (imageChanges.cover === 'replace' && nextCoverImage) setCoverImage(nextCoverImage)
      else if (imageChanges.cover === 'remove') setCoverImage('/concert-hero.jpg')
      if (imageChanges.background === 'replace') setWallpaperImage(nextWallpaperImage)
      else if (imageChanges.background === 'remove') setWallpaperImage(null)

      setSavedAppearance(appearance)
      setSavedContent(content)
      setProfileFile(null)
      setCoverFile(null)
      setBackgroundFile(null)
      setProfilePreview(null)
      setCoverPreview(null)
      setBackgroundPreview(null)
      setProfileRemoved(false)
      setCoverRemoved(false)
      setBackgroundRemoved(false)
      return result
    } catch {
      return { error: 'An image could not be uploaded. Please try again.' }
    }
  }

  const appearanceInspector = (
    <div className="space-y-7 p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[#A24A22]"><Palette className="h-4 w-4" /> Visual identity</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-[#171717]">Shape the first impression</h2>
          <p className="mt-1 text-sm leading-6 text-[#777777]">Every change previews live. Save when the page feels right.</p>
        </div>
        <button type="button" onClick={() => setInspectorOpen(false)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[#777777] hover:bg-[#F2EEE9] hover:text-[#252525]" aria-label="Close appearance panel">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-6">
        <AppearanceImageField
          label="Cover photo"
          description="The stage behind your artist identity."
          value={coverImage}
          previewUrl={coverPreview}
          removed={coverRemoved}
          aspect={3}
          aspectClass="aspect-[3/1]"
          onChange={(file, previewUrl) => { setCoverFile(file); setCoverPreview(previewUrl); setCoverRemoved(false) }}
          onRemove={() => { setCoverFile(null); setCoverPreview(null); setCoverRemoved(true) }}
        />
        <AppearanceImageField
          label="Profile photo"
          description="The recognizable face or mark of the artist."
          value={profileImage}
          previewUrl={profilePreview}
          removed={profileRemoved}
          aspect={1}
          aspectClass="aspect-square max-w-32"
          onChange={(file, previewUrl) => { setProfileFile(file); setProfilePreview(previewUrl); setProfileRemoved(false) }}
          onRemove={() => { setProfileFile(null); setProfilePreview(null); setProfileRemoved(true) }}
        />
        <AppearanceImageField
          label="Wallpaper"
          description="A subtle texture behind the entire profile."
          value={wallpaperImage}
          previewUrl={backgroundPreview}
          removed={backgroundRemoved}
          aspect={2}
          aspectClass="aspect-[2/1]"
          onChange={(file, previewUrl) => { setBackgroundFile(file); setBackgroundPreview(previewUrl); setBackgroundRemoved(false) }}
          onRemove={() => { setBackgroundFile(null); setBackgroundPreview(null); setBackgroundRemoved(true) }}
        />
      </div>

      <div className="border-t border-[#EAE3DD] pt-6">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#A24A22]">Atmosphere</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {APPEARANCE_PRESETS.map((preset) => (
            <button key={preset.name} type="button" onClick={() => setAppearance((current) => ({ ...current, accent: preset.accent, background: preset.background }))} className={`flex min-h-11 items-center gap-2 rounded-xl border px-3 text-left text-xs font-semibold ${appearance.accent === preset.accent && appearance.background === preset.background ? 'border-[#252525] bg-[#252525] text-white' : 'border-[#E5DED8] bg-white text-[#555555] hover:border-[#BEB4AC]'}`}>
              <span className="h-5 w-5 shrink-0 rounded-full border border-black/10" style={{ backgroundColor: preset.accent }} />
              {preset.name}
            </button>
          ))}
        </div>

        <label htmlFor="artist-accent" className="mt-5 block text-sm font-semibold text-[#444444]">Signature color</label>
        <div className="mt-2 flex gap-2">
          <input id="artist-accent" type="color" value={appearance.accent} onChange={(event) => setAppearance((current) => ({ ...current, accent: event.target.value.toUpperCase() }))} className="h-11 w-12 cursor-pointer rounded-xl border border-[#DDD5CE] bg-white p-1" />
          <input value={appearance.accent} onChange={(event) => { const value = event.target.value.toUpperCase(); if (/^#[0-9A-F]{0,6}$/.test(value)) setAppearance((current) => ({ ...current, accent: value })) }} maxLength={7} aria-label="Signature color hex value" className="min-w-0 flex-1 rounded-xl border border-[#DDD5CE] bg-white px-3 text-sm font-semibold text-[#444444]" />
        </div>

        <label htmlFor="artist-wallpaper-opacity" className="mt-5 flex items-center justify-between gap-3 text-sm font-semibold text-[#444444]">
          Wallpaper strength <output htmlFor="artist-wallpaper-opacity" className="text-xs text-[#A24A22]">{appearance.wallpaperOpacity}%</output>
        </label>
        <input id="artist-wallpaper-opacity" type="range" min="0" max="100" value={appearance.wallpaperOpacity} onChange={(event) => setAppearance((current) => ({ ...current, wallpaperOpacity: Number(event.target.value) }))} className="mt-3 w-full cursor-pointer" style={{ accentColor: appearance.accent }} />

        <p className="mt-5 text-sm font-semibold text-[#444444]">Link shape</p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {(['rounded', 'square', 'pill'] as const).map((style) => (
            <button key={style} type="button" onClick={() => setAppearance((current) => ({ ...current, buttonStyle: style }))} className={`min-h-10 border px-2 text-xs font-semibold capitalize ${style === 'pill' ? 'rounded-full' : style === 'square' ? 'rounded-md' : 'rounded-xl'} ${appearance.buttonStyle === style ? 'border-[#252525] bg-[#252525] text-white' : 'border-[#E5DED8] bg-white text-[#666666]'}`}>
              {style}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-[#E8E1DA] bg-[#F8F5F1] p-4">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[#6E625A]"><SlidersHorizontal className="h-3.5 w-3.5" /> Hero layout</p>
        <p className="mt-2 text-xs leading-5 text-[#777777]">Height and alignment remain under Page settings in the main toolbar.</p>
      </div>

      <button type="button" onClick={resetAppearance} disabled={!appearanceDirty} className="min-h-10 w-full rounded-xl border border-[#DCD3CC] text-xs font-semibold text-[#655B54] hover:border-[#B9AEA6] disabled:cursor-not-allowed disabled:opacity-40">
        Revert appearance changes
      </button>
      <button type="button" onClick={() => openContent()} className="min-h-10 w-full rounded-xl bg-[#252525] text-xs font-semibold text-white hover:bg-black">Edit page content</button>
    </div>
  )

  const contentInspector = (
    <ContentInspector
      content={content}
      setContent={setContent}
      availableGenres={availableGenres}
      activeSection={contentSection}
      setActiveSection={setContentSection}
      dirty={contentDirty}
      onReset={resetContent}
      onClose={() => setInspectorOpen(false)}
      advancedHref={editDetailsHref}
    />
  )

  const inspector = inspectorMode === 'appearance' ? appearanceInspector : contentInspector

  return (
    <ProfilePageLayoutEditor
      initialLayout={initialTheme.layout}
      definitions={ARTIST_PAGE_SECTION_DEFINITIONS}
      sections={sections}
      hero={(
        <ArtistPageHero
          band={draftBand}
          genreNames={draftGenreNames}
          isOwner
          isEditing
          appearance={appearance}
          coverImage={displayCoverImage}
          profileImage={displayProfileImage}
          editContentControl={(
            <button type="button" onClick={() => openContent()} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/20 bg-black/30 px-4 text-sm font-semibold text-white backdrop-blur transition-colors hover:bg-black/45">
              <Type className="h-4 w-4" /> Edit content
            </button>
          )}
          editAppearanceControl={(
            <button type="button" onClick={openAppearance} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/20 bg-black/30 px-4 text-sm font-semibold text-white backdrop-blur transition-colors hover:bg-black/45">
              <Palette className="h-4 w-4" /> Edit appearance
            </button>
          )}
        />
      )}
      style={frameStyle}
      exitHref={exitHref}
      editDetailsHref={editDetailsHref}
      onEditDetails={() => openContent()}
      saveAction={saveCustomization}
      externalDirty={appearanceDirty || contentDirty}
      inspector={inspector}
      inspectorOpen={inspectorOpen}
      onOpenInspector={() => inspectorMode === 'appearance' ? openContent() : openAppearance()}
      inspectorLabel={inspectorMode === 'appearance' ? 'Content' : 'Appearance'}
      editableSectionIds={['overview', 'featured-track', 'lyrics', 'streaming-links', 'social-links', 'profile-management']}
      onEditSection={(sectionId) => {
        const contentSectionByPageSection: Partial<Record<ArtistPageSectionId, ArtistContentSection>> = {
          overview: 'details',
          'featured-track': 'music',
          lyrics: 'lyrics',
          'streaming-links': 'links',
          'social-links': 'links',
          'profile-management': 'identity',
        }
        openContent(contentSectionByPageSection[sectionId] ?? 'identity')
      }}
    />
  )
}
