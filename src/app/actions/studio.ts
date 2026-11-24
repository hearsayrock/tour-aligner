'use server'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { ACTIVE_IDENTITY_COOKIE, resolveActiveIdentity } from '@/lib/managed-identity'
import { normalizeProfilePageBlockDraft } from '@/components/profile-page/blocks/profile-page-blocks'
import {
  fieldGroups,
  isArtistSong,
  isMusicItemId,
  isMusicService,
  mediaPattern,
  spotifyEmbed,
  uuidPattern,
  layouts,
  urlValue,
  pageTabs,
  type Changes,
  type StudioKind,
} from '@/lib/studio/model'
import { bandcampEmbed, playableServices } from '@/lib/studio/songs'
import { THEME_PRESETS } from '@/lib/studio/presets'
import type { Json } from '@/types/database'

function check(kind: StudioKind, id: string, patch: Changes, publishing: boolean) {
  if (!patch || typeof patch !== 'object' || JSON.stringify(patch).length > 1000000)
    return 'This draft is too large.'
  const allowed = Object.values(fieldGroups[kind]).flat()
  for (const [key, v] of Object.entries(patch.fields ?? {})) {
    if (!allowed.includes(key) || typeof v !== 'string' || v.length > 30000)
      return 'Check the page fields.'
    if (!publishing) continue
    if (v && key.endsWith('_url') && !urlValue(v)) return 'Use a complete http or https link.'
    if (key === 'featured_track_url' && v && !spotifyEmbed(v))
      return 'Choose a Spotify artist, track, album, or playlist link.'
    if (
      [
        'set_length_min',
        'capacity',
        'default_bill_cap',
        'attendee_capacity',
        'needed_artist_count',
      ].includes(key) &&
      v &&
      !/^[1-9]\d{0,7}$/.test(v)
    )
      return 'Enter a positive whole number.'
    if (
      kind === 'event' &&
      [
        'title',
        'description',
        'event_date',
        'start_time',
        'attendee_capacity',
        'needed_artist_count',
      ].includes(key) &&
      !v.trim()
    )
      return 'Complete the event details before publishing.'
  }
  const look = patch.look
  if (look) {
    if (
      look.featuredMusic !== undefined &&
      (kind !== 'artist' ||
        !Array.isArray(look.featuredMusic) ||
        !look.featuredMusic.every(isMusicItemId) ||
        new Set(look.featuredMusic).size !== look.featuredMusic.length)
    )
      return 'Check the music selected for the player.'
    if (look.musicSource !== undefined && (kind !== 'artist' || !isMusicService(look.musicSource)))
      return 'Choose a featured streaming service.'
    if (
      look.story !== undefined &&
      (kind !== 'artist' || typeof look.story !== 'string' || look.story.length > 30000)
    )
      return 'Keep your story under 30,000 characters.'
    if (look.songs !== undefined) {
      if (kind !== 'artist' || !Array.isArray(look.songs) || !look.songs.every(isArtistSong))
        return 'Check the song details.'
      const ids = new Set<string>()
      for (const song of look.songs) {
        if (ids.has(song.id)) return 'Each song needs its own entry.'
        ids.add(song.id)
        const links = Object.values(song.links).filter(Boolean)
        if (!publishing) continue
        if (song.kind === 'spotify-embed' && !spotifyEmbed(song.links.spotify_url ?? ''))
          return 'Paste a Spotify artist, album, playlist, or track link for the embed.'
        if (song.bandcampPlayer && !bandcampEmbed(song.bandcampPlayer))
          return 'Paste the Bandcamp embed code for the track or clear the player field.'
        if (
          !song.title.trim() ||
          (!song.bandcampPlayer && !links.length) ||
          links.some((link) => !urlValue(link))
        )
          return 'Give each song a title and a listening link or Bandcamp track player.'
      }
    }
    if (publishing && look.featuredMusic?.length) {
      const playable = new Set(look.songs?.filter((item) => playableServices(item).length).map((item) => item.id))
      if (look.featuredMusic.some((id) => !playable.has(id)))
        return 'Each featured item needs a playable link or embed. Update the item or uncheck Feature in Music Player.'
    }
    if (
      (look.layout && !layouts.includes(look.layout)) ||
      (look.preset && !THEME_PRESETS.some((p) => p.id === look.preset)) ||
      (look.accent && !/^#[a-f0-9]{6}$/i.test(look.accent)) ||
      (look.coverOpacity !== undefined &&
        (!Number.isInteger(look.coverOpacity) || look.coverOpacity < 0 || look.coverOpacity > 100))
    )
      return 'Choose a valid look.'
    if (look.tabs && (!Array.isArray(look.tabs) || look.tabs.some((t) => !pageTabs[kind].includes(t))))
      return 'Choose valid page tabs.'
    for (const value of [look.cover, look.avatar]) {
      if (
        value &&
        !(mediaPattern.test(value) && value.startsWith('/studio-media/' + kind + '/' + id + '/')) &&
        !/^\/touraligner\/samples\/[a-z]+\.svg$/.test(value) &&
        !/^https?:\/\//.test(urlValue(value))
      )
        return 'Choose a photo for this page.'
    }
  }
  if (patch.genres && (!Array.isArray(patch.genres) || patch.genres.some((v) => !uuidPattern.test(v))))
    return 'Choose genres from the list.'
  if (publishing) {
    for (const row of patch.shows ?? [])
      if (
        !uuidPattern.test(row.id) ||
        !/^\d{4}-\d{2}-\d{2}$/.test(row.date) ||
        !row.venue.trim() ||
        (row.url && !urlValue(row.url))
      )
        return 'Add a date and venue to each show and check ticket links.'
    for (const row of patch.lyrics ?? [])
      if (!uuidPattern.test(row.id) || !row.title.trim() || !row.body.trim())
        return 'Each song needs a title and lyrics.'
    for (const row of patch.blocks ?? []) {
      const r = normalizeProfilePageBlockDraft(row)
      if ('error' in r) return r.error
    }
  }
  return ''
}
export async function studioWrite(
  kind: StudioKind,
  id: string,
  revision: number,
  op: 'save' | 'publish' | 'discard',
  patch: Changes
) {
  if (
    !['artist', 'event', 'venue'].includes(kind) ||
    !uuidPattern.test(id) ||
    !['save', 'publish', 'discard'].includes(op)
  )
    return { error: 'Invalid page.' }
  const db = await createClient()
  if (kind === 'event') {
    const {
      data: { user },
    } = await db.auth.getUser()
    if (!user) return { error: 'Sign in to edit this event.' }
    const [bands, venues, event] = await Promise.all([
      db.from('bands').select('id,name').eq('user_id', user.id).eq('is_active', true),
      db.from('venues').select('id,name').eq('claimed_by_user_id', user.id).eq('is_active', true),
      db.from('events').select('venue_id').eq('id', id).maybeSingle(),
    ])
    const identity = resolveActiveIdentity((await cookies()).get(ACTIVE_IDENTITY_COOKIE)?.value, [
      ...(bands.data ?? []).map((b) => ({ ...b, kind: 'band' as const, href: '' })),
      ...(venues.data ?? []).map((v) => ({ ...v, kind: 'venue' as const, href: '' })),
    ])
    if (identity.kind !== 'venue' || identity.id !== event.data?.venue_id)
      return { error: 'Switch to the venue that manages this event.' }
  }
  if (op === 'publish') {
    const { data, error } = await db
      .from('studio_drafts')
      .select('changes')
      .eq('kind', kind)
      .eq('entity_id', id)
      .maybeSingle()
    if (error) return { error: error.message }
    patch = (data?.changes ?? {}) as Changes
  }
  const issue = check(kind, id, patch, op === 'publish')
  if (issue) return { error: issue }
  const { data, error } = await db.rpc('write_studio', {
    k: kind,
    entity: id,
    expected: revision,
    operation: op,
    payload: patch as unknown as Json,
  })
  if (error) return { error: error.message }
  if (op === 'publish') {
    const route = kind === 'artist' ? 'bands' : kind === 'event' ? 'events' : 'venues'
    revalidatePath('/' + route + '/[slug]', 'page')
    revalidatePath('/' + route)
    revalidatePath('/dashboard/profiles')
    revalidatePath('/dashboard/calendar')
  }
  return { revision: data }
}
export async function createStudioArtist(id: string, name: string, changes: Changes) {
  const error = check('artist', id, changes, true)
  if (error) return { error }
  const db = await createClient()
  const { data, error: failure } = await db.rpc('create_studio_artist', {
    entity: id,
    artist_name: name,
    payload: changes as unknown as Json,
  })
  if (failure) return { error: failure.message }
  const jar = await cookies()
  jar.set(ACTIVE_IDENTITY_COOKIE, 'band:' + id, { path: '/', sameSite: 'lax', httpOnly: true })
  return { slug: data }
}
