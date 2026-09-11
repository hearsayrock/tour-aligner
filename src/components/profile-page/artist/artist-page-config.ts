import type { Json } from '@/types/database'
import {
  createDefaultProfilePageLayout,
  normalizeProfilePageLayout,
  type ProfilePageLayout,
  type ProfilePageSectionDefinition,
} from '@/components/profile-page/profile-page-types'

export type ArtistPageSectionId =
  | 'overview'
  | 'featured-track'
  | 'lyrics'
  | 'shows'
  | 'streaming-links'
  | 'social-links'
  | 'profile-management'

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

export type ArtistPageCustomization = {
  layout: ProfilePageLayout<ArtistPageSectionId>
  appearance: ArtistProfileAppearance
  imageChanges: ArtistPageImageChanges
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

export function parseArtistProfileTheme(value: Json | undefined | null): ArtistProfileTheme {
  if (!isJsonObject(value)) {
    return {
      ...DEFAULT_ARTIST_PROFILE_THEME,
      layout: normalizeProfilePageLayout(undefined, ARTIST_PAGE_SECTION_DEFINITIONS),
    }
  }

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
    layout: normalizeProfilePageLayout(value.layout, ARTIST_PAGE_SECTION_DEFINITIONS),
  }
}
