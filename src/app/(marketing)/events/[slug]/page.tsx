import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { ApplyEventForm } from '@/components/events/ApplyEventForm'
import { BackstageWorkspace } from '@/components/events/BackstageWorkspace'
import { EventAppearanceEditor } from '@/components/events/EventAppearanceEditor'
import { EventLogisticsDisplay } from '@/components/events/EventLogisticsDisplay'
import { createEventPageSections, eventFrameStyle, EventPageHero, type EventOverviewData } from '@/components/events/EventOverview'
import { DEFAULT_EVENT_BACKGROUND_COLOR, DEFAULT_EVENT_BACKGROUND_OPACITY, normalizeEventPageLayout } from '@/components/events/event-page-config'
import { EventProfileSwitcher } from '@/components/events/EventProfileSwitcher'
import { EventShareButton } from '@/components/events/EventShareButton'
import { ProfilePageCanvas } from '@/components/profile-page/ProfilePageCanvas'
import { getVenueProfileAppearance, parseVenueProfileTheme } from '@/components/profile-page/venue/venue-page-config'
import { Badge, ButtonLink, Card, SectionHeading } from '@/components/ui/primitives'
import { eventIsAvailable, formatEventDateLong, getAcceptedMemberships, type EventGenreSummary, type EventMembershipSummary } from '@/lib/events'
import { ACTIVE_IDENTITY_COOKIE, activeIdentityLabel, resolveActiveIdentity, type ManagedIdentity } from '@/lib/managed-identity'
import { createClient } from '@/lib/supabase/server'
import type { Event, EventArtistMembership, Json } from '@/types/database'

type EventDetail = Event & {
  venues: {
    name: string
    location_city: string
    location_state: string
    profile_theme: Json | null
  } | null
  event_genres: EventGenreSummary[] | null
  event_artist_memberships: EventMembershipSummary[] | null
}

function hasBackstageAccess(status: EventArtistMembership['status'] | undefined) {
  return status === 'invited' || status === 'accepted' || status === 'removal_requested'
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('events').select('title, description').eq('slug', slug).eq('is_public', true).maybeSingle()
  return data ? { title: data.title, description: data.description } : { title: 'Event', robots: { index: false } }
}

export default async function EventDetailPage({ params, searchParams }: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ edit?: string; invite?: string }>
}) {
  const [{ slug }, { edit, invite }] = await Promise.all([params, searchParams])
  const supabase = await createClient()
  const [{ data: rawEvent }, { data: { user } }] = await Promise.all([
    supabase
      .from('events')
      .select(`
        *,
        venues(name, location_city, location_state, profile_theme),
        event_genres(genres(id, name)),
        event_artist_memberships(*, bands(id, name, slug, user_id))
      `)
      .eq('slug', slug)
      .maybeSingle(),
    supabase.auth.getUser(),
  ])

  const eventHref = '/events/' + encodeURIComponent(slug)
  const loginHref = '/login?redirectTo=' + encodeURIComponent(eventHref)
  if (!user && invite === '1') redirect(loginHref)

  const event = rawEvent as unknown as EventDetail | null
  if (!event || (!event.is_public && !user)) notFound()

  const memberships = event.event_artist_memberships ?? []
  const genres = (event.event_genres ?? []).flatMap((entry) => entry.genres ? [entry.genres] : [])
  const identities: ManagedIdentity[] = []

  if (user) {
    const [{ data: bands }, { data: venues }] = await Promise.all([
      supabase.from('bands').select('id, name').eq('user_id', user.id).eq('is_active', true).order('name'),
      supabase.from('venues').select('id, name').eq('claimed_by_user_id', user.id).eq('is_active', true).order('name'),
    ])
    for (const band of bands ?? []) {
      identities.push({ kind: 'band', ...band, href: '/dashboard/bands/' + band.id + '/edit' })
    }
    for (const venue of venues ?? []) {
      identities.push({ kind: 'venue', ...venue, href: '/dashboard/venues/' + venue.id + '/edit' })
    }
  }

  const backstageIdentities = identities.filter((identity) =>
    identity.kind === 'venue' ? identity.id === event.venue_id :
      memberships.some((membership) => membership.band_id === identity.id && hasBackstageAccess(membership.status))
  )
  if (!event.is_public && backstageIdentities.length === 0) notFound()

  const cookieStore = await cookies()
  const identity = resolveActiveIdentity(cookieStore.get(ACTIVE_IDENTITY_COOKIE)?.value, identities)
  const viewerMembership = identity.kind === 'band'
    ? memberships.find((membership) => membership.band_id === identity.id) ?? null
    : null
  const isVenueLeader = identity.kind === 'venue' && identity.id === event.venue_id
  const applicationMembership = viewerMembership && {
    id: viewerMembership.id,
    status: viewerMembership.status,
    source: viewerMembership.source,
    invitation_note: viewerMembership.status === 'invited' ? viewerMembership.invitation_note : null,
  }
  const isInvited = applicationMembership?.status === 'invited'
  const canChat = isVenueLeader || viewerMembership?.status === 'accepted' || viewerMembership?.status === 'removal_requested'
  const showSwitcher = !isVenueLeader && !hasBackstageAccess(viewerMembership?.status) && backstageIdentities.length > 0
  const acceptedMemberships = getAcceptedMemberships(memberships)

  const signImage = async (path: string | null) => {
    if (!path) return null
    const { data } = await supabase.storage.from('event-covers').createSignedUrl(path, 900)
    return data?.signedUrl ?? null
  }
  const [cover, backgroundUrl, { data: publishedArtists }, { data: logistics, error: logisticsError }] = await Promise.all([
    signImage(event.cover_photo_path),
    signImage(event.background_photo_path),
    event.is_public && event.lineup_published
      ? supabase.rpc('get_public_event_lineup', { p_event_id: event.id })
      : { data: null },
    canChat || isInvited
      ? supabase.from('event_logistics').select('*').eq('event_id', event.id).maybeSingle()
      : { data: null, error: null },
  ])

  const lineup = event.is_public
    ? (publishedArtists ?? []).map((artist) => ({
      id: artist.membership_id, name: artist.artist_name, slug: artist.artist_slug,
    }))
    : acceptedMemberships.flatMap((membership) =>
      membership.bands ? [{ id: membership.id, name: membership.bands.name, slug: membership.bands.slug }] : []
    )
  const inheritedAccent = getVenueProfileAppearance(parseVenueProfileTheme(event.venues?.profile_theme)).accent
  const layout = normalizeEventPageLayout(event.page_layout)
  const backgroundColor = event.page_background_color ?? DEFAULT_EVENT_BACKGROUND_COLOR
  const backgroundOpacity = event.background_photo_opacity ?? DEFAULT_EVENT_BACKGROUND_OPACITY
  const showArtistNeed = eventIsAvailable(event) || Boolean(viewerMembership) ||
    (isVenueLeader && event.is_accepting_artists && (event.status === 'draft' || event.status === 'active'))
  const overview: EventOverviewData = {
    title: event.title,
    description: event.description,
    date: formatEventDateLong(event),
    venue: event.venues?.name ?? 'Unknown venue',
    location: [event.venues?.location_city, event.venues?.location_state].filter(Boolean).join(', '),
    accent: event.accent_color ?? inheritedAccent,
    cover,
    capacity: event.attendee_capacity,
    artistNeed: showArtistNeed ? event.artist_need_description : null,
    genres: genres.map((genre) => genre.name),
    lineup: event.lineup_published ? lineup : null,
  }

  if (isVenueLeader && edit === '1') {
    return (
      <EventAppearanceEditor
        eventId={event.id}
        eventHref={eventHref}
        event={overview}
        layout={layout}
        coverPath={event.cover_photo_path ?? null}
        backgroundPath={event.background_photo_path ?? null}
        backgroundUrl={backgroundUrl}
        backgroundColor={backgroundColor}
        backgroundOpacity={backgroundOpacity}
        accentOverride={event.accent_color ?? null}
        inheritedAccent={inheritedAccent}
        isPublic={event.is_public}
      />
    )
  }

  const showApplication = event.is_public && !canChat && !isInvited && !showSwitcher &&
    identity.kind !== 'venue' && (Boolean(viewerMembership) || eventIsAvailable(event))
  const showActions = user || event.is_public || event.status === 'cancelled'
  const hero = (
    <EventPageHero event={overview} actions={showActions ? (
      <>
        {user && <Link href="/events" className="mr-auto text-sm font-semibold text-white hover:underline">Back to Available Events</Link>}
        {event.status === 'cancelled' && <Badge tone="danger">Event cancelled</Badge>}
        {isVenueLeader && (
          <>
            <Badge tone={event.is_public ? 'success' : 'muted'}>{event.is_public ? 'Published' : 'Private event'}</Badge>
            <ButtonLink href={eventHref + '?edit=1'}>Edit event page</ButtonLink>
          </>
        )}
        {canChat && <ButtonLink href="#backstage" tone="secondary">Open Backstage</ButtonLink>}
        {event.is_public && <EventShareButton href={eventHref} />}
      </>
    ) : undefined} />
  )

  const inviteAndApply = isInvited || showSwitcher || showApplication ? (
    <div className="mx-auto grid max-w-7xl gap-4 px-6 pt-6 lg:px-8">
      {isInvited && (
        <Card className="p-5">
          <SectionHeading title="Backstage invitation" />
          <ApplyEventForm
            eventId={event.id}
            bands={[]}
            existingMembership={applicationMembership}
            declineHref={event.is_public ? undefined : '/dashboard/backstage'}
          />
        </Card>
      )}
      {showSwitcher && <EventProfileSwitcher identities={backstageIdentities} />}
      {showApplication && (
        <Card className="p-5">
          <SectionHeading title="Apply" />
          {!user ? (
            <p className="text-sm text-[#666666]">
              <Link href={loginHref} className="font-semibold text-[#A84216] hover:underline">Sign in</Link>{' '}
              with an artist profile to apply.
            </p>
          ) : identity.kind === 'all' && identities.some((item) => item.kind === 'band') ? (
            <p className="text-sm text-[#666666]">Choose an artist in the Acting as menu to apply. Your current profile is {activeIdentityLabel(identity)}.</p>
          ) : (
            <ApplyEventForm
              eventId={event.id}
              bands={identity.kind === 'band' ? [identity] : []}
              existingMembership={applicationMembership}
            />
          )}
        </Card>
      )}
    </div>
  ) : null

  return (
    <>
      <ProfilePageCanvas
        layout={layout}
        hero={<>{hero}{inviteAndApply}</>}
        sections={createEventPageSections(overview)}
        className={user ? undefined : 'pt-16'}
        style={{ ...eventFrameStyle(backgroundColor, backgroundUrl, backgroundOpacity), minHeight: 0 }}
      />

      {(canChat || isInvited) && (
        <div className="mx-auto max-w-7xl px-6 pb-10 lg:px-8">
          {(canChat || isInvited) && logisticsError && (
            <p role="alert" className="mt-6 text-sm text-red-600">Could not load Backstage logistics. Refresh the page to try again.</p>
          )}
          {isInvited && !logisticsError && (
            <Card className="mt-6 p-5">
              <SectionHeading title="Pinned Logistics" description="Review the show details before you respond." />
              <EventLogisticsDisplay logistics={logistics} />
            </Card>
          )}
          {canChat && identity.kind !== 'all' && !logisticsError && (
            <BackstageWorkspace
              event={event}
              eventHref={eventHref}
              venueName={overview.venue}
              memberships={memberships}
              selectedGenreIds={genres.map((genre) => genre.id)}
              logistics={logistics}
              activeIdentity={identity}
              viewerMembership={viewerMembership}
              isVenueLeader={isVenueLeader}
            />
          )}
        </div>
      )}
    </>
  )
}
