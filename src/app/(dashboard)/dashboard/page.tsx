import Link from 'next/link'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { MEMBERSHIP_STATUS_LABELS, formatEventDate, getAcceptedMemberships, getOpenArtistNeed } from '@/lib/events'
import { ACTIVE_IDENTITY_COOKIE, resolveActiveIdentity, type ManagedIdentity } from '@/lib/managed-identity'
import type { Event, EventArtistMembership, VenueClaim } from '@/types/database'

export const metadata = { title: 'Dashboard' }

type DashboardEvent = Event & {
  venues: {
    name: string
    location_city: string
    location_state: string
    claimed_by_user_id: string | null
  } | null
  event_artist_memberships: Array<Pick<EventArtistMembership, 'status'>> | null
}

function DashboardEventCard({
  event,
  label,
}: {
  event: DashboardEvent
  label: string
}) {
  const memberships = event.event_artist_memberships ?? []
  const acceptedCount = getAcceptedMemberships(memberships).length
  const openNeed = getOpenArtistNeed(event, memberships)

  return (
    <Link href={`/dashboard/backstage/${event.id}`} className="block rounded-2xl border border-[#E8E8E8] bg-white p-5 transition-colors hover:border-[#CCCCCC]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-[#252525]">{event.title}</h2>
            <span className="rounded-full border border-[#E8E8E8] bg-[#FAFAFA] px-2 py-0.5 text-xs text-[#777777]">
              {label}
            </span>
          </div>
          <p className="mt-1 text-sm text-[#777777]">
            {event.venues?.name ?? 'Unknown venue'} · {formatEventDate(event)}
          </p>
          <p className="mt-1 text-sm text-[#888888]">
            {event.venues ? [event.venues.location_city, event.venues.location_state].filter(Boolean).join(', ') : ''}
          </p>
        </div>
        <div className="text-right text-sm">
          <p className="font-semibold text-[#252525]">{acceptedCount}/{event.needed_artist_count} artists</p>
          <p className={openNeed <= 0 ? 'mt-1 text-xs text-[#8A5A12]' : 'mt-1 text-xs text-[#777777]'}>
            {openNeed <= 0 ? 'Needed count reached' : `${openNeed} open need${openNeed === 1 ? '' : 's'}`}
          </p>
          {event.is_public && <p className="mt-1 text-xs text-[#0C7C71]">Public</p>}
        </div>
      </div>
    </Link>
  )
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return redirect('/login')

  const [{ data: profile }, { data: bands }, { data: venues }, { data: pendingClaims }] = await Promise.all([
    supabase.from('profiles').select('full_name').eq('id', user.id).single(),
    supabase.from('bands').select('id, name').eq('user_id', user.id).eq('is_active', true),
    supabase.from('venues').select('id, name').eq('claimed_by_user_id', user.id).eq('is_active', true),
    supabase
      .from('venue_claims')
      .select('id, created_at, venues(id, name, slug, location_city, location_state)')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false }),
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
  const activeIdentity = resolveActiveIdentity(cookieStore.get(ACTIVE_IDENTITY_COOKIE)?.value, identities)
  const allBandIds = (bands ?? []).map((band) => band.id)
  const allVenueIds = (venues ?? []).map((venue) => venue.id)
  const bandIds = activeIdentity.kind === 'all'
    ? allBandIds
    : activeIdentity.kind === 'band'
      ? [activeIdentity.id]
      : []
  const venueIds = activeIdentity.kind === 'all'
    ? allVenueIds
    : activeIdentity.kind === 'venue'
      ? [activeIdentity.id]
      : []

  const [{ data: venueEvents }, { data: artistMemberships }] = await Promise.all([
    venueIds.length
      ? supabase
          .from('events')
          .select('*, venues(name, location_city, location_state, claimed_by_user_id), event_artist_memberships(status)')
          .in('venue_id', venueIds)
          .in('status', ['draft', 'active'])
          .order('event_date', { ascending: true })
          .limit(5)
      : Promise.resolve({ data: [] }),
    bandIds.length
      ? supabase
          .from('event_artist_memberships')
          .select('status, events(*, venues(name, location_city, location_state, claimed_by_user_id), event_artist_memberships(status))')
          .in('band_id', bandIds)
          .in('status', ['applied', 'invited', 'accepted', 'removal_requested'])
          .limit(5)
      : Promise.resolve({ data: [] }),
  ])

  const artistEvents = ((artistMemberships ?? []) as unknown as Array<{
    status: EventArtistMembership['status']
    events: DashboardEvent | DashboardEvent[] | null
  }>)
    .map((row) => ({
      status: row.status,
      event: Array.isArray(row.events) ? row.events[0] : row.events,
    }))
    .filter((row): row is { status: EventArtistMembership['status']; event: DashboardEvent } => !!row.event)

  const name = profile?.full_name?.split(' ')[0] ?? 'there'
  const hasAnyEvents = (venueEvents ?? []).length > 0 || artistEvents.length > 0
  const canCreateEvent = venueIds.length > 0
  const hasMultipleProfiles = identities.length > 1

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#252525]">Hey, {name}</h1>
          <p className="mt-1 text-sm text-[#888888]">Your Events and Backstages are the center of the workflow.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canCreateEvent && (
            <Link href="/dashboard/events/new" className="rounded-xl bg-[#FD6A2F] px-4 py-2.5 text-sm font-semibold text-white">
              Create Event
            </Link>
          )}
          <Link href="/events" className="rounded-xl border border-[#E8E8E8] bg-white px-4 py-2.5 text-sm font-semibold text-[#252525]">
            Available Events
          </Link>
        </div>
      </div>

      {hasMultipleProfiles && (
        <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Link href="/dashboard/backstage" className="rounded-2xl border border-[#E8E8E8] bg-white p-5">
            <p className="text-3xl font-bold">{(venueEvents ?? []).length + artistEvents.length}</p>
            <p className="mt-1 text-sm text-[#888888]">Active Backstages</p>
          </Link>
          <Link href="/dashboard/bands" className="rounded-2xl border border-[#E8E8E8] bg-white p-5">
            <p className="text-3xl font-bold">{allBandIds.length}</p>
            <p className="mt-1 text-sm text-[#888888]">{allBandIds.length === 1 ? 'Artist' : 'Artists'}</p>
          </Link>
          <Link href="/dashboard/venues" className="rounded-2xl border border-[#E8E8E8] bg-white p-5">
            <p className="text-3xl font-bold">{allVenueIds.length}</p>
            <p className="mt-1 text-sm text-[#888888]">{allVenueIds.length === 1 ? 'Venue' : 'Venues'}</p>
          </Link>
        </div>
      )}

      {!hasAnyEvents && (pendingClaims ?? []).length === 0 && (
        <div className="rounded-2xl border border-[#E8E8E8] bg-white p-12 text-center">
          <h2 className="text-lg font-semibold text-[#252525]">No Backstages yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-[#888888]">
            Venues create Events to open a Backstage. Artists can browse Available Events and apply.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            {canCreateEvent ? (
              <Link href="/dashboard/events/new" className="rounded-xl bg-[#FD6A2F] px-5 py-2.5 text-sm font-semibold text-white">
                Create Event
              </Link>
            ) : allVenueIds.length === 0 ? (
              <Link href="/dashboard/venues" className="rounded-xl bg-[#FD6A2F] px-5 py-2.5 text-sm font-semibold text-white">
                Claim a venue
              </Link>
            ) : null}
            <Link href="/events" className="rounded-xl border border-[#E8E8E8] px-5 py-2.5 text-sm font-semibold text-[#252525]">
              Browse Available Events
            </Link>
          </div>
        </div>
      )}

      <div className="space-y-10">
        {(venueEvents ?? []).length > 0 && (
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-[#888888]">Venue Backstages</h2>
              <Link href="/dashboard/backstage" className="text-xs text-[#888888] hover:text-[#252525]">View all</Link>
            </div>
            <div className="space-y-4">
              {((venueEvents ?? []) as unknown as DashboardEvent[]).map((event) => (
                <DashboardEventCard key={event.id} event={event} label="Venue leader" />
              ))}
            </div>
          </section>
        )}

        {artistEvents.length > 0 && (
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-[#888888]">Artist Backstages</h2>
              <Link href="/dashboard/backstage" className="text-xs text-[#888888] hover:text-[#252525]">View all</Link>
            </div>
            <div className="space-y-4">
              {artistEvents.map(({ event, status }) => (
                <DashboardEventCard key={`${event.id}-${status}`} event={event} label={MEMBERSHIP_STATUS_LABELS[status]} />
              ))}
            </div>
          </section>
        )}

        {(pendingClaims ?? []).length > 0 && (
          <section>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-[#888888]">Pending venue claims</h2>
            <div className="space-y-3">
              {((pendingClaims ?? []) as unknown as Array<VenueClaim & { venues: { name: string; location_city: string; location_state: string } | null }>).map((claim) => (
                <div key={claim.id} className="rounded-2xl border border-yellow-200 bg-white p-5">
                  <p className="font-semibold text-[#252525]">{claim.venues?.name ?? 'Venue'}</p>
                  <p className="mt-1 text-sm text-[#888888]">
                    {claim.venues ? [claim.venues.location_city, claim.venues.location_state].filter(Boolean).join(', ') : ''}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
