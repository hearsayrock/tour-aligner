import {
  EVENT_STATUS_LABELS,
  MEMBERSHIP_STATUS_LABELS,
  getAcceptedMemberships,
  getOpenArtistNeed,
} from '@/lib/events'
import type { Event, EventArtistMembership } from '@/types/database'

export type CalendarMarkerTone =
  | 'default'
  | 'muted'
  | 'brand'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'

export type CalendarDayMarker = {
  id: string
  label: string
  shortLabel: string
  tone: CalendarMarkerTone
}

export type CalendarActivity = {
  id: string
  title: string
  href?: string
  subtitle?: string
  meta?: string
  tone: CalendarMarkerTone
  kind: 'event' | 'show'
  statusLabel?: string
}

export type CalendarEventRecord = Pick<
  Event,
  'id' | 'title' | 'slug' | 'event_date' | 'status' | 'is_accepting_artists' | 'needed_artist_count'
> & {
  event_artist_memberships?: Array<Pick<EventArtistMembership, 'status'>> | null
  venues?: {
    name: string
    location_city?: string | null
    location_state?: string | null
  } | null
}

function shortenLabel(value: string, maxLength = 14) {
  if (value.length <= maxLength) return value
  return `${value.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`
}

export function eventStatusTone(status: Event['status']): CalendarMarkerTone {
  if (status === 'active') return 'success'
  if (status === 'draft') return 'warning'
  if (status === 'cancelled') return 'danger'
  return 'muted'
}

export function membershipStatusTone(status: EventArtistMembership['status']): CalendarMarkerTone {
  if (status === 'accepted') return 'success'
  if (status === 'invited') return 'warning'
  if (status === 'applied') return 'info'
  if (status === 'removal_requested') return 'brand'
  if (status === 'declined') return 'muted'
  return 'default'
}

export function buildVenueEventActivity(event: CalendarEventRecord): CalendarActivity {
  const memberships = event.event_artist_memberships ?? []
  const acceptedCount = getAcceptedMemberships(memberships).length
  const openNeed = getOpenArtistNeed(event, memberships)
  const metaParts = [`${acceptedCount}/${event.needed_artist_count} accepted`]

  if (event.is_accepting_artists && openNeed > 0) {
    metaParts.push(`${openNeed} open`)
  }

  return {
    id: `venue-event-${event.id}`,
    title: event.title,
    href: `/dashboard/backstage/${event.id}`,
    subtitle: event.venues?.name ?? 'Backstage',
    meta: metaParts.join(' / '),
    tone: eventStatusTone(event.status),
    kind: 'event',
    statusLabel: EVENT_STATUS_LABELS[event.status],
  }
}

export function buildVenueEventMarker(event: CalendarEventRecord): CalendarDayMarker {
  return {
    id: `venue-event-${event.id}`,
    label: event.title,
    shortLabel: shortenLabel(event.title),
    tone: eventStatusTone(event.status),
  }
}

export function buildArtistEventActivity(args: {
  event: CalendarEventRecord
  membershipStatus: EventArtistMembership['status']
}): CalendarActivity {
  const { event, membershipStatus } = args
  const location = [event.venues?.location_city, event.venues?.location_state].filter(Boolean).join(', ')

  return {
    id: `artist-event-${event.id}-${membershipStatus}`,
    title: event.title,
    href: membershipStatus === 'invited' ? `/events/${event.slug}#event-description` : `/dashboard/backstage/${event.id}`,
    subtitle: event.venues?.name ?? 'Backstage',
    meta: location || undefined,
    tone: membershipStatusTone(membershipStatus),
    kind: 'event',
    statusLabel: MEMBERSHIP_STATUS_LABELS[membershipStatus],
  }
}

export function buildArtistEventMarker(args: {
  event: CalendarEventRecord
  membershipStatus: EventArtistMembership['status']
}): CalendarDayMarker {
  const { event, membershipStatus } = args

  return {
    id: `artist-event-${event.id}-${membershipStatus}`,
    label: `${MEMBERSHIP_STATUS_LABELS[membershipStatus]}: ${event.title}`,
    shortLabel: shortenLabel(event.title),
    tone: membershipStatusTone(membershipStatus),
  }
}

export function buildShowDateActivity(args: {
  id: string
  title: string
  city?: string | null
  state?: string | null
  href?: string | null
}): CalendarActivity {
  const { id, title, city, state, href } = args

  return {
    id: `show-${id}`,
    title,
    href: href ?? undefined,
    subtitle: [city, state].filter(Boolean).join(', ') || undefined,
    tone: 'default',
    kind: 'show',
    statusLabel: 'Show',
  }
}

export function buildShowDateMarker(args: { id: string; title: string }): CalendarDayMarker {
  return {
    id: `show-${args.id}`,
    label: args.title,
    shortLabel: shortenLabel(args.title),
    tone: 'default',
  }
}
