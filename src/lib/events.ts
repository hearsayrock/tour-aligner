import type { BackstageMessage, Event, EventArtistMembership } from '@/types/database'

export type EventWithVenue = Event & {
  venues: {
    id: string
    name: string
    slug: string
    location_city: string
    location_state: string
    claimed_by_user_id: string | null
  } | null
}

export type EventGenreSummary = {
  genres: { id: string; name: string } | null
}

export type EventMembershipSummary = EventArtistMembership & {
  bands: {
    id: string
    name: string
    slug: string
    user_id: string
  } | null
}

export type BackstageMessageSummary = BackstageMessage & {
  profiles: { full_name: string | null } | null
  bands: { name: string | null } | null
}

export const EVENT_STATUS_LABELS: Record<Event['status'], string> = {
  draft: 'Draft',
  active: 'Active',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

export const MEMBERSHIP_STATUS_LABELS: Record<EventArtistMembership['status'], string> = {
  applied: 'Applied',
  invited: 'Invited',
  accepted: 'Accepted',
  declined: 'Declined',
  removed: 'Removed',
  removal_requested: 'Removal requested',
}

export function formatEventDate(event: Pick<Event, 'event_date' | 'start_time'>) {
  const date = new Date(`${event.event_date}T${event.start_time}`)

  return date.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function formatEventDateLong(event: Pick<Event, 'event_date' | 'start_time'>) {
  const date = new Date(`${event.event_date}T${event.start_time}`)

  return date.toLocaleString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function getAcceptedMemberships<T extends Pick<EventArtistMembership, 'status'>>(memberships: T[]) {
  return memberships.filter((membership) => membership.status === 'accepted')
}

export function getOpenArtistNeed(
  event: Pick<Event, 'needed_artist_count'>,
  memberships: Array<Pick<EventArtistMembership, 'status'>>
) {
  return event.needed_artist_count - getAcceptedMemberships(memberships).length
}

export function eventIsAvailable(event: Pick<Event, 'is_public' | 'is_accepting_artists' | 'status'>) {
  return event.is_public && event.is_accepting_artists && (event.status === 'draft' || event.status === 'active')
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
