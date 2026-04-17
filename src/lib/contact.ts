import type {
  Booking,
  ContactMessage,
  ContactThread,
  ContactThreadStatus,
  ConversationSide,
  VenueBookingDate,
} from '@/types/database'

export type ContactBandSummary = {
  id: string
  name: string
  slug: string
  user_id: string
}

export type ContactVenueSummary = {
  id: string
  name: string
  slug: string
  location_city: string
  location_state: string
  claimed_by_user_id: string | null
  default_bill_cap: number
}

export type InboxThread = ContactThread & {
  bands: ContactBandSummary | null
  venues: ContactVenueSummary | null
}

export type InboxMessage = ContactMessage & {
  profiles: { full_name: string | null } | null
}

export type ThreadBookingSummary = Booking & {
  venue_booking_dates: VenueBookingDate | null
}

export const THREAD_STATUS_LABELS: Record<ContactThreadStatus, string> = {
  pending: 'Pending',
  accepted: 'Active',
  declined: 'Declined',
  blocked: 'Blocked',
}

export function getViewerSide(thread: InboxThread, userId: string): ConversationSide | null {
  if (thread.bands?.user_id === userId) return 'band'
  if (thread.venues?.claimed_by_user_id === userId) return 'venue'
  return null
}

export function getOtherSide(side: ConversationSide): ConversationSide {
  return side === 'band' ? 'venue' : 'band'
}

export function isPendingIncoming(thread: InboxThread, viewerSide: ConversationSide) {
  return thread.status === 'pending' && thread.requested_by_side !== viewerSide
}

export function isPendingOutgoing(thread: InboxThread, viewerSide: ConversationSide) {
  return thread.status === 'pending' && thread.requested_by_side === viewerSide
}

export function hasUnread(thread: InboxThread, viewerSide: ConversationSide) {
  const lastReadAt =
    viewerSide === 'band' ? thread.band_last_read_at : thread.venue_last_read_at

  if (!thread.last_message_at) return false
  if (!lastReadAt) return true

  return new Date(thread.last_message_at).getTime() > new Date(lastReadAt).getTime()
}

export function getPartnerLabel(thread: InboxThread, viewerSide: ConversationSide) {
  return viewerSide === 'band' ? thread.venues?.name ?? 'Unknown venue' : thread.bands?.name ?? 'Unknown artist'
}

export function getPartnerHref(thread: InboxThread, viewerSide: ConversationSide) {
  if (viewerSide === 'band') {
    return thread.venues ? `/venues/${thread.venues.slug}` : null
  }

  return thread.bands ? `/bands/${thread.bands.slug}` : null
}

export function getPartnerMeta(thread: InboxThread, viewerSide: ConversationSide) {
  if (viewerSide === 'band') {
    if (!thread.venues) return ''
    return [thread.venues.location_city, thread.venues.location_state].filter(Boolean).join(', ')
  }

  return thread.bands ? 'Artist profile' : ''
}

export function formatInboxDate(iso: string | null) {
  if (!iso) return ''

  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function formatShowDate(isoDate: string | null) {
  if (!isoDate) return ''

  return new Date(`${isoDate}T00:00:00`).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}
