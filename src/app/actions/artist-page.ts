'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { Json } from '@/types/database'
import {
  ARTIST_PAGE_SECTION_DEFINITIONS,
  parseArtistProfileTheme,
  type ArtistPageCustomization,
  type ArtistPageEditableContent,
} from '@/components/profile-page/artist/artist-page-config'
import { normalizeProfilePageLayout } from '@/components/profile-page/profile-page-types'

export type SaveArtistPageLayoutResult = {
  success?: true
  error?: string
}

const URL_FIELDS = [
  'featured_track_url',
  'website_url',
  'instagram_url',
  'spotify_url',
  'youtube_url',
  'bandcamp_url',
  'apple_music_url',
  'tiktok_url',
  'soundcloud_url',
  'facebook_url',
  'twitter_url',
] as const satisfies readonly (keyof ArtistPageEditableContent)[]

function normalizeContent(content: ArtistPageEditableContent | undefined) {
  if (!content || typeof content !== 'object' || Array.isArray(content)) return { error: 'The artist content was invalid.' } as const
  const name = typeof content.name === 'string' ? content.name.trim() : ''
  if (!name) return { error: 'Artist name is required.' } as const
  if (name.length > 120) return { error: 'Artist name must be 120 characters or fewer.' } as const

  const optionalText = (value: unknown, max: number) => typeof value === 'string' ? value.trim().slice(0, max) || null : null
  const links: Partial<Record<(typeof URL_FIELDS)[number], string | null>> = {}
  for (const field of URL_FIELDS) {
    const value = optionalText(content[field], 2048)
    if (value) {
      try {
        const url = new URL(value)
        if (url.protocol !== 'http:' && url.protocol !== 'https:') return { error: `${field.replaceAll('_', ' ')} must use an http or https URL.` } as const
      } catch {
        return { error: `${field.replaceAll('_', ' ')} must be a complete URL.` } as const
      }
    }
    links[field] = value
  }

  const touringRadius = ['local', 'regional', 'national', 'international'].includes(content.touring_radius)
    ? content.touring_radius as 'local' | 'regional' | 'national' | 'international'
    : null
  const artistType = content.artist_type === 'solo' || content.artist_type === 'band' ? content.artist_type : null
  const setLength = content.set_length_min === '' ? null : Number(content.set_length_min)
  if (setLength !== null && (!Number.isInteger(setLength) || setLength < 1 || setLength > 999)) {
    return { error: 'Set length must be a whole number between 1 and 999 minutes.' } as const
  }

  const genreIds = Array.isArray(content.genre_ids)
    ? [...new Set(content.genre_ids.filter((id): id is string => typeof id === 'string' && /^[0-9a-f-]{36}$/i.test(id)))].slice(0, 3)
    : []
  const lyrics = Array.isArray(content.lyrics)
    ? content.lyrics
      .filter((lyric) => lyric && typeof lyric.title === 'string' && typeof lyric.body === 'string' && lyric.title.trim() && lyric.body.trim())
      .slice(0, 50)
      .map((lyric) => ({
        ...(typeof lyric.id === 'string' && /^[0-9a-f-]{36}$/i.test(lyric.id) ? { id: lyric.id } : {}),
        title: lyric.title.trim().slice(0, 160),
        body: lyric.body.trim().slice(0, 20000),
      }))
    : []

  return {
    value: {
      band: {
        name,
        tagline: optionalText(content.tagline, 180),
        description: optionalText(content.description, 5000),
        location_city: optionalText(content.location_city, 120),
        location_state: optionalText(content.location_state, 120),
        touring_radius: touringRadius,
        artist_type: artistType,
        set_length_min: setLength,
        ...links,
      },
      genreIds,
      lyrics,
    },
  } as const
}

export async function saveArtistPageCustomization(
  bandId: string,
  customization: ArtistPageCustomization
): Promise<SaveArtistPageLayoutResult> {
  if (!customization || typeof customization !== 'object') {
    return { error: 'The artist page changes were invalid.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'You must be signed in to edit this artist page.' }

  const { data: band, error: bandError } = await supabase
    .from('bands')
    .select('user_id, slug, profile_theme')
    .eq('id', bandId)
    .single()

  if (bandError || !band) return { error: 'Artist profile not found.' }
  if (band.user_id !== user.id) return { error: 'You do not have permission to edit this artist page.' }

  const currentTheme = parseArtistProfileTheme(band.profile_theme)
  const normalizedContent = normalizeContent(customization.content)
  if ('error' in normalizedContent) return { error: normalizedContent.error }
  if (normalizedContent.value.genreIds.length > 0) {
    const { data: validGenres, error: genresLookupError } = await supabase
      .from('genres')
      .select('id')
      .in('id', normalizedContent.value.genreIds)
    if (genresLookupError || validGenres?.length !== normalizedContent.value.genreIds.length) {
      return { error: 'One or more selected genres are invalid.' }
    }
  }
  const normalizedLayout = normalizeProfilePageLayout(customization.layout, ARTIST_PAGE_SECTION_DEFINITIONS)
  const nextTheme = parseArtistProfileTheme({
    ...currentTheme,
    ...customization.appearance,
    layout: normalizedLayout,
  } as unknown as Json)
  const imageChanges = customization.imageChanges ?? {}
  const imageUpdates: {
    profile_photo_url?: string | null
    cover_photo_url?: string | null
    profile_background_url?: string | null
  } = {}

  function publicImageUrl(type: 'profile' | 'cover' | 'background') {
    return supabase.storage.from('band-images').getPublicUrl(`bands/${bandId}/${type}.jpg`).data.publicUrl
  }

  if (imageChanges.profile === 'replace') imageUpdates.profile_photo_url = publicImageUrl('profile')
  else if (imageChanges.profile === 'remove') imageUpdates.profile_photo_url = null
  if (imageChanges.cover === 'replace') imageUpdates.cover_photo_url = publicImageUrl('cover')
  else if (imageChanges.cover === 'remove') imageUpdates.cover_photo_url = null
  if (imageChanges.background === 'replace') imageUpdates.profile_background_url = publicImageUrl('background')
  else if (imageChanges.background === 'remove') imageUpdates.profile_background_url = null

  const { error } = await supabase
    .from('bands')
    .update({ profile_theme: nextTheme as unknown as Json, ...imageUpdates, ...normalizedContent.value.band })
    .eq('id', bandId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  const { error: deleteGenresError } = await supabase.from('band_genres').delete().eq('band_id', bandId)
  if (deleteGenresError) return { error: deleteGenresError.message }
  if (normalizedContent.value.genreIds.length > 0) {
    const { error: genresError } = await supabase.from('band_genres').insert(
      normalizedContent.value.genreIds.map((genre_id) => ({ band_id: bandId, genre_id }))
    )
    if (genresError) return { error: genresError.message }
  }

  const { error: deleteLyricsError } = await supabase.from('band_lyrics').delete().eq('band_id', bandId)
  if (deleteLyricsError) return { error: deleteLyricsError.message }
  if (normalizedContent.value.lyrics.length > 0) {
    const { error: lyricsError } = await supabase.from('band_lyrics').insert(
      normalizedContent.value.lyrics.map((lyric, sort_order) => ({ ...lyric, band_id: bandId, sort_order }))
    )
    if (lyricsError) return { error: lyricsError.message }
  }

  revalidatePath(`/bands/${band.slug}`)
  revalidatePath(`/dashboard/bands/${bandId}/edit`)
  return { success: true }
}
