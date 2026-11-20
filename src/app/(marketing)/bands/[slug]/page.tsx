import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { loadArtistFollowState } from '@/lib/artist-network-data'
import { StudioPage } from '@/components/studio/StudioPage'
import { ArtistConnectionActions } from '@/components/bands/ArtistConnectionActions'
import { initialDocument } from '@/lib/studio/model'
import { loadDraft } from '@/lib/studio/server'
import type { Band, Event } from '@/types/database'
import type { ProfilePageBlock } from '@/types/database'
import { parseProfilePageBlock } from '@/components/profile-page/blocks/profile-page-blocks'
import {
  ACTIVE_IDENTITY_COOKIE,
  resolveActiveIdentity,
  identityValue,
  type ManagedIdentity,
} from '@/lib/managed-identity'

export const revalidate = 60

export async function generateStaticParams() {
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const { data } = await supabase
    .from('bands')
    .select('slug')
    .eq('page_published', true)
    .eq('is_active', true)
  return (data ?? []).map(({ slug }) => ({ slug }))
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
    .eq('page_published', true)
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
  searchParams: Promise<{ inquire?: string; date?: string; edit?: string }>
}) {
  const { slug } = await params
  const { inquire, date, edit } = await searchParams
  const supabase = await createClient()

  const [
    { data: rawBand },
    {
      data: { user },
    },
  ] = await Promise.all([
    supabase.from('bands').select('*').eq('slug', slug).eq('is_active', true).single(),
    supabase.auth.getUser(),
  ])

  const band = rawBand as Band | null
  if (!band) return notFound()
  const isOwner = user?.id === band.user_id
  if (!isOwner && !band.page_published) notFound()
  const editing = isOwner && (edit === '1' || !band.page_published)
  const collectionResults = await Promise.all([
    supabase.from('band_genres').select('genre_id, genres(name)').eq('band_id', band.id),
    supabase
      .from('bookings')
      .select(
        'id, show_date, event_id, venues(name, location_city, location_state), events(is_public, lineup_published, status)'
      )
      .eq('band_id', band.id)
      .in('status', ['confirmed', 'cancellation_requested'])
      .order('show_date'),
    supabase
      .from('band_lyrics')
      .select('id, title, body, sort_order')
      .eq('band_id', band.id)
      .order('sort_order')
      .order('created_at'),
    supabase.from('genres').select('id, name').order('name'),
    supabase.from('profile_page_blocks').select('*').eq('band_id', band.id).order('created_at'),
    supabase.from('band_show_dates').select('*').eq('band_id', band.id).order('show_date'),
  ])
  if (editing && collectionResults.some((result) => result.error))
    throw new Error('Could not load all profile content for editing.')
  const [
    { data: bandGenres },
    { data: rawShows },
    { data: rawLyrics },
    { data: rawGenres },
    { data: rawBlocks },
    { data: manualShows },
  ] = collectionResults

  const blocks = (structuredClone(rawBlocks ?? []) as ProfilePageBlock[]).flatMap((block) => {
    const parsed = parseProfilePageBlock(block)
    return parsed ? [parsed] : []
  })
  let contactIdentity: ManagedIdentity | null = null
  let identities: ManagedIdentity[] = []
  if (user) {
    const [{ data: ownedBands }, { data: ownedVenues }] = await Promise.all([
      supabase.from('bands').select('id, name').eq('user_id', user.id).eq('is_active', true),
      supabase.from('venues').select('id, name').eq('claimed_by_user_id', user.id).eq('is_active', true),
    ])
    identities = [
      ...(ownedBands ?? []).map((ownedBand) => ({
        kind: 'band' as const,
        id: ownedBand.id,
        name: ownedBand.name,
        href: `/dashboard/bands/${ownedBand.id}/edit`,
      })),
      ...(ownedVenues ?? []).map((venue) => ({
        kind: 'venue' as const,
        id: venue.id,
        name: venue.name,
        href: `/dashboard/venues/${venue.id}/edit`,
      })),
    ]
    const cookieStore = await cookies()
    const activeIdentity = resolveActiveIdentity(
      cookieStore.get(ACTIVE_IDENTITY_COOKIE)?.value,
      identities
    )
    contactIdentity = activeIdentity.kind === 'all' ? null : activeIdentity
  }

  const connections =
    contactIdentity?.kind === 'band' && !isOwner
      ? await loadArtistFollowState(supabase, contactIdentity.id, [band.id])
      : { following: new Set<string>(), followers: new Set<string>(), available: true }

  const dates = (rawShows ?? []).flatMap((show) => {
    const event = show.events as unknown as Pick<
      Event,
      'is_public' | 'lineup_published' | 'status'
    > | null
    if (
      show.event_id &&
      !(
        event?.is_public &&
        event.lineup_published &&
        ['draft', 'active', 'completed'].includes(event.status)
      )
    )
      return []
    const venue = show.venues as unknown as {
      name: string
      location_city: string
      location_state: string
    } | null
    return [
      {
        id: show.id,
        date: show.show_date,
        venue: venue?.name ?? 'TBA',
        city: venue?.location_city ?? '',
        state: venue?.location_state ?? '',
        url: '',
      },
    ]
  })
  const base = initialDocument('artist', band, {
    genres: (bandGenres ?? []).map((g) => g.genre_id),
    blocks,
    lyrics: (rawLyrics ?? []).map(({ id, title, body }) => ({ id, title, body })),
    shows: (manualShows ?? []).map((s) => ({
      id: s.id,
      date: s.show_date,
      venue: s.venue_name,
      city: s.city,
      state: s.state,
      url: s.ticket_url ?? '',
    })),
  })
  return (
    <StudioPage
      key={band.id + String(editing)}
      kind="artist"
      id={band.id}
      name={band.name}
      href={'/bands/' + band.slug}
      base={base}
      dates={dates}
      genres={rawGenres ?? []}
      owner={isOwner}
      published={band.page_published}
      draft={editing ? await loadDraft('artist', band.id) : undefined}
      inquiry={{
        signedIn: !!user,
        profiles: identities,
        active: contactIdentity ? identityValue(contactIdentity) : 'all',
        open: inquire === '1',
        date: date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : '',
      }}
      actions={
        !isOwner && contactIdentity ? (
          <ArtistConnectionActions
            identity={contactIdentity}
            targetId={band.id}
            targetName={band.name}
            following={connections.following.has(band.id)}
            followsYou={connections.followers.has(band.id)}
            followAvailable={connections.available}
          />
        ) : null
      }
    />
  )
}
