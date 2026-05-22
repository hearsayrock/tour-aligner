import Link from 'next/link'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { ProfileSelectionModal } from '@/components/dashboard/ProfileSelectionModal'
import {
  EVENT_STATUS_LABELS,
  MEMBERSHIP_STATUS_LABELS,
  formatEventDate,
  getAcceptedMemberships,
  getOpenArtistNeed,
} from '@/lib/events'
import { ACTIVE_IDENTITY_COOKIE, resolveRequiredActiveIdentity, type ManagedIdentity } from '@/lib/managed-identity'
import type { Event, EventArtistMembership } from '@/types/database'

export const metadata = { title: 'Backstages' }

type EventCardRecord = Event & {
  venues: {
    name: string
    slug: string
    location_city: string
    location_state: string
    claimed_by_user_id: string | null
  } | null
  event_genres?: Array<{ genres: { name: string } | null }> | null
  event_artist_memberships?: Array<
    Pick<EventArtistMembership, 'id' | 'status'> & {
      bands: { name: string; slug: string; user_id: string } | null
    }
  > | null
}

function EventCard({
  event,
  role,
  membership,
}: {
  event: EventCardRecord
  role: 'venue' | 'artist'
  membership?: Pick<EventArtistMembership, 'status'> | null
}) {
  const memberships = event.event_artist_memberships ?? []
  const acceptedCount = getAcceptedMemberships(memberships).length
  const openNeed = getOpenArtistNeed(event, memberships)
  const genres = (event.event_genres ?? []).map((entry) => entry.genres?.name).filter(Boolean)

  return (
    <Link
      href={`/dashboard/backstage/${event.id}`}
      className="block rounded-2xl border border-[#E8E8E8] bg-white p-5 transition-colors hover:border-[#CCCCCC]"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-[#252525]">{event.title}</h2>
            <span className="rounded-full border border-[#E8E8E8] bg-[#FAFAFA] px-2 py-0.5 text-xs text-[#777777]">
              {role === 'venue' ? 'Venue leader' : membership ? MEMBERSHIP_STATUS_LABELS[membership.status] : 'Artist'}
            </span>
          </div>
          <p className="mt-1 text-sm text-[#777777]">
            {event.venues?.name ?? 'Unknown venue'} · {formatEventDate(event)}
          </p>
          <p className="mt-1 text-sm text-[#888888]">
            {event.venues ? [event.venues.location_city, event.venues.location_state].filter(Boolean).join(', ') : ''}
          </p>
          {genres.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {genres.slice(0, 4).map((genre) => (
                <span key={genre} className="rounded-full border border-[#E8E8E8] px-2 py-0.5 text-xs text-[#555555]">
                  {genre}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="text-right text-sm">
          <p className="font-semibold text-[#252525]">{EVENT_STATUS_LABELS[event.status]}</p>
          <p className={`mt-1 ${openNeed <= 0 ? 'text-[#8A5A12]' : 'text-[#777777]'}`}>
            {acceptedCount}/{event.needed_artist_count} artists
          </p>
          {event.is_public && <p className="mt-1 text-xs text-[#0C7C71]">Public</p>}
          {event.is_accepting_artists && <p className="mt-1 text-xs text-[#FD6A2F]">Accepting artists</p>}
        </div>
      </div>
    </Link>
  )
}

export default async function BackstageListPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return redirect('/login')

  const [{ data: bands }, { data: venues }] = await Promise.all([
    supabase.from('bands').select('id, name').eq('user_id', user.id).eq('is_active', true),
    supabase.from('venues').select('id, name').eq('claimed_by_user_id', user.id).eq('is_active', true),
  ])

  const identities: ManagedIdentity[] = [
    ...(bands ?? []).map((band) => ({
      kind: 'band' as const,
      id: band.id,
      name: band.name,
      href: `/dashboard/bands/${band.id}/edit`,
    })),
    ...(venues ?? []).map((venue) => ({
      kind: 'venue' as const,
      id: venue.id,
      name: venue.name,
      href: `/dashboard/venues/${venue.id}/edit`,
    })),
  ]
  const cookieStore = await cookies()
  const requiredIdentity = resolveRequiredActiveIdentity(cookieStore.get(ACTIVE_IDENTITY_COOKIE)?.value, identities)

  if (requiredIdentity.requiresSelection) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#252525]">Backstages</h1>
          <p className="mt-1 text-sm text-[#888888]">Choose which profile you want to browse.</p>
        </div>
        <ProfileSelectionModal
          title="Select a profile to view Backstages"
          body="Backstages are filtered by one artist or venue profile. Use the profile selector in the nav to choose the profile you want to browse."
          identities={identities}
        />
      </div>
    )
  }

  const activeIdentity = requiredIdentity.activeIdentity
  const bandIds = activeIdentity?.kind === 'band' ? [activeIdentity.id] : []
  const venueIds = activeIdentity?.kind === 'venue' ? [activeIdentity.id] : []

  const [{ data: venueEvents }, { data: artistMemberships }] = await Promise.all([
    venueIds.length
      ? supabase
          .from('events')
          .select(`
            *,
            venues(name, slug, location_city, location_state, claimed_by_user_id),
            event_genres(genres(name)),
            event_artist_memberships(id, status, bands(name, slug, user_id))
          `)
          .in('venue_id', venueIds)
          .order('event_date', { ascending: true })
      : Promise.resolve({ data: [] }),
    bandIds.length
      ? supabase
          .from('event_artist_memberships')
          .select(`
            id,
            status,
            events(
              *,
              venues(name, slug, location_city, location_state, claimed_by_user_id),
              event_genres(genres(name)),
              event_artist_memberships(id, status, bands(name, slug, user_id))
            )
          `)
          .in('band_id', bandIds)
          .neq('status', 'removed')
      : Promise.resolve({ data: [] }),
  ])

  const venueEventRows = (venueEvents ?? []) as unknown as EventCardRecord[]
  const artistRows = (artistMemberships ?? []) as unknown as Array<{
    id: string
    status: EventArtistMembership['status']
    events: EventCardRecord | EventCardRecord[] | null
  }>
  const artistEvents = artistRows
    .map((row) => ({
      membership: { id: row.id, status: row.status },
      event: Array.isArray(row.events) ? row.events[0] : row.events,
    }))
    .filter((row): row is { membership: { id: string; status: EventArtistMembership['status'] }; event: EventCardRecord } => !!row.event)

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#252525]">Backstages</h1>
          <p className="mt-1 text-sm text-[#888888]">Plan Events with venues and accepted artists in one shared room.</p>
        </div>
        {venueIds.length > 0 && (
          <Link href="/dashboard/events/new" className="rounded-xl bg-[#FD6A2F] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#E55A22]">
            Create Event
          </Link>
        )}
      </div>

      {venueEventRows.length === 0 && artistEvents.length === 0 ? (
        <div className="rounded-2xl border border-[#E8E8E8] bg-white p-12 text-center">
          <p className="text-sm text-[#888888]">No Backstages yet.</p>
          <div className="mt-5 flex flex-col items-center justify-center gap-3 sm:flex-row">
            {venueIds.length > 0 && (
              <Link href="/dashboard/events/new" className="rounded-xl bg-[#FD6A2F] px-5 py-2.5 text-sm font-semibold text-white">
                Create Event
              </Link>
            )}
            <Link href="/events" className="rounded-xl border border-[#E8E8E8] px-5 py-2.5 text-sm font-semibold text-[#252525]">
              Browse Available Events
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-10">
          {venueEventRows.length > 0 && (
            <section>
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-[#888888]">Your venue Events</h2>
              <div className="space-y-4">
                {venueEventRows.map((event) => (
                  <EventCard key={event.id} event={event} role="venue" />
                ))}
              </div>
            </section>
          )}

          {artistEvents.length > 0 && (
            <section>
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-[#888888]">Artist Backstages</h2>
              <div className="space-y-4">
                {artistEvents.map(({ event, membership }) => (
                  <EventCard key={`${event.id}-${membership.id}`} event={event} role="artist" membership={membership} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
