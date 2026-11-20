import type { ProfilePageBlockDraft } from '@/components/profile-page/blocks/profile-page-blocks'
import { DEFAULT_FONTS, type ArtistFonts } from './fonts'
import { THEME_PRESETS } from './presets'

export type StudioKind = 'artist' | 'venue' | 'event'
export const layouts = ['poster', 'centered', 'top', 'right', 'cover'] as const
export type StudioTab = 'home' | 'music' | 'shows' | 'about' | 'availability' | 'lineup'
export const pageTabs: Record<StudioKind, StudioTab[]> = {
  artist: ['home', 'music', 'shows', 'about'],
  venue: ['home', 'availability', 'about'],
  event: ['home', 'lineup', 'about'],
}
export const tabNames: Record<StudioTab, string> = {
  home: 'Home',
  music: 'Music',
  shows: 'Shows',
  about: 'About',
  availability: 'Calendar',
  lineup: 'Lineup',
}
export const studioName = { artist: 'Artist Studio', venue: 'Venue Studio', event: 'Event Studio' }
export const musicServices = {
  spotify_url: 'Spotify',
  apple_music_url: 'Apple Music',
  soundcloud_url: 'SoundCloud',
  youtube_url: 'YouTube',
  bandcamp_url: 'Bandcamp',
}
export const socialServices = {
  website_url: 'Website',
  instagram_url: 'Instagram',
  facebook_url: 'Facebook',
  twitter_url: 'X',
  tiktok_url: 'TikTok',
}
export const fieldGroups: Record<StudioKind, Record<string, string[]>> = {
  artist: {
    Identity: ['tagline', 'artist_type', 'location_city', 'location_state'],
    About: ['description', 'touring_radius', 'set_length_min', 'members'],
    Music: ['featured_track_url', ...Object.keys(musicServices)],
    Links: Object.keys(socialServices),
  },
  venue: {
    About: [
      'description',
      'location_city',
      'location_state',
      'location_address',
      'location_zip',
      'capacity',
      'age_requirement',
      'default_bill_cap',
    ],
    Contact: ['booking_email', 'phone'],
    Links: ['website_url', 'instagram_url'],
  },
  event: {
    Details: [
      'title',
      'description',
      'event_date',
      'start_time',
      'attendee_capacity',
      'needed_artist_count',
      'artist_need_description',
      'is_public',
    ],
  },
}
export const labels: Record<string, string> = {
  title: 'Event title',
  tagline: 'Tagline',
  artist_type: 'Artist type',
  location_city: 'City',
  location_state: 'State',
  description: 'Description',
  touring_radius: 'Touring range',
  set_length_min: 'Set length (minutes)',
  members: 'Members (one per line)',
  featured_track_url: 'Featured Spotify link',
  location_address: 'Address',
  location_zip: 'ZIP code',
  capacity: 'Capacity',
  age_requirement: 'Age policy',
  default_bill_cap: 'Default acts per bill',
  booking_email: 'Booking email',
  phone: 'Phone',
  event_date: 'Show date',
  start_time: 'Start time',
  attendee_capacity: 'Attendee capacity',
  needed_artist_count: 'Acts needed',
  artist_need_description: 'Artists needed',
  is_public: 'Public event',
  ...musicServices,
  ...socialServices,
}
export type Look = {
  preset: string
  layout: (typeof layouts)[number]
  fonts: ArtistFonts
  tabs: StudioTab[]
  cover: string
  avatar: string
  wallpaper: string
  accent: string
  focus: string
  treatment: string
}
export type Lyric = { id: string; title: string; body: string }
export type Show = { id: string; date: string; venue: string; city: string; state: string; url: string }
export type StudioDoc = {
  fields: Record<string, string>
  look: Look
  genres: string[]
  blocks: ProfilePageBlockDraft[]
  lyrics: Lyric[]
  shows: Show[]
}
export type Changes = Partial<Omit<StudioDoc, 'fields' | 'look'>> & {
  fields?: Record<string, string>
  look?: Partial<Look>
}
export const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export const mediaPattern =
  /^\/studio-media\/(artist|venue|event)\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp)$/
export function urlValue(value: unknown, image = false) {
  if (typeof value !== 'string') return ''
  if (image && (mediaPattern.test(value) || /^\/touraligner\/samples\/[a-z]+\.svg$/.test(value)))
    return value
  try {
    const url = new URL(value)
    return ['https:', 'http:'].includes(url.protocol) ? url.href : ''
  } catch {
    return ''
  }
}
export function spotifyEmbed(value: string) {
  const match = urlValue(value).match(
    /^https:\/\/open\.spotify\.com\/(?:intl-[a-z]+\/)?(?:embed\/)?(artist|album|playlist|track)\/([a-zA-Z0-9]+)(?:[?#/]|$)/
  )
  return match ? 'https://open.spotify.com/embed/' + match[1] + '/' + match[2] : ''
}
export function initialDocument(
  kind: StudioKind,
  row: Record<string, unknown>,
  extra: Partial<StudioDoc> = {}
): StudioDoc {
  const fields: Record<string, string> = {}
  for (const key of Object.values(fieldGroups[kind]).flat()) {
    const v = row[key]
    fields[key] = Array.isArray(v) ? v.join('\n') : v == null ? '' : String(v)
  }
  const raw = (row.profile_theme ?? row.page_layout ?? {}) as Record<string, unknown>
  const stored = (raw.studio ?? {}) as Partial<Look>
  const preset =
    THEME_PRESETS.find((p) => p.id === stored.preset)?.id ??
    (kind === 'artist' ? 'basement' : kind === 'event' ? 'desert' : 'paper')
  const look: Look = {
    preset,
    layout: layouts.includes(stored.layout!) ? stored.layout! : 'poster',
    fonts: stored.fonts ?? DEFAULT_FONTS,
    tabs: pageTabs[kind].filter(
      (tab) => tab === 'home' || !Array.isArray(stored.tabs) || stored.tabs.includes(tab)
    ),
    cover: urlValue(stored.cover ?? row.cover_photo_url, true),
    avatar: urlValue(stored.avatar ?? row.profile_photo_url, true),
    wallpaper: urlValue(stored.wallpaper ?? row.profile_background_url, true),
    accent:
      typeof (stored.accent ?? raw.accent) === 'string' &&
      /^#[a-f0-9]{6}$/i.test(String(stored.accent ?? raw.accent))
        ? String(stored.accent ?? raw.accent)
        : '',
    focus: ['top', 'center', 'bottom'].includes(stored.focus ?? '') ? stored.focus! : 'center',
    treatment: ['natural', 'mono', 'tinted'].includes(stored.treatment ?? '')
      ? stored.treatment!
      : 'natural',
  }
  const blocks = (extra.blocks ?? [])
    .map((block, index) => ({ block, order: block.settings.placement?.order ?? index }))
    .sort((a, b) => a.order - b.order)
    .map((entry) => entry.block)
  return { fields, look, genres: [], lyrics: [], shows: [], ...extra, blocks }
}
export function applyChanges(base: StudioDoc, changes: Changes): StudioDoc {
  return {
    ...base,
    ...changes,
    fields: { ...base.fields, ...changes.fields },
    look: { ...base.look, ...changes.look },
  }
}
export function changedValues(base: StudioDoc, doc: StudioDoc): Changes {
  const result: Changes = {}
  const fields = Object.fromEntries(Object.entries(doc.fields).filter(([k, v]) => v !== base.fields[k]))
  if (Object.keys(fields).length) result.fields = fields
  const look = Object.fromEntries(
    Object.entries(doc.look).filter(
      ([k, v]) => JSON.stringify(v) !== JSON.stringify(base.look[k as keyof Look])
    )
  )
  if (Object.keys(look).length) result.look = look
  for (const key of ['genres', 'shows', 'lyrics', 'blocks'] as const)
    if (JSON.stringify(doc[key]) !== JSON.stringify(base[key]))
      Object.assign(result, { [key]: doc[key] })
  if (result.blocks)
    result.blocks = result.blocks.map((block, order) => ({
      ...block,
      settings: {
        ...block.settings,
        placement: { span: block.settings.placement?.span ?? 12, visible: true, order },
      },
    }))
  return result
}
