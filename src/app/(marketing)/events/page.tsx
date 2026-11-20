import Link from 'next/link'
import { cookies } from 'next/headers'
import { CalendarDays, MapPin, Music2, Search } from 'lucide-react'
import { ProfileSelectionModal } from '@/components/dashboard/ProfileSelectionModal'
import { createClient } from '@/lib/supabase/server'
import { formatEventDate, getAcceptedMemberships, getOpenArtistNeed } from '@/lib/events'
import { ACTIVE_IDENTITY_COOKIE, resolveActiveIdentity, type ManagedIdentity } from '@/lib/managed-identity'
import { Badge, ButtonLink, EmptyState, PageHeader, inputClass } from '@/components/ui/primitives'
import type { Event, EventArtistMembership } from '@/types/database'

export const metadata = {
  title: 'Available Events',
  description: 'Find public Events looking for artists on TourAligner.',
}

type PublicEvent = Event & {
  venues: {
    name: string
    slug: string
    location_city: string
    location_state: string
  } | null
  event_genres: Array<{ genres: { id: string; name: string } | null }> | null
  event_artist_memberships: Array<Pick<EventArtistMembership, 'status'>> | null
}

function eventMatchesSearch(event: PublicEvent, rawSearch: string) {
  const search = rawSearch.trim().toLowerCase()
  if (!search) return true
  const genres = (event.event_genres ?? []).map((entry) => entry.genres?.name ?? '').join(' ')
  const haystack = [
    event.title,
    event.description,
    event.artist_need_description,
    event.venues?.name,
    event.venues?.location_city,
    event.venues?.location_state,
    genres,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  return haystack.includes(search)
}

function EventCard({ event }: { event: PublicEvent }) {
  const acceptedCount = getAcceptedMemberships(event.event_artist_memberships ?? []).length
  const openNeed = getOpenArtistNeed(event, event.event_artist_memberships ?? [])
  const genreNames = (event.event_genres ?? []).map((entry) => entry.genres?.name).filter(Boolean)
  const eventDate = new Date(`${event.event_date}T12:00:00`)
  const month = eventDate.toLocaleDateString('en-US', { month: 'short' })
  const day = eventDate.toLocaleDateString('en-US', { day: 'numeric' })

  return (
    <Link
      href={`/events/${event.slug}`}
      className="group grid gap-5 rounded-2xl border border-border bg-white p-5 shadow-[0_12px_28px_rgba(20,20,20,0.035)] transition-all hover:-translate-y-0.5 hover:border-border-strong hover:shadow-[0_18px_38px_rgba(20,20,20,0.07)] sm:grid-cols-[88px_minmax(0,1fr)_170px]"
    >
      <div className="flex h-20 w-20 flex-col items-center justify-center rounded-2xl border border-brand-tint-border bg-brand-tint text-brand-tint-text">
        <span className="text-xs font-semibold uppercase tracking-[0.16em]">{month}</span>
        <span className="text-3xl font-bold leading-none">{day}</span>
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-xl font-bold tracking-tight text-ink group-hover:text-brand-text">
            {event.title}
          </h2>
          <Badge tone={event.status === 'active' ? 'success' : 'warning'}>
            {event.status === 'active' ? 'Active' : 'Draft'}
          </Badge>
        </div>
        <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-text-secondary">
          <CalendarDays className="h-4 w-4 text-brand-text" />
          <span>{formatEventDate(event)}</span>
        </p>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-text-secondary">
          <MapPin className="h-4 w-4 text-text-subtle" />
          <span>{event.venues?.name ?? 'Unknown venue'}</span>
          {event.venues && (
            <>
              <span className="text-sand-light">/</span>
              <span>{[event.venues.location_city, event.venues.location_state].filter(Boolean).join(', ')}</span>
            </>
          )}
        </p>
        {event.artist_need_description && (
          <p className="mt-3 line-clamp-2 text-sm leading-6 text-text-secondary">{event.artist_need_description}</p>
        )}
        <div className="mt-4 flex flex-wrap gap-1.5">
          {genreNames.length > 0 ? (
            genreNames.map((genre) => (
              <Badge key={genre} tone="default">
                <Music2 className="h-3.5 w-3.5" />
                {genre}
              </Badge>
            ))
          ) : (
            <Badge tone="muted">Genre open</Badge>
          )}
        </div>
      </div>

      <div className="flex flex-col justify-between rounded-2xl border border-border bg-page px-4 py-3 text-sm sm:text-right">
        <div>
          <p className="font-semibold text-ink">{acceptedCount}/{event.needed_artist_count} artists</p>
          <p className={openNeed <= 0 ? 'mt-1 text-xs text-warning-text' : 'mt-1 text-xs text-text-secondary'}>
            {openNeed <= 0 ? 'Lineup target reached' : `${openNeed} open spot${openNeed === 1 ? '' : 's'}`}
          </p>
        </div>
        <span className="mt-4 inline-flex min-h-9 items-center justify-center rounded-xl bg-cocoa px-3 text-xs font-semibold text-white transition-colors group-hover:bg-brand">
          View event
        </span>
      </div>
    </Link>
  )
}

export default async function EventsPage({
  searchParams,
}: {
  searchParams?: Promise<{ genre?: string; q?: string }>
}) {
  const supabase = await createClient()
  const params = (await searchParams) ?? {}
  const [
    { data: genres },
    eventIdResult,
    { data: { user } },
  ] = await Promise.all([
    supabase.from('genres').select('id, name').order('name'),
    params.genre
      ? supabase.from('event_genres').select('event_id').eq('genre_id', params.genre)
      : Promise.resolve({ data: null }),
    supabase.auth.getUser(),
  ])

  if (user) {
    const [{ data: rawBands }, { data: rawVenues }] = await Promise.all([
      supabase.from('bands').select('id, name').eq('user_id', user.id).eq('is_active', true).order('name'),
      supabase.from('venues').select('id, name').eq('claimed_by_user_id', user.id).eq('is_active', true).order('name'),
    ])
    const bandIdentities: ManagedIdentity[] = ((rawBands ?? []) as Array<{ id: string; name: string }>).map((band) => ({
      kind: 'band' as const,
      id: band.id,
      name: band.name,
      href: `/dashboard/bands/${band.id}/edit`,
    }))
    const venueIdentities: ManagedIdentity[] = ((rawVenues ?? []) as Array<{ id: string; name: string }>).map((venue) => ({
      kind: 'venue' as const,
      id: venue.id,
      name: venue.name,
      href: `/dashboard/venues/${venue.id}/edit`,
    }))
    const identities = [...bandIdentities, ...venueIdentities]
    const cookieStore = await cookies()
    const activeIdentity = resolveActiveIdentity(cookieStore.get(ACTIVE_IDENTITY_COOKIE)?.value, identities)

    if (identities.length > 1 && activeIdentity.kind === 'all') {
      return (
        <div className="workspace-page">
          <PageHeader
            eyebrow="Available events"
            title="Choose a profile"
            description="Available Events are browsed from one active profile at a time. Artist profiles can apply; other profiles browse as attendees."
          />
          <ProfileSelectionModal
            title="Select a profile to browse Events"
            body="Available Events are browsed from one active profile at a time. Artist profiles can apply; other profiles browse as attendees."
            identities={identities}
          />
        </div>
      )
    }
  }

  const matchingEventIds = params.genre
    ? ((eventIdResult.data ?? []) as Array<{ event_id: string }>).map((row) => row.event_id)
    : null

  const todayIso = new Date().toISOString().slice(0, 10)

  let query = supabase
    .from('events')
    .select(`
      *,
      venues(name, slug, location_city, location_state),
      event_genres(genres(id, name)),
      event_artist_memberships(status)
    `)
    .eq('is_public', true)
    .eq('is_accepting_artists', true)
    .in('status', ['draft', 'active'])
    .gte('event_date', todayIso)
    .order('event_date', { ascending: true })

  if (matchingEventIds) {
    query = matchingEventIds.length > 0 ? query.in('id', matchingEventIds) : query.eq('id', '00000000-0000-0000-0000-000000000000')
  }

  const { data: rawEvents } = await query
  const allEvents = (rawEvents ?? []) as unknown as PublicEvent[]
  const events = allEvents.filter((event) => eventMatchesSearch(event, params.q ?? ''))
  const hasFilters = !!params.genre || !!params.q

  return (
    <div className={user ? 'workspace-page' : 'mx-auto max-w-7xl px-4 pt-24 pb-16 sm:px-6 lg:px-8'}>
      <PageHeader
        eyebrow="Event discovery"
        title="Available Events"
        description={`${events.length} public event${events.length === 1 ? '' : 's'} where venues are looking for artists.${hasFilters ? ' Filtered to your current search.' : ''}`}
        actions={
          <ButtonLink href="/venues" tone="secondary">
            Browse Venues
          </ButtonLink>
        }
      />

      <form className="mb-8 rounded-2xl border border-border bg-white/95 p-4 shadow-[0_16px_40px_rgba(20,20,20,0.07)] backdrop-blur">
        <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_260px_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-subtle" />
            <input
              name="q"
              defaultValue={params.q ?? ''}
              placeholder="Search events, venues, cities, or sounds"
              className={`${inputClass} pl-10`}
            />
          </div>
          <select
            name="genre"
            defaultValue={params.genre ?? ''}
            className={`${inputClass} appearance-none`}
          >
            <option value="">All genres</option>
            {(genres ?? []).map((genre) => (
              <option key={genre.id} value={genre.id}>{genre.name}</option>
            ))}
          </select>
          <button className="inline-flex min-h-12 items-center justify-center rounded-xl bg-brand px-5 text-sm font-semibold text-on-brand transition-colors hover:bg-brand-dim">
            Filter
          </button>
        </div>
        {hasFilters && (
          <Link href="/events" className="mt-3 inline-flex min-h-8 items-center text-sm font-semibold text-text-secondary transition-colors hover:text-ink">
            Clear filters
          </Link>
        )}
      </form>

      {events.length === 0 ? (
        <EmptyState
          title="No available events match this view"
          description="Try a broader search or clear the genre filter. New venue-created events will appear here when they are accepting artists."
          action={<ButtonLink href="/events" tone="secondary">Clear Filters</ButtonLink>}
        />
      ) : (
        <div className="space-y-4">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  )
}
