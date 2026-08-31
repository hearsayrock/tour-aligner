import Link from 'next/link'
import { notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { ApplyEventForm } from '@/components/events/ApplyEventForm'
import { formatEventDateLong, getAcceptedMemberships, getOpenArtistNeed } from '@/lib/events'
import {
  ACTIVE_IDENTITY_COOKIE,
  activeIdentityLabel,
  resolveActiveIdentity,
  type ManagedIdentity,
} from '@/lib/managed-identity'
import type { Event, EventArtistMembership } from '@/types/database'

type PublicEventDetail = Event & {
  venues: {
    name: string
    slug: string
    location_city: string
    location_state: string
    capacity: number | null
  } | null
  event_genres: Array<{ genres: { id: string; name: string } | null }> | null
  event_artist_memberships: Array<
    EventArtistMembership & {
      bands: { id: string; name: string; slug: string; user_id: string } | null
    }
  > | null
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('events').select('title, description').eq('slug', slug).single()
  return data ? { title: data.title, description: data.description } : {}
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = await createClient()
  const [{ data: rawEvent }, { data: { user } }] = await Promise.all([
    supabase
      .from('events')
      .select(`
        *,
        venues(name, slug, location_city, location_state, capacity),
        event_genres(genres(id, name)),
        event_artist_memberships(*, bands(id, name, slug, user_id))
      `)
      .eq('slug', slug)
      .single(),
    supabase.auth.getUser(),
  ])

  const event = rawEvent as unknown as PublicEventDetail | null
  if (!event || (!event.is_public && !user)) return notFound()

  const memberships = event.event_artist_memberships ?? []
  const acceptedMemberships = getAcceptedMemberships(memberships) as Array<
    EventArtistMembership & { bands: { id: string; name: string; slug: string; user_id: string } | null }
  >
  const acceptedCount = acceptedMemberships.length
  const openNeed = getOpenArtistNeed(event, memberships)
  const genres = (event.event_genres ?? []).map((entry) => entry.genres).filter(Boolean) as Array<{ id: string; name: string }>
  const publicLineup = event.lineup_published ? acceptedMemberships.filter((membership) => membership.bands) : []

  let userBands: Array<{ id: string; name: string }> = []
  let applyBands: Array<{ id: string; name: string }> = []
  let userVenues: Array<{ id: string; name: string }> = []
  let existingMembership: { id: string; status: EventArtistMembership['status'] } | null = null
  let identityNotice: { title: string; body: string } | null = null
  let activeVenueOwnsEvent = false
  let showApplyPanel = !user
  const backstageHref = `/dashboard/backstage/${event.id}`

  if (user) {
    const [{ data: bands }, { data: venues }] = await Promise.all([
      supabase
        .from('bands')
        .select('id, name')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('name'),
      supabase
        .from('venues')
        .select('id, name')
        .eq('claimed_by_user_id', user.id)
        .eq('is_active', true)
        .order('name'),
    ])

    userBands = bands ?? []
    userVenues = venues ?? []
    const identities: ManagedIdentity[] = [
      ...userBands.map((band) => ({
        kind: 'band' as const,
        id: band.id,
        name: band.name,
        href: `/dashboard/bands/${band.id}/edit`,
      })),
      ...userVenues.map((venue) => ({
        kind: 'venue' as const,
        id: venue.id,
        name: venue.name,
        href: `/dashboard/venues/${venue.id}/edit`,
      })),
    ]
    const cookieStore = await cookies()
    const activeIdentity = resolveActiveIdentity(cookieStore.get(ACTIVE_IDENTITY_COOKIE)?.value, identities)

    activeVenueOwnsEvent =
      activeIdentity.kind === 'venue' &&
      activeIdentity.id === event.venue_id &&
      userVenues.some((venue) => venue.id === event.venue_id)

    applyBands = activeIdentity.kind === 'band'
      ? userBands.filter((band) => band.id === activeIdentity.id)
      : []
    showApplyPanel = activeIdentity.kind === 'band' || activeIdentity.kind === 'all'
    const existing = activeIdentity.kind === 'band'
      ? memberships.find((membership) => membership.band_id === activeIdentity.id)
      : null
    if (existing) existingMembership = { id: existing.id, status: existing.status }
    identityNotice = userBands.length > 0 && activeIdentity.kind !== 'band'
      ? {
          title: activeIdentity.kind === 'all'
            ? 'Select an artist before applying'
            : 'Switch to an artist before applying',
          body: activeIdentity.kind === 'all'
            ? 'This application needs one artist identity. Choose an artist in the Acting as menu, then apply.'
            : `You are acting as ${activeIdentityLabel(activeIdentity)}. Switch the Acting as menu to an artist before applying to this event.`,
        }
      : null
  }

  return (
    <div className={`mx-auto max-w-5xl px-6 pb-10 ${user ? 'pt-8 lg:pt-10' : 'pt-24'}`}>
      <Link href="/events" className="text-sm text-[#888888] hover:text-[#252525]">
        Back to Available Events
      </Link>

      <div className="mt-5 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <main className="space-y-8">
          <section>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-4xl font-bold text-[#252525]">{event.title}</h1>
                <p className="mt-2 text-base text-[#666666]">
                  {event.venues?.name ?? 'Unknown venue'} · {formatEventDateLong(event)}
                </p>
                <p className="mt-1 text-sm text-[#888888]">
                  {event.venues ? [event.venues.location_city, event.venues.location_state].filter(Boolean).join(', ') : ''}
                </p>
              </div>
              <div className="rounded-2xl border border-[#E8E8E8] bg-white px-4 py-3 text-right text-sm">
                <p className="font-semibold text-[#252525]">{acceptedCount}/{event.needed_artist_count} artists</p>
                <p className={openNeed <= 0 ? 'mt-1 text-xs text-[#8A5A12]' : 'mt-1 text-xs text-[#777777]'}>
                  {openNeed <= 0 ? 'Needed count reached' : `${openNeed} open need${openNeed === 1 ? '' : 's'}`}
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {genres.map((genre) => (
                <span key={genre.id} className="rounded-full border border-[#E8E8E8] bg-white px-3 py-1 text-xs font-medium text-[#555555]">
                  {genre.name}
                </span>
              ))}
            </div>
          </section>

          <section id="event-description" className="scroll-mt-8 rounded-2xl border border-[#E8E8E8] bg-white p-6">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-[#888888]">Event</h2>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-[#252525]">{event.description}</p>
          </section>

          <section className="rounded-2xl border border-[#E8E8E8] bg-white p-6">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-[#888888]">Artists needed</h2>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-[#252525]">{event.artist_need_description}</p>
          </section>

          {event.lineup_published && (
            <section className="rounded-2xl border border-[#E8E8E8] bg-white p-6">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-[#888888]">Lineup</h2>
              {publicLineup.length > 0 ? (
                <div className="mt-4 space-y-3">
                  {publicLineup.map((membership) => (
                    <Link key={membership.id} href={`/bands/${membership.bands!.slug}`} target="_blank" rel="noopener noreferrer" className="block rounded-xl border border-[#E8E8E8] bg-[#FCFCFC] px-4 py-3 text-sm font-semibold text-[#252525] hover:border-[#CCCCCC]">
                      {membership.bands!.name}
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-[#888888]">Lineup has not been announced yet.</p>
              )}
            </section>
          )}
        </main>

        <aside className="space-y-5">
          {activeVenueOwnsEvent ? (
            <Link
              href={backstageHref}
              className="block w-full rounded-xl bg-[#FD6A2F] px-4 py-3 text-center text-sm font-semibold text-white hover:bg-[#E85D27]"
            >
              Open Backstage
            </Link>
          ) : showApplyPanel ? (
            <section className="rounded-2xl border border-[#E8E8E8] bg-white p-5">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-[#888888]">Apply</h2>
              <div className="mt-4">
                {user ? identityNotice ? (
                  <div className="rounded-2xl border border-[#F2D7A6] bg-[#FFF7E8] p-5">
                    <p className="text-sm font-semibold text-[#8A5A12]">{identityNotice.title}</p>
                    <p className="mt-2 text-sm leading-relaxed text-[#8A5A12]">{identityNotice.body}</p>
                  </div>
                ) : (
                  <ApplyEventForm
                    eventId={event.id}
                    bands={applyBands}
                    existingMembership={existingMembership}
                    backstageHref={backstageHref}
                  />
                ) : (
                  <p className="text-sm text-[#888888]">
                    <Link href={`/login?redirectTo=/events/${event.slug}`} className="text-[#FD6A2F] hover:underline">
                      Sign in
                    </Link>{' '}
                    with an artist profile to apply.
                  </p>
                )}
              </div>
            </section>
          ) : null}

          <section className="rounded-2xl border border-[#E8E8E8] bg-white p-5 text-sm">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#888888]">Capacity</p>
            <p className="mt-2 font-semibold text-[#252525]">{event.attendee_capacity.toLocaleString()} attendees</p>
          </section>
        </aside>
      </div>
    </div>
  )
}
