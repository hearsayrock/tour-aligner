import Link from 'next/link'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { MapPin, Plus, Search } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { ProfileSelectionModal } from '@/components/dashboard/ProfileSelectionModal'
import { Badge, ButtonLink, EmptyState, PageHeader, SectionHeading } from '@/components/ui/primitives'
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

function eventTone(status: Event['status']) {
  if (status === 'active') return 'success' as const
  if (status === 'draft') return 'warning' as const
  if (status === 'cancelled') return 'danger' as const
  return 'muted' as const
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
      className="group block rounded-2xl border border-[#E6E6E6] bg-white p-5 shadow-[0_12px_28px_rgba(20,20,20,0.035)] transition-all hover:-translate-y-0.5 hover:border-[#D0D0D0] hover:shadow-[0_18px_38px_rgba(20,20,20,0.07)]"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-[#202020] group-hover:text-[#FD6A2F]">{event.title}</h2>
            <Badge tone="muted">
              {role === 'venue' ? 'Venue leader' : membership ? MEMBERSHIP_STATUS_LABELS[membership.status] : 'Artist'}
            </Badge>
            <Badge tone={eventTone(event.status)}>{EVENT_STATUS_LABELS[event.status]}</Badge>
          </div>
          <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-[#666666]">
            <span>{event.venues?.name ?? 'Unknown venue'}</span>
            <span className="text-[#B0B0B0]">/</span>
            <span>{formatEventDate(event)}</span>
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-[#888888]">
            <MapPin className="h-3.5 w-3.5" />
            {event.venues ? [event.venues.location_city, event.venues.location_state].filter(Boolean).join(', ') : 'Location pending'}
          </p>
          {genres.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {genres.slice(0, 4).map((genre) => (
                <Badge key={genre} tone="default">{genre}</Badge>
              ))}
            </div>
          )}
        </div>
        <div className="rounded-xl border border-[#EEEEEE] bg-[#FAFAFA] px-3 py-2 text-right text-sm">
          <p className="font-semibold text-[#252525]">{acceptedCount}/{event.needed_artist_count} artists</p>
          <p className={openNeed <= 0 ? 'mt-1 text-xs text-[#8A5A12]' : 'mt-1 text-xs text-[#777777]'}>
            {openNeed <= 0 ? 'Target reached' : `${openNeed} open spot${openNeed === 1 ? '' : 's'}`}
          </p>
          {event.is_accepting_artists && <p className="mt-1 text-xs font-medium text-[#FD6A2F]">Accepting artists</p>}
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
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <PageHeader
          eyebrow="Backstages"
          title="Choose a profile"
          description="Backstages are filtered by one artist or venue profile. Use the profile selector to choose the profile you want to browse."
        />
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
  const todayIso = new Date().toISOString().slice(0, 10)

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
          .gte('event_date', todayIso)
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
    .filter((row) => row.event.event_date >= todayIso)

  const total = venueEventRows.length + artistEvents.length

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <PageHeader
        eyebrow="Backstages"
        title="Booking Workspaces"
        description={`${total} Backstage${total === 1 ? '' : 's'} for the selected profile. Each room keeps lineup, logistics, and conversation together.`}
        actions={
          <div className="flex flex-wrap gap-2">
            {venueIds.length > 0 && (
              <ButtonLink href="/dashboard/events/new">
                <Plus className="h-4 w-4" />
                Create Event
              </ButtonLink>
            )}
            <ButtonLink href="/events" tone="secondary">
              <Search className="h-4 w-4" />
              Browse Events
            </ButtonLink>
          </div>
        }
      />

      {total === 0 ? (
        <EmptyState
          title="No Backstages yet"
          description="Venues can create Events to open a Backstage. Artists can browse Available Events and apply."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              {venueIds.length > 0 && <ButtonLink href="/dashboard/events/new">Create Event</ButtonLink>}
              <ButtonLink href="/events" tone="secondary">Browse Available Events</ButtonLink>
            </div>
          }
        />
      ) : (
        <div className="space-y-10">
          {venueEventRows.length > 0 && (
            <section>
              <SectionHeading
                title="Venue Backstages"
                description="Events where the selected venue owns the booking workflow."
              />
              <div className="space-y-4">
                {venueEventRows.map((event) => (
                  <EventCard key={event.id} event={event} role="venue" />
                ))}
              </div>
            </section>
          )}

          {artistEvents.length > 0 && (
            <section>
              <SectionHeading
                title="Artist Backstages"
                description="Events where the selected artist has applied, been invited, or joined."
              />
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
