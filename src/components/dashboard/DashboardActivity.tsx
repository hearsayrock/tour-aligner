import Link from 'next/link'
import { ArrowUpRight, CalendarDays, CheckCircle2, ChevronRight, Clock3, FilePenLine, Layers3, Mail, UserMinus, Users } from 'lucide-react'
import { Badge, Card, SectionHeading } from '@/components/ui/primitives'
import { DashboardDiscoverySection, DashboardStartingPoint } from '@/components/dashboard/DashboardDiscovery'
import { MEMBERSHIP_STATUS_LABELS, eventBackstageHref, formatEventDate, getAcceptedMemberships, getOpenArtistNeed } from '@/lib/events'
import type { buildDashboardActivity, DashboardAction, DashboardScheduleItem } from '@/lib/dashboard-activity'
import { EMPTY_DISCOVERY, type DashboardDiscovery } from '@/lib/dashboard-discovery'
import type { ActiveIdentity, ManagedIdentity } from '@/lib/managed-identity'

type Activity = ReturnType<typeof buildDashboardActivity>

function actionLabel(item: DashboardAction) {
  switch (item.kind) {
    case 'invite': return 'Respond to invite'
    case 'applications': return `Review ${item.count} application${item.count === 1 ? '' : 's'}`
    case 'removals': return `Review ${item.count} removal request${item.count === 1 ? '' : 's'}`
    case 'draft': return 'Finish draft'
    case 'artists': return `Fill ${item.count} open spot${item.count === 1 ? '' : 's'}`
  }
}

const actionIcons = { invite: Mail, applications: Users, removals: UserMinus, draft: FilePenLine, artists: Users }
const focusClass = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand'

function ActionRows({ items, hideVenue }: { items: DashboardAction[]; hideVenue: boolean }) {
  return (
    <ul className="divide-y divide-border">
      {items.map((item) => {
        const Icon = actionIcons[item.kind]
        const href = eventBackstageHref(item.event.slug, { invite: item.kind === 'invite' })
        return (
          <li key={item.id}>
            <Link href={href} className={`flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3.5 transition-colors hover:bg-surface sm:flex-nowrap sm:px-5 ${focusClass}`}>
              <span className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-tint text-rust sm:flex">
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1 basis-full sm:basis-auto">
                <span className="block font-semibold text-ink">{item.event.title}</span>
                <span className="mt-0.5 block text-sm text-text-secondary">
                  {formatEventDate(item.event)}
                  {!hideVenue && item.event.venues && ` · ${item.event.venues.name}`}
                  {item.profileLabel && item.profileLabel !== item.event.venues?.name && ` · ${item.profileLabel}`}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-1 text-sm font-semibold text-brand-tint-text">
                {actionLabel(item)}<ChevronRight className="h-4 w-4" aria-hidden="true" />
              </span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

function ScheduleRow({ item, hideVenue, showProfiles }: { item: DashboardScheduleItem; hideVenue: boolean; showProfiles: boolean }) {
  const { event, artists, isVenue } = item
  const acceptedCount = getAcceptedMemberships(event.event_artist_memberships ?? []).length
  const openSpots = Math.max(0, getOpenArtistNeed(event, event.event_artist_memberships ?? []))
  return (
    <li>
      <Link href={`/events/${event.slug}`} className={`flex flex-col gap-2 px-4 py-4 transition-colors hover:bg-surface sm:flex-row sm:items-center sm:gap-5 sm:px-5 ${focusClass}`}>
        <time dateTime={`${event.event_date}T${event.start_time}`} className="shrink-0 text-sm font-medium text-text-secondary sm:w-44">
          {formatEventDate(event)}
        </time>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold text-ink">{event.title}</span>
          {!hideVenue && <span className="mt-0.5 block text-sm text-text-secondary">{event.venues?.name ?? 'Unknown venue'}</span>}
          {showProfiles && artists.length > 0 && (
            <span className="mt-1 flex flex-wrap gap-1.5">
              {artists.map((artist) => <Badge key={artist.id} tone={artist.status === 'accepted' ? 'success' : 'warning'}>{artist.name}: {MEMBERSHIP_STATUS_LABELS[artist.status]}</Badge>)}
            </span>
          )}
        </span>
        {isVenue ? (
          <span className="shrink-0 text-sm text-text-secondary sm:text-right">
            <span className="block">{acceptedCount}/{event.needed_artist_count} artists</span>
            {event.is_accepting_artists && openSpots > 0 && <span className="mt-0.5 block text-xs text-brand-tint-text">{openSpots} open spot{openSpots === 1 ? '' : 's'}</span>}
          </span>
        ) : !showProfiles && artists[0] ? (
          <Badge tone={artists[0].status === 'accepted' ? 'success' : 'warning'} className="self-start sm:self-auto">{MEMBERSHIP_STATUS_LABELS[artists[0].status]}</Badge>
        ) : null}
        <ChevronRight className="hidden h-4 w-4 shrink-0 text-text-subtle sm:block" aria-hidden="true" />
      </Link>
    </li>
  )
}

export function DashboardActivityView({ activity, activeIdentity, identities, discovery = EMPTY_DISCOVERY }: {
  activity: Activity
  activeIdentity: ActiveIdentity
  identities: ManagedIdentity[]
  discovery?: DashboardDiscovery
}) {
  const { actions, upcoming, waiting, claims } = activity
  const profileKind = activeIdentity.kind
  const hideVenue = profileKind === 'venue'
  const waitingCount = waiting.length + claims.length
  const hasDecisions = actions.some((action) => ['invite', 'applications', 'removals'].includes(action.kind))
  const startingPoint = <DashboardStartingPoint activity={activity} activeIdentity={activeIdentity} identities={identities} />
  return (
    <div className="dashboard-content">
      {!hasDecisions && startingPoint}
      {actions.length > 0 && (
        <section aria-label="Needs Attention">
          <SectionHeading title="Needs Attention" />
          <Card as="div" className="overflow-hidden">
            <ActionRows items={actions.slice(0, 5)} hideVenue={hideVenue} />
            {actions.length > 5 && (
              <details className="border-t border-border">
                <summary className={`cursor-pointer px-5 py-3 text-sm font-semibold text-brand-tint-text ${focusClass}`}>Show {actions.length - 5} more</summary>
                <ActionRows items={actions.slice(5)} hideVenue={hideVenue} />
              </details>
            )}
          </Card>
        </section>
      )}

      {hasDecisions && startingPoint}

      {upcoming.length > 0 && (
        <section aria-label="Upcoming Backstages">
          <SectionHeading title="Upcoming Backstages" action={<Link href="/dashboard/backstage" className="text-sm font-semibold text-text-secondary hover:text-ink">View all</Link>} />
          <Card as="div" className="overflow-hidden">
            <ul className="divide-y divide-border">
              {upcoming.slice(0, 6).map((item) => <ScheduleRow key={item.event.id} item={item} hideVenue={hideVenue} showProfiles={profileKind === 'all'} />)}
            </ul>
          </Card>
        </section>
      )}

      {waitingCount > 0 && (
        <details className="rounded-2xl border border-border bg-white">
          <summary className={`cursor-pointer rounded-2xl px-5 py-4 text-sm font-semibold text-text-secondary ${focusClass}`}>Waiting on a response ({waitingCount})</summary>
          <ul className="divide-y divide-border border-t border-border">
            {waiting.map((item) => (
              <li key={item.id}>
                <Link href={`/events/${item.event.slug}`} className={`flex items-start gap-3 px-5 py-3 hover:bg-surface ${focusClass}`}>
                  <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-text-subtle" aria-hidden="true" />
                  <span className="min-w-0 text-sm">
                    <span className="block font-medium text-ink">{item.event.title}</span>
                    <span className="mt-0.5 block text-text-secondary">{item.kind === 'application' ? 'Application sent' : 'Removal requested'} · {formatEventDate(item.event)}{item.profileLabel && ` · ${item.profileLabel}`}</span>
                  </span>
                </Link>
              </li>
            ))}
            {claims.map((claim) => (
              <li key={claim.id}>
                <Link href="/dashboard/venues?tab=mine" className={`flex items-start gap-3 px-5 py-3 hover:bg-surface ${focusClass}`}>
                  <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-text-subtle" aria-hidden="true" />
                  <span className="text-sm"><span className="block font-medium text-ink">{claim.venues?.name ?? 'Venue claim'}</span><span className="mt-0.5 block text-text-secondary">Claim pending review</span></span>
                </Link>
              </li>
            ))}
          </ul>
        </details>
      )}

      <div className={discovery.kind ? 'dashboard-lower' : 'dashboard-lower agenda-only'}>
        {discovery.kind && <DashboardDiscoverySection discovery={discovery} />}
        <section aria-labelledby="workspace-agenda" className="dashboard-agenda">
          <div className="workspace-section-head"><h2 id="workspace-agenda">Your workspace</h2></div>
          <div className="agenda-links">
            <Link href={profileKind === 'all' ? '/dashboard/profiles' : activeIdentity.href}>
              <Layers3 aria-hidden="true" /><span><b>{profileKind === 'all' ? 'Your Studios' : activeIdentity.name}</b><small>{profileKind === 'all' ? 'Manage profiles' : profileKind === 'band' ? 'Open Artist Studio' : 'Open Venue Studio'}</small></span><ArrowUpRight aria-hidden="true" />
            </Link>
            <Link href="/dashboard/calendar">
              <CalendarDays aria-hidden="true" /><span><b>Calendar</b><small>View dates for your profiles</small></span><ArrowUpRight aria-hidden="true" />
            </Link>
            <Link href="/dashboard/backstage">
              {actions.length ? <Mail aria-hidden="true" /> : <CheckCircle2 aria-hidden="true" />}
              <span><b>Backstages</b><small>{actions.length ? `${actions.length} ${actions.length === 1 ? 'item needs' : 'items need'} attention` : 'You’re all caught up.'}</small></span><ArrowUpRight aria-hidden="true" />
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}

export function DashboardActivitySkeleton() {
  return (
    <div aria-label="Loading dashboard activity" role="status" className="space-y-7">
      {[2, 3].map((rows, index) => (
        <div key={index} className="space-y-4">
          <div className="h-6 w-44 animate-pulse rounded-lg bg-surface-2" />
          <div className="overflow-hidden rounded-2xl border border-border bg-white/70">
            {Array.from({ length: rows }, (_, row) => <div key={row} className="h-20 animate-pulse border-b border-border last:border-b-0" />)}
          </div>
        </div>
      ))}
    </div>
  )
}
