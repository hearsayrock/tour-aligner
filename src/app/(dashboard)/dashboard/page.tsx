import Link from 'next/link'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { AlertCircle, CalendarRange, CheckCircle2, Clock3, MapPin, Mic2, Plus, Search, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { MEMBERSHIP_STATUS_LABELS, formatEventDate, getAcceptedMemberships, getOpenArtistNeed } from '@/lib/events'
import { ACTIVE_IDENTITY_COOKIE, resolveActiveIdentity, type ManagedIdentity } from '@/lib/managed-identity'
import { Badge, ButtonLink, Card, EmptyState, PageHeader, SectionHeading, cx } from '@/components/ui/primitives'
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

type ActionItem = {
  href: string
  title: string
  detail: string
  profileLabel?: string
  tone: 'brand' | 'warning' | 'success' | 'info'
  icon: React.ComponentType<{ className?: string }>
}

function ProfileTag({ label }: { label: string }) {
  return (
    <span className="inline-flex max-w-full items-center rounded-full border border-[#E4E4E4] bg-[#F8F8F8] px-2.5 py-1 text-xs font-semibold text-[#5F5F5F]">
      <span className="truncate">{label}</span>
    </span>
  )
}

function DashboardEventCard({
  event,
  label,
  href,
  profileLabel,
}: {
  event: DashboardEvent
  label: string
  href: string
  profileLabel?: string
}) {
  const memberships = event.event_artist_memberships ?? []
  const acceptedCount = getAcceptedMemberships(memberships).length
  const openNeed = getOpenArtistNeed(event, memberships)

  return (
    <Link
      href={href}
      className="group block rounded-2xl border border-[#E6E6E6] bg-white p-5 shadow-[0_12px_28px_rgba(20,20,20,0.035)] transition-all hover:-translate-y-0.5 hover:border-[#D0D0D0] hover:shadow-[0_18px_38px_rgba(20,20,20,0.07)]"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold tracking-tight text-[#202020]">{event.title}</h3>
            <Badge tone="muted">{label}</Badge>
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
        </div>
        <div className="rounded-xl border border-[#EEEEEE] bg-[#FAFAFA] px-3 py-2 text-right text-sm">
          <p className="font-semibold text-[#252525]">{acceptedCount}/{event.needed_artist_count} artists</p>
          <p className={cx('mt-1 text-xs', openNeed <= 0 ? 'text-[#8A5A12]' : 'text-[#777777]')}>
            {openNeed <= 0 ? 'Lineup target reached' : `${openNeed} open spot${openNeed === 1 ? '' : 's'}`}
          </p>
        </div>
      </div>
      {profileLabel && (
        <div className="mt-4 flex justify-end">
          <ProfileTag label={profileLabel} />
        </div>
      )}
    </Link>
  )
}

function StatCard({
  label,
  value,
  icon: Icon,
  href,
}: {
  label: string
  value: number
  icon: React.ComponentType<{ className?: string }>
  href: string
}) {
  return (
    <Link href={href} className="rounded-2xl border border-[#E6E6E6] bg-white p-5 shadow-[0_12px_28px_rgba(20,20,20,0.035)] transition-all hover:-translate-y-0.5 hover:border-[#D0D0D0]">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-3xl font-bold tracking-tight text-[#202020]">{value}</p>
          <p className="mt-1 text-sm font-medium text-[#777777]">{label}</p>
        </div>
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#FFF3EE] text-[#FD6A2F]">
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </Link>
  )
}

function ActionQueue({ items }: { items: ActionItem[] }) {
  if (items.length === 0) {
    return (
      <Card className="p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#F3FBF8] text-[#0C7C71]">
            <CheckCircle2 className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-semibold text-[#252525]">Nothing urgent right now</h2>
            <p className="mt-1 text-sm leading-6 text-[#777777]">
              Your action queue is clear. New invites, applications, and venue claims will appear here.
            </p>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const Icon = item.icon
        return (
          <Link key={`${item.href}-${item.title}`} href={item.href} className="group flex items-start gap-3 rounded-2xl border border-[#E6E6E6] bg-white p-4 shadow-[0_12px_28px_rgba(20,20,20,0.035)] transition-all hover:-translate-y-0.5 hover:border-[#D0D0D0]">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#FFF3EE] text-[#FD6A2F]">
              <Icon className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-[#252525]">{item.title}</span>
                <Badge tone={item.tone}>{item.tone === 'warning' ? 'Needs review' : 'Open'}</Badge>
              </span>
              <span className="mt-1 block text-sm leading-6 text-[#777777]">{item.detail}</span>
              {item.profileLabel && (
                <span className="mt-2 block">
                  <ProfileTag label={item.profileLabel} />
                </span>
              )}
            </span>
          </Link>
        )
      })}
    </div>
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
  const totalProfileCount = allBandIds.length + allVenueIds.length
  const hasMultipleProfiles = totalProfileCount > 1
  const showProfileTags = hasMultipleProfiles && activeIdentity.kind === 'all'
  const bandNameById = new Map((bands ?? []).map((band) => [band.id, band.name]))
  const venueNameById = new Map((venues ?? []).map((venue) => [venue.id, venue.name]))
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
          .limit(8)
      : Promise.resolve({ data: [] }),
    bandIds.length
      ? supabase
          .from('event_artist_memberships')
          .select('id, band_id, status, events(*, venues(name, location_city, location_state, claimed_by_user_id), event_artist_memberships(status))')
          .in('band_id', bandIds)
          .in('status', ['applied', 'invited', 'accepted', 'removal_requested'])
          .limit(8)
      : Promise.resolve({ data: [] }),
  ])

  const artistEvents = ((artistMemberships ?? []) as unknown as Array<{
    id: string
    band_id: string
    status: EventArtistMembership['status']
    events: DashboardEvent | DashboardEvent[] | null
  }>)
    .map((row) => ({
      membershipId: row.id,
      bandId: row.band_id,
      status: row.status,
      event: Array.isArray(row.events) ? row.events[0] : row.events,
    }))
    .filter((row): row is { membershipId: string; bandId: string; status: EventArtistMembership['status']; event: DashboardEvent } => !!row.event)

  const venueEventRows = (venueEvents ?? []) as unknown as DashboardEvent[]
  const name = profile?.full_name?.split(' ')[0] ?? 'there'
  const hasAnyEvents = venueEventRows.length > 0 || artistEvents.length > 0
  const canCreateEvent = venueIds.length > 0
  const headerDescription = hasMultipleProfiles
    ? 'Your dashboard highlights booking work that needs attention, plus the next Backstages for the selected profile.'
    : 'Your dashboard highlights booking work that needs attention, plus your next Backstages.'
  const backstageDescription = hasMultipleProfiles
    ? 'The next events tied to the selected profile.'
    : 'The next events tied to your profile.'

  const actionItems: ActionItem[] = [
    ...((pendingClaims ?? []) as unknown as Array<VenueClaim & { venues: { name: string; location_city: string; location_state: string } | null }>).map((claim) => ({
      href: '/dashboard/venues?tab=mine',
      title: `${claim.venues?.name ?? 'Venue'} claim is pending`,
      detail: claim.venues ? [claim.venues.location_city, claim.venues.location_state].filter(Boolean).join(', ') : 'We will show approval here when it changes.',
      profileLabel: showProfileTags ? claim.venues?.name ?? 'Venue claim' : undefined,
      tone: 'warning' as const,
      icon: Clock3,
    })),
    ...artistEvents
      .filter(({ status }) => status === 'invited' || status === 'removal_requested')
      .map(({ bandId, event, status }) => ({
        href: status === 'invited' ? `/events/${event.slug}#event-description` : `/dashboard/backstage/${event.id}`,
        title: status === 'invited' ? `Invite from ${event.venues?.name ?? 'a venue'}` : `Removal request: ${event.title}`,
        detail: `${event.title} / ${formatEventDate(event)}`,
        profileLabel: showProfileTags ? bandNameById.get(bandId) : undefined,
        tone: status === 'invited' ? 'brand' as const : 'warning' as const,
        icon: AlertCircle,
      })),
    ...venueEventRows
      .filter((event) => event.status === 'draft' || getOpenArtistNeed(event, event.event_artist_memberships ?? []) > 0)
      .slice(0, 4)
      .map((event) => ({
        href: `/dashboard/backstage/${event.id}`,
        title: event.status === 'draft' ? `Draft event: ${event.title}` : `${event.title} still needs artists`,
        detail: `${formatEventDate(event)} / ${getAcceptedMemberships(event.event_artist_memberships ?? []).length}/${event.needed_artist_count} accepted`,
        profileLabel: showProfileTags ? venueNameById.get(event.venue_id) ?? event.venues?.name ?? 'Venue profile' : undefined,
        tone: event.status === 'draft' ? 'info' as const : 'brand' as const,
        icon: Users,
      })),
  ].slice(0, 6)

  const upcoming = [
    ...venueEventRows.map((event) => ({
      event,
      label: 'Venue leader',
      href: `/dashboard/backstage/${event.id}`,
      profileLabel: showProfileTags ? venueNameById.get(event.venue_id) ?? event.venues?.name : undefined,
    })),
    ...artistEvents.map(({ bandId, event, status }) => ({
      event,
      label: MEMBERSHIP_STATUS_LABELS[status],
      href: status === 'invited' ? `/events/${event.slug}#event-description` : `/dashboard/backstage/${event.id}`,
      profileLabel: showProfileTags ? bandNameById.get(bandId) : undefined,
    })),
  ]
    .sort((a, b) => a.event.event_date.localeCompare(b.event.event_date))
    .slice(0, 6)

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <PageHeader
        eyebrow="Action center"
        title={`Hey, ${name}`}
        description={headerDescription}
        actions={
          <>
            {canCreateEvent && (
              <ButtonLink href="/dashboard/events/new">
                <Plus className="h-4 w-4" />
                Create Event
              </ButtonLink>
            )}
            <ButtonLink href="/events" tone="secondary">
              <Search className="h-4 w-4" />
              Browse Events
            </ButtonLink>
          </>
        }
      />

      <div className={cx('grid gap-4', hasMultipleProfiles ? 'sm:grid-cols-2 lg:grid-cols-3' : 'max-w-sm')}>
        <StatCard label="Active Backstages" value={venueEventRows.length + artistEvents.length} icon={CalendarRange} href="/dashboard/backstage" />
        {hasMultipleProfiles && allBandIds.length > 0 && (
          <StatCard label={allBandIds.length === 1 ? 'Artist profile' : 'Artist profiles'} value={allBandIds.length} icon={Mic2} href="/dashboard/bands?tab=mine" />
        )}
        {hasMultipleProfiles && allVenueIds.length > 0 && (
          <StatCard label={allVenueIds.length === 1 ? 'Venue profile' : 'Venue profiles'} value={allVenueIds.length} icon={MapPin} href="/dashboard/venues?tab=mine" />
        )}
      </div>

      <div className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,1fr)_380px]">
        <main>
          <SectionHeading
            title="Upcoming Backstages"
            description={backstageDescription}
            action={<Link href="/dashboard/backstage" className="text-sm font-semibold text-[#777777] hover:text-[#252525]">View all</Link>}
          />
          {!hasAnyEvents ? (
            <EmptyState
              title="No Backstages yet"
              description="Venues can create Events to open a Backstage. Artists can browse available events and apply."
              action={
                <div className="flex flex-wrap justify-center gap-2">
                  {canCreateEvent ? (
                    <ButtonLink href="/dashboard/events/new">Create Event</ButtonLink>
                  ) : allVenueIds.length === 0 ? (
                    <ButtonLink href="/dashboard/venues">Claim a Venue</ButtonLink>
                  ) : null}
                  <ButtonLink href="/events" tone="secondary">Browse Events</ButtonLink>
                </div>
              }
            />
          ) : (
            <div className="space-y-4">
              {upcoming.map(({ event, label, href, profileLabel }) => (
                <DashboardEventCard key={`${event.id}-${label}`} event={event} label={label} href={href} profileLabel={profileLabel} />
              ))}
            </div>
          )}
        </main>

        <aside className="space-y-8">
          <section>
            <SectionHeading title="Needs Attention" description="Invites, drafts, open spots, and claims." />
            <ActionQueue items={actionItems} />
          </section>

          <Card className="p-5">
            <SectionHeading title="Quick Starts" description="Common next steps for booking work." />
            <div className="grid gap-2">
              {canCreateEvent && (
                <ButtonLink href="/dashboard/events/new" tone="secondary">
                  <Plus className="h-4 w-4" />
                  Create Event
                </ButtonLink>
              )}
              <ButtonLink href="/events" tone="secondary">
                <Search className="h-4 w-4" />
                Browse Events
              </ButtonLink>
              <ButtonLink href="/venues" tone="secondary">
                <Search className="h-4 w-4" />
                Discover Venues
              </ButtonLink>
            </div>
          </Card>
        </aside>
      </div>
    </div>
  )
}
