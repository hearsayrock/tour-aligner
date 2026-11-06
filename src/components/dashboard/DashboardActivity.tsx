import Link from 'next/link'
import { CheckCircle2, ChevronRight, Clock3, FilePenLine, Mail, UserMinus, Users } from 'lucide-react'
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
const focusClass = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#FD6A2F]'

function ActionRows({ items, hideVenue }: { items: DashboardAction[]; hideVenue: boolean }) {
  return (
    <ul className="divide-y divide-[#EEEEEE]">
      {items.map((item) => {
        const Icon = actionIcons[item.kind]
        const href = eventBackstageHref(item.event.slug, { invite: item.kind === 'invite' })
        return (
          <li key={item.id}>
            <Link href={href} className={`flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3.5 transition-colors hover:bg-[#FCFAF8] sm:flex-nowrap sm:px-5 ${focusClass}`}>
              <span className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#FFF3EE] text-[#C25222] sm:flex">
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1 basis-full sm:basis-auto">
                <span className="block font-semibold text-[#252525]">{item.event.title}</span>
                <span className="mt-0.5 block text-sm text-[#777777]">
                  {formatEventDate(item.event)}
                  {!hideVenue && item.event.venues && ` · ${item.event.venues.name}`}
                  {item.profileLabel && item.profileLabel !== item.event.venues?.name && ` · ${item.profileLabel}`}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-1 text-sm font-semibold text-[#A84216]">
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
      <Link href={`/events/${event.slug}`} className={`flex flex-col gap-2 px-4 py-4 transition-colors hover:bg-[#FCFAF8] sm:flex-row sm:items-center sm:gap-5 sm:px-5 ${focusClass}`}>
        <time dateTime={`${event.event_date}T${event.start_time}`} className="shrink-0 text-sm font-medium text-[#666666] sm:w-44">
          {formatEventDate(event)}
        </time>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold text-[#252525]">{event.title}</span>
          {!hideVenue && <span className="mt-0.5 block text-sm text-[#777777]">{event.venues?.name ?? 'Unknown venue'}</span>}
          {showProfiles && artists.length > 0 && (
            <span className="mt-1 flex flex-wrap gap-1.5">
              {artists.map((artist) => <Badge key={artist.id} tone={artist.status === 'accepted' ? 'success' : 'warning'}>{artist.name}: {MEMBERSHIP_STATUS_LABELS[artist.status]}</Badge>)}
            </span>
          )}
        </span>
        {isVenue ? (
          <span className="shrink-0 text-sm text-[#666666] sm:text-right">
            <span className="block">{acceptedCount}/{event.needed_artist_count} artists</span>
            {event.is_accepting_artists && openSpots > 0 && <span className="mt-0.5 block text-xs text-[#A84216]">{openSpots} open spot{openSpots === 1 ? '' : 's'}</span>}
          </span>
        ) : !showProfiles && artists[0] ? (
          <Badge tone={artists[0].status === 'accepted' ? 'success' : 'warning'} className="self-start sm:self-auto">{MEMBERSHIP_STATUS_LABELS[artists[0].status]}</Badge>
        ) : null}
        <ChevronRight className="hidden h-4 w-4 shrink-0 text-[#999999] sm:block" aria-hidden="true" />
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
    <div className="space-y-7">
      {actions.length === 0 && (
        <p className="-mt-3 flex items-center gap-2 text-xs text-[#777777]">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-[#0C7C71]" aria-hidden="true" />You’re all caught up.
        </p>
      )}
      {!hasDecisions && startingPoint}
      {actions.length > 0 && (
        <section aria-label="Needs Attention">
          <SectionHeading title="Needs Attention" />
          <Card as="div" className="overflow-hidden">
            <ActionRows items={actions.slice(0, 5)} hideVenue={hideVenue} />
            {actions.length > 5 && (
              <details className="border-t border-[#EEEEEE]">
                <summary className={`cursor-pointer px-5 py-3 text-sm font-semibold text-[#A84216] ${focusClass}`}>Show {actions.length - 5} more</summary>
                <ActionRows items={actions.slice(5)} hideVenue={hideVenue} />
              </details>
            )}
          </Card>
        </section>
      )}

      {hasDecisions && startingPoint}

      {upcoming.length > 0 && (
        <section aria-label="Upcoming Backstages">
          <SectionHeading title="Upcoming Backstages" action={<Link href="/dashboard/backstage" className="text-sm font-semibold text-[#666666] hover:text-[#252525]">View all</Link>} />
          <Card as="div" className="overflow-hidden">
            <ul className="divide-y divide-[#EEEEEE]">
              {upcoming.slice(0, 6).map((item) => <ScheduleRow key={item.event.id} item={item} hideVenue={hideVenue} showProfiles={profileKind === 'all'} />)}
            </ul>
          </Card>
        </section>
      )}

      {waitingCount > 0 && (
        <details className="rounded-2xl border border-[#E6E6E6] bg-white">
          <summary className={`cursor-pointer rounded-2xl px-5 py-4 text-sm font-semibold text-[#666666] ${focusClass}`}>Waiting on a response ({waitingCount})</summary>
          <ul className="divide-y divide-[#EEEEEE] border-t border-[#EEEEEE]">
            {waiting.map((item) => (
              <li key={item.id}>
                <Link href={`/events/${item.event.slug}`} className={`flex items-start gap-3 px-5 py-3 hover:bg-[#FCFAF8] ${focusClass}`}>
                  <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-[#999999]" aria-hidden="true" />
                  <span className="min-w-0 text-sm">
                    <span className="block font-medium text-[#252525]">{item.event.title}</span>
                    <span className="mt-0.5 block text-[#777777]">{item.kind === 'application' ? 'Application sent' : 'Removal requested'} · {formatEventDate(item.event)}{item.profileLabel && ` · ${item.profileLabel}`}</span>
                  </span>
                </Link>
              </li>
            ))}
            {claims.map((claim) => (
              <li key={claim.id}>
                <Link href="/dashboard/venues?tab=mine" className={`flex items-start gap-3 px-5 py-3 hover:bg-[#FCFAF8] ${focusClass}`}>
                  <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-[#999999]" aria-hidden="true" />
                  <span className="text-sm"><span className="block font-medium text-[#252525]">{claim.venues?.name ?? 'Venue claim'}</span><span className="mt-0.5 block text-[#777777]">Claim pending review</span></span>
                </Link>
              </li>
            ))}
          </ul>
        </details>
      )}

      <DashboardDiscoverySection discovery={discovery} />
    </div>
  )
}

export function DashboardActivitySkeleton() {
  return (
    <div aria-label="Loading dashboard activity" role="status" className="space-y-7">
      {[2, 3].map((rows, index) => (
        <div key={index} className="space-y-4">
          <div className="h-6 w-44 animate-pulse rounded-lg bg-[#EAEAE7]" />
          <div className="overflow-hidden rounded-2xl border border-[#E8E8E8] bg-white/70">
            {Array.from({ length: rows }, (_, row) => <div key={row} className="h-20 animate-pulse border-b border-[#EEEEEE] last:border-b-0" />)}
          </div>
        </div>
      ))}
    </div>
  )
}
