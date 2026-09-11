import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import {
  ArtistPageCanvas,
  type ArtistPageLyric,
  type ArtistPageShow,
} from '@/components/profile-page/artist/ArtistPageCanvas'
import type { Band, Genre } from '@/types/database'

export const revalidate = 60

export async function generateStaticParams() {
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const { data } = await supabase.from('bands').select('slug').eq('is_active', true)
  return (data ?? []).map(({ slug }) => ({ slug }))
}

type ArtistPreviewDraft = Partial<Pick<Band,
  | 'name'
  | 'tagline'
  | 'description'
  | 'location_city'
  | 'location_state'
  | 'touring_radius'
  | 'artist_type'
  | 'set_length_min'
  | 'featured_track_url'
  | 'profile_theme'
  | 'website_url'
  | 'instagram_url'
  | 'spotify_url'
  | 'youtube_url'
  | 'bandcamp_url'
  | 'apple_music_url'
  | 'tiktok_url'
  | 'soundcloud_url'
  | 'facebook_url'
  | 'twitter_url'
>> & { genre_names?: string[] }

function parsePreviewDraft(value: string | undefined): ArtistPreviewDraft {
  if (!value) return {}
  try {
    const draft = JSON.parse(value) as unknown
    if (!draft || Array.isArray(draft) || typeof draft !== 'object') return {}
    return draft as ArtistPreviewDraft
  } catch {
    return {}
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()
  const { data } = await supabase
    .from('bands')
    .select('name, tagline')
    .eq('slug', slug)
    .eq('is_active', true)
    .single()
  if (!data) return {}
  return { title: data.name, description: data.tagline ?? undefined }
}

export default async function BandProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ draft?: string; edit?: string }>
}) {
  const { slug } = await params
  const { draft, edit } = await searchParams
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  const [{ data: rawBand }, { data: { user } }] = await Promise.all([
    supabase.from('bands').select('*').eq('slug', slug).eq('is_active', true).single(),
    supabase.auth.getUser(),
  ])

  const band = rawBand as Band | null
  if (!band) return notFound()
  const isOwner = user?.id === band.user_id
  const previewDraft = parsePreviewDraft(draft)
  const displayBand = structuredClone({
    ...band,
    ...previewDraft,
  }) as Band

  const [{ data: bandGenres }, { data: rawShows }, { data: rawLyrics }, { data: rawGenres }] = await Promise.all([
    supabase.from('band_genres').select('genre_id, genres(name)').eq('band_id', band.id),
    supabase
      .from('bookings')
      .select('id, show_date, venues(name, location_city, location_state)')
      .eq('band_id', band.id)
      .in('status', ['confirmed', 'cancellation_requested'])
      .gte('show_date', today)
      .order('show_date')
      .limit(8),
    supabase
      .from('band_lyrics')
      .select('id, title, body, sort_order')
      .eq('band_id', band.id)
      .order('sort_order')
      .order('created_at'),
    isOwner && edit === '1'
      ? supabase.from('genres').select('id, name').order('name')
      : Promise.resolve({ data: [] as Pick<Genre, 'id' | 'name'>[] }),
  ])

  let genreNames = (
    (bandGenres ?? []) as unknown as { genres: { name: string } | null }[]
  )
    .map((bandGenre) => bandGenre.genres?.name)
    .filter(Boolean) as string[]
  if (Array.isArray(previewDraft.genre_names)) {
    genreNames = previewDraft.genre_names.filter((genre): genre is string => typeof genre === 'string' && genre.trim().length > 0)
  }

  return (
    <ArtistPageCanvas
      band={displayBand}
      genreNames={genreNames}
      selectedGenreIds={(bandGenres ?? []).map((bandGenre) => bandGenre.genre_id)}
      availableGenres={structuredClone(rawGenres ?? []) as Pick<Genre, 'id' | 'name'>[]}
      shows={structuredClone(rawShows ?? []) as unknown as ArtistPageShow[]}
      lyrics={structuredClone(rawLyrics ?? []) as ArtistPageLyric[]}
      isOwner={isOwner}
      isEditing={isOwner && edit === '1'}
      hasViewer={!!user}
    />
  )
}
