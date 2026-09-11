import type { Json } from '@/types/database'
import {
  createDefaultProfilePageLayout,
  normalizeProfilePageLayout,
  type ProfilePageLayout,
  type ProfilePageSectionDefinition,
} from '@/components/profile-page/profile-page-types'
import type { ProfilePageBlockDraft, ProfilePageBlockSectionId } from '@/components/profile-page/blocks/profile-page-blocks'

export type ArtistPageSectionId =
  | 'overview'
  | 'featured-track'
  | 'lyrics'
  | 'shows'
  | 'streaming-links'
  | 'social-links'
  | 'profile-management'
  | ProfilePageBlockSectionId

export const ARTIST_PAGE_SECTION_DEFINITIONS = [
  {
    sectionId: 'overview',
    label: 'Artist overview',
    description: 'Home base, touring range, artist type, and set length.',
    defaultOrder: 0,
    defaultSpan: 8,
    allowedSpans: [6, 8, 12],
    defaultVariant: 'standard',
    required: true,
  },
  {
    sectionId: 'streaming-links',
    label: 'Streaming links',
    description: 'Links to Spotify, Apple Music, YouTube, and more.',
    defaultOrder: 1,
    defaultSpan: 4,
    allowedSpans: [4, 6, 8, 12],
    defaultVariant: 'stacked',
  },
  {
    sectionId: 'featured-track',
    label: 'Featured track',
    description: 'The embedded track, album, or playlist.',
    defaultOrder: 2,
    defaultSpan: 8,
    allowedSpans: [6, 8, 12],
    defaultVariant: 'spotlight',
  },
  {
    sectionId: 'social-links',
    label: 'Social links',
    description: 'The places fans and venues can follow the artist.',
    defaultOrder: 3,
    defaultSpan: 4,
    allowedSpans: [4, 6, 8, 12],
    defaultVariant: 'stacked',
  },
  {
    sectionId: 'lyrics',
    label: 'Lyrics',
    description: 'Published lyrics and the stories behind the songs.',
    defaultOrder: 4,
    defaultSpan: 8,
    allowedSpans: [6, 8, 12],
    defaultVariant: 'editorial',
  },
  {
    sectionId: 'profile-management',
    label: 'Profile actions',
    description: 'Owner management or public profile information.',
    defaultOrder: 5,
    defaultSpan: 4,
    allowedSpans: [4, 6, 8, 12],
    defaultVariant: 'card',
    required: true,
  },
  {
    sectionId: 'shows',
    label: 'Upcoming shows',
    description: 'Confirmed upcoming appearances for this artist.',
    defaultOrder: 6,
    defaultSpan: 8,
    allowedSpans: [6, 8, 12],
    defaultVariant: 'list',
    required: true,
  },
] as const satisfies readonly ProfilePageSectionDefinition<ArtistPageSectionId>[]

export type ArtistProfileTheme = {
  accent: string
  background: 'paper' | 'night' | 'mist'
  buttonStyle: 'rounded' | 'square' | 'pill'
  wallpaperOpacity: number
  layout: ProfilePageLayout<ArtistPageSectionId>
}

export type ArtistProfileAppearance = Omit<ArtistProfileTheme, 'layout'>

export type ArtistPageImageChanges = Partial<Record<'profile' | 'cover' | 'background', 'replace' | 'remove'>>

export type ArtistPageEditableContent = {
  name: string
  tagline: string
  description: string
  location_city: string
  location_state: string
  touring_radius: '' | 'local' | 'regional' | 'national' | 'international'
  artist_type: '' | 'solo' | 'band'
  set_length_min: string
  featured_track_url: string
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
  genre_ids: string[]
  lyrics: { id?: string; title: string; body: string }[]
}

export type ArtistPageCustomization = {
  layout: ProfilePageLayout<ArtistPageSectionId>
  appearance: ArtistProfileAppearance
  imageChanges: ArtistPageImageChanges
  content: ArtistPageEditableContent
  blocks: ProfilePageBlockDraft[]
}

export function getArtistProfileAppearance(theme: ArtistProfileTheme): ArtistProfileAppearance {
  return {
    accent: theme.accent,
    background: theme.background,
    buttonStyle: theme.buttonStyle,
    wallpaperOpacity: theme.wallpaperOpacity,
  }
}

export const DEFAULT_ARTIST_PAGE_LAYOUT = createDefaultProfilePageLayout(ARTIST_PAGE_SECTION_DEFINITIONS)

export const DEFAULT_ARTIST_PROFILE_THEME: ArtistProfileTheme = {
  accent: '#FD6A2F',
  background: 'paper',
  buttonStyle: 'rounded',
  wallpaperOpacity: 12,
  layout: DEFAULT_ARTIST_PAGE_LAYOUT,
}

function isJsonObject(value: Json | undefined | null): value is Record<string, Json | undefined> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

export function parseArtistProfileTheme(
  value: Json | undefined | null,
  additionalDefinitions: readonly ProfilePageSectionDefinition<ArtistPageSectionId>[] = []
): ArtistProfileTheme {
  if (!isJsonObject(value)) {
    return {
      ...DEFAULT_ARTIST_PROFILE_THEME,
      layout: normalizeProfilePageLayout(undefined, [...ARTIST_PAGE_SECTION_DEFINITIONS, ...additionalDefinitions]),
    }
  }

  const knownIds = new Set<string>([
    ...ARTIST_PAGE_SECTION_DEFINITIONS.map((definition) => definition.sectionId),
    ...additionalDefinitions.map((definition) => definition.sectionId),
  ])
  const rawLayout = isJsonObject(value.layout) ? value.layout : null
  const inferredDefinitions: ProfilePageSectionDefinition<ArtistPageSectionId>[] = []
  if (rawLayout && Array.isArray(rawLayout.sections)) {
    rawLayout.sections.forEach((section, index) => {
      if (!isJsonObject(section) || typeof section.sectionId !== 'string' || !section.sectionId.startsWith('block:') || knownIds.has(section.sectionId)) return
      knownIds.add(section.sectionId)
      inferredDefinitions.push({
        sectionId: section.sectionId as ProfilePageBlockSectionId,
        label: 'Page block',
        description: 'Custom profile page content.',
        defaultOrder: ARTIST_PAGE_SECTION_DEFINITIONS.length + index,
        defaultSpan: 8,
        allowedSpans: [4, 6, 8, 12],
        defaultVariant: typeof section.variant === 'string' ? section.variant : 'card',
      })
    })
  }
  const definitions = [...ARTIST_PAGE_SECTION_DEFINITIONS, ...additionalDefinitions, ...inferredDefinitions]

  const accent = typeof value.accent === 'string' && /^#[0-9A-Fa-f]{6}$/.test(value.accent)
    ? value.accent.toUpperCase()
    : DEFAULT_ARTIST_PROFILE_THEME.accent
  const background = value.background === 'night' || value.background === 'mist' || value.background === 'paper'
    ? value.background
    : DEFAULT_ARTIST_PROFILE_THEME.background
  const buttonStyle = value.buttonStyle === 'square' || value.buttonStyle === 'pill' || value.buttonStyle === 'rounded'
    ? value.buttonStyle
    : DEFAULT_ARTIST_PROFILE_THEME.buttonStyle
  const wallpaperOpacity = typeof value.wallpaperOpacity === 'number'
    ? Math.round(Math.min(100, Math.max(0, value.wallpaperOpacity)))
    : DEFAULT_ARTIST_PROFILE_THEME.wallpaperOpacity

  return {
    accent,
    background,
    buttonStyle,
    wallpaperOpacity,
    layout: normalizeProfilePageLayout(value.layout, definitions),
  }
}
