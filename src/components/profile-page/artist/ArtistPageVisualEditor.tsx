'use client'

import { useEffect, useRef, useState, type CSSProperties, type ChangeEvent } from 'react'
import { ImageIcon, Palette, SlidersHorizontal, Trash2, Upload, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ImageCropModal } from '@/components/ui/ImageCropModal'
import { ProfilePageLayoutEditor } from '@/components/profile-page/ProfilePageLayoutEditor'
import { ArtistPageHero } from '@/components/profile-page/artist/ArtistPageHero'
import {
  ARTIST_PAGE_SECTION_DEFINITIONS,
  getArtistProfileAppearance,
  type ArtistPageCustomization,
  type ArtistPageImageChanges,
  type ArtistPageSectionId,
  type ArtistProfileAppearance,
  type ArtistProfileTheme,
} from '@/components/profile-page/artist/artist-page-config'
import type { ProfilePageLayout, ProfilePageSectionContent } from '@/components/profile-page/profile-page-types'
import type { Band } from '@/types/database'

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

export function ArtistPageVisualEditor({
  band,
  genreNames,
  sections,
  initialTheme,
  initialCoverImage,
  initialProfileImage,
  initialWallpaperImage,
  exitHref,
  editDetailsHref,
  saveAction,
}: {
  band: Band
  genreNames: string[]
  sections: readonly ProfilePageSectionContent<ArtistPageSectionId>[]
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
  const [inspectorOpen, setInspectorOpen] = useState(true)

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

  async function saveCustomization(layout: ProfilePageLayout<ArtistPageSectionId>): Promise<SaveResult> {
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

      const result = await saveAction({ layout, appearance, imageChanges })
      if (result.error) return result

      const [nextProfileImage, nextCoverImage, nextWallpaperImage] = uploads
      if (imageChanges.profile === 'replace') setProfileImage(nextProfileImage)
      else if (imageChanges.profile === 'remove') setProfileImage(null)
      if (imageChanges.cover === 'replace' && nextCoverImage) setCoverImage(nextCoverImage)
      else if (imageChanges.cover === 'remove') setCoverImage('/concert-hero.jpg')
      if (imageChanges.background === 'replace') setWallpaperImage(nextWallpaperImage)
      else if (imageChanges.background === 'remove') setWallpaperImage(null)

      setSavedAppearance(appearance)
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

  const inspector = (
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
    </div>
  )

  return (
    <ProfilePageLayoutEditor
      initialLayout={initialTheme.layout}
      definitions={ARTIST_PAGE_SECTION_DEFINITIONS}
      sections={sections}
      hero={(
        <ArtistPageHero
          band={band}
          genreNames={genreNames}
          isOwner
          isEditing
          appearance={appearance}
          coverImage={displayCoverImage}
          profileImage={displayProfileImage}
          editAppearanceControl={(
            <button type="button" onClick={() => setInspectorOpen(true)} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/20 bg-black/30 px-4 text-sm font-semibold text-white backdrop-blur transition-colors hover:bg-black/45">
              <Palette className="h-4 w-4" /> Edit appearance
            </button>
          )}
        />
      )}
      style={frameStyle}
      exitHref={exitHref}
      editDetailsHref={editDetailsHref}
      saveAction={saveCustomization}
      externalDirty={appearanceDirty}
      inspector={inspector}
      inspectorOpen={inspectorOpen}
      onOpenInspector={() => setInspectorOpen(true)}
      inspectorLabel="Appearance"
    />
  )
}
