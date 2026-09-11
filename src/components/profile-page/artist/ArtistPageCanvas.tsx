import type { CSSProperties } from 'react'
import { ProfilePageCanvas } from '@/components/profile-page/ProfilePageCanvas'
import { getArtistProfileAppearance, parseArtistProfileTheme } from '@/components/profile-page/artist/artist-page-config'
import { ArtistPageHero } from '@/components/profile-page/artist/ArtistPageHero'
import { ArtistPageVisualEditor } from '@/components/profile-page/artist/ArtistPageVisualEditor'
import {
  createArtistPageSections,
  type ArtistPageLyric,
  type ArtistPageShow,
} from '@/components/profile-page/artist/ArtistPageSections'
import { saveArtistPageCustomization } from '@/app/actions/artist-page'
import type { Band, Genre } from '@/types/database'

export type { ArtistPageLyric, ArtistPageShow } from '@/components/profile-page/artist/ArtistPageSections'

export type ArtistPageCanvasProps = {
  band: Band
  genreNames: string[]
  selectedGenreIds: string[]
  availableGenres: Pick<Genre, 'id' | 'name'>[]
  shows: ArtistPageShow[]
  lyrics: ArtistPageLyric[]
  isOwner: boolean
  isEditing: boolean
  hasViewer: boolean
}

type ArtistFrameStyle = CSSProperties & {
  '--profile-accent': string
  '--profile-button-radius': string
}

function versionedImageUrl(url: string | null, version: string): string | null {
  if (!url) return null
  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}v=${encodeURIComponent(version)}`
}

export function ArtistPageCanvas({
  band,
  genreNames,
  selectedGenreIds,
  availableGenres,
  shows,
  lyrics,
  isOwner,
  isEditing,
  hasViewer,
}: ArtistPageCanvasProps) {
  const coverImage = versionedImageUrl(band.cover_photo_url, band.updated_at)
  const heroImage = coverImage ?? '/concert-hero.jpg'
  const profileImage = versionedImageUrl(band.profile_photo_url, band.updated_at)
  const theme = parseArtistProfileTheme(band.profile_theme)
  const pageBackground = theme.background === 'night' ? '#17151B' : theme.background === 'mist' ? '#EDF7F6' : '#F7F4EE'
  const wallpaperImage = versionedImageUrl(band.profile_background_url, band.updated_at)
  const wallpaperBase = theme.background === 'night' ? '23,21,27' : theme.background === 'mist' ? '237,247,246' : '247,244,238'
  const wallpaperOverlayOpacity = 1 - (theme.wallpaperOpacity / 100)
  const wallpaperStyle: ArtistFrameStyle = {
    ...(wallpaperImage
      ? { backgroundImage: `linear-gradient(rgba(${wallpaperBase},${wallpaperOverlayOpacity}), rgba(${wallpaperBase},${wallpaperOverlayOpacity})), url("${wallpaperImage}")`, backgroundSize: 'cover', backgroundAttachment: 'fixed' as const }
      : { backgroundColor: pageBackground }),
    '--profile-accent': theme.accent,
    '--profile-button-radius': theme.buttonStyle === 'pill' ? '9999px' : theme.buttonStyle === 'square' ? '0.375rem' : '1rem',
  }

  const hero = (
    <ArtistPageHero
      band={band}
      genreNames={genreNames}
      isOwner={isOwner}
      isEditing={isEditing}
      appearance={getArtistProfileAppearance(theme)}
      coverImage={heroImage}
      profileImage={profileImage}
    />
  )
  const sections = createArtistPageSections({ band, shows, lyrics, isOwner, isEditing })

  if (isOwner && isEditing) {
    const saveAction = saveArtistPageCustomization.bind(null, band.id)
    return (
      <ArtistPageVisualEditor
        band={band}
        selectedGenreIds={selectedGenreIds}
        availableGenres={availableGenres}
        shows={shows}
        lyrics={lyrics}
        initialTheme={theme}
        initialCoverImage={coverImage}
        initialProfileImage={profileImage}
        initialWallpaperImage={wallpaperImage}
        exitHref={`/bands/${band.slug}`}
        editDetailsHref={`/dashboard/bands/${band.id}/edit`}
        saveAction={saveAction}
      />
    )
  }

  return (
    <ProfilePageCanvas
      layout={theme.layout}
      hero={hero}
      sections={sections}
      className={hasViewer ? '' : 'pt-16'}
      style={wallpaperStyle}
    />
  )
}
