import type { Json } from '@/types/database'
import {
  createDefaultProfilePageLayout,
  normalizeProfilePageLayout,
  type ProfilePageLayout,
  type ProfilePageSectionDefinition,
} from '@/components/profile-page/profile-page-types'
import type { ProfilePageBlockDraft, ProfilePageBlockSectionId } from '@/components/profile-page/blocks/profile-page-blocks'

export const VENUE_PAGE_BLOCK_TYPES: readonly ProfilePageBlockDraft['blockType'][] = ['custom', 'gallery', 'video', 'quote', 'divider']

export type VenuePageSectionId =
  | 'overview'
  | 'availability'
  | 'private-chat'
  | 'booking-details'
  | 'links'
  | 'profile-management'
  | ProfilePageBlockSectionId

export const VENUE_PAGE_SECTION_DEFINITIONS = [
  { sectionId: 'overview', label: 'Venue overview', description: 'Location, capacity, age policy, and bill size.', defaultOrder: 0, defaultSpan: 8, allowedSpans: [6, 8, 12], defaultVariant: 'standard', required: true },
  { sectionId: 'booking-details', label: 'Booking details', description: 'Public booking email and phone number.', defaultOrder: 1, defaultSpan: 4, allowedSpans: [4, 6, 8, 12], defaultVariant: 'card' },
  { sectionId: 'availability', label: 'Booking availability', description: 'Live dates and booking requests powered by TourAligner.', defaultOrder: 2, defaultSpan: 8, allowedSpans: [6, 8, 12], defaultVariant: 'calendar', required: true },
  { sectionId: 'private-chat', label: 'Private chat', description: 'A direct TourAligner conversation path.', defaultOrder: 3, defaultSpan: 4, allowedSpans: [4, 6, 8, 12], defaultVariant: 'card' },
  { sectionId: 'links', label: 'Venue links', description: 'Website and social destinations.', defaultOrder: 4, defaultSpan: 4, allowedSpans: [4, 6, 8, 12], defaultVariant: 'stacked' },
  { sectionId: 'profile-management', label: 'Profile actions', description: 'Owner management or public claim information.', defaultOrder: 5, defaultSpan: 4, allowedSpans: [4, 6, 8, 12], defaultVariant: 'card', required: true },
] as const satisfies readonly ProfilePageSectionDefinition<VenuePageSectionId>[]

export type VenueProfileTheme = {
  accent: string
  background: 'paper' | 'night' | 'mist'
  buttonStyle: 'rounded' | 'square' | 'pill'
  wallpaperOpacity: number
  layout: ProfilePageLayout<VenuePageSectionId>
}

export type VenueProfileAppearance = Omit<VenueProfileTheme, 'layout'>
export type VenuePageImageChanges = Partial<Record<'profile' | 'cover' | 'background', 'replace' | 'remove'>>

export type VenuePageEditableContent = {
  description: string
  location_address: string
  location_city: string
  location_state: string
  location_zip: string
  capacity: string
  default_bill_cap: string
  age_requirement: '' | 'all_ages' | '18_plus' | '21_plus'
  website_url: string
  instagram_url: string
  phone: string
  booking_email: string
  genre_ids: string[]
}

export type VenuePageCustomization = {
  layout: ProfilePageLayout<VenuePageSectionId>
  appearance: VenueProfileAppearance
  imageChanges: VenuePageImageChanges
  content: VenuePageEditableContent
  blocks: ProfilePageBlockDraft[]
}

export const DEFAULT_VENUE_PAGE_LAYOUT = createDefaultProfilePageLayout(VENUE_PAGE_SECTION_DEFINITIONS)
export const DEFAULT_VENUE_PROFILE_THEME: VenueProfileTheme = { accent: '#FD6A2F', background: 'paper', buttonStyle: 'rounded', wallpaperOpacity: 12, layout: DEFAULT_VENUE_PAGE_LAYOUT }

function isJsonObject(value: Json | undefined | null): value is Record<string, Json | undefined> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

export function getVenueProfileAppearance(theme: VenueProfileTheme): VenueProfileAppearance {
  return { accent: theme.accent, background: theme.background, buttonStyle: theme.buttonStyle, wallpaperOpacity: theme.wallpaperOpacity }
}

export function parseVenueProfileTheme(value: Json | undefined | null, additionalDefinitions: readonly ProfilePageSectionDefinition<VenuePageSectionId>[] = []): VenueProfileTheme {
  if (!isJsonObject(value)) return { ...DEFAULT_VENUE_PROFILE_THEME, layout: normalizeProfilePageLayout(undefined, [...VENUE_PAGE_SECTION_DEFINITIONS, ...additionalDefinitions]) }
  const knownIds = new Set<string>([...VENUE_PAGE_SECTION_DEFINITIONS.map((definition) => definition.sectionId), ...additionalDefinitions.map((definition) => definition.sectionId)])
  const rawLayout = isJsonObject(value.layout) ? value.layout : null
  const inferredDefinitions: ProfilePageSectionDefinition<VenuePageSectionId>[] = []
  if (rawLayout && Array.isArray(rawLayout.sections)) {
    rawLayout.sections.forEach((section, index) => {
      if (!isJsonObject(section) || typeof section.sectionId !== 'string' || !section.sectionId.startsWith('block:') || knownIds.has(section.sectionId)) return
      knownIds.add(section.sectionId)
      inferredDefinitions.push({ sectionId: section.sectionId as ProfilePageBlockSectionId, label: 'Page block', description: 'Custom profile page content.', defaultOrder: VENUE_PAGE_SECTION_DEFINITIONS.length + index, defaultSpan: 8, allowedSpans: [4, 6, 8, 12], defaultVariant: typeof section.variant === 'string' ? section.variant : 'card' })
    })
  }
  const definitions = [...VENUE_PAGE_SECTION_DEFINITIONS, ...additionalDefinitions, ...inferredDefinitions]
  return {
    accent: typeof value.accent === 'string' && /^#[0-9A-Fa-f]{6}$/.test(value.accent) ? value.accent.toUpperCase() : DEFAULT_VENUE_PROFILE_THEME.accent,
    background: value.background === 'night' || value.background === 'mist' || value.background === 'paper' ? value.background : DEFAULT_VENUE_PROFILE_THEME.background,
    buttonStyle: value.buttonStyle === 'square' || value.buttonStyle === 'pill' || value.buttonStyle === 'rounded' ? value.buttonStyle : DEFAULT_VENUE_PROFILE_THEME.buttonStyle,
    wallpaperOpacity: typeof value.wallpaperOpacity === 'number' ? Math.round(Math.min(100, Math.max(0, value.wallpaperOpacity))) : DEFAULT_VENUE_PROFILE_THEME.wallpaperOpacity,
    layout: normalizeProfilePageLayout(value.layout, definitions),
  }
}
