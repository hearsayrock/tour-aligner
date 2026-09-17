import type { ArtistPageEditableContent } from './artist-page-config'
import type { ArtistContentSection } from './ArtistPageSections'

export const STREAMING_FIELDS = ['spotify_url', 'apple_music_url', 'youtube_url', 'soundcloud_url', 'bandcamp_url'] as const
export const SOCIAL_FIELDS = ['website_url', 'instagram_url', 'facebook_url', 'tiktok_url', 'twitter_url'] as const

export function artistContentFields(section: ArtistContentSection): readonly (keyof ArtistPageEditableContent)[] {
  switch (section) {
    case 'identity': return ['name', 'tagline', 'description']
    case 'details': return ['location_city', 'location_state', 'artist_type', 'touring_radius', 'set_length_min']
    case 'music': return ['genre_ids', 'featured_track_url']
    case 'lyrics': return ['lyrics']
    case 'members': return ['members']
    case 'links': return [...STREAMING_FIELDS, ...SOCIAL_FIELDS]
  }
}

export function mergeArtistContent(target: ArtistPageEditableContent, source: ArtistPageEditableContent, fields: readonly (keyof ArtistPageEditableContent)[]): ArtistPageEditableContent {
  return { ...target, ...Object.fromEntries(fields.map((field) => [field, structuredClone(source[field])])) }
}
