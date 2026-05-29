import type { ManagedIdentity } from '@/lib/managed-identity'
import type {
  PrivateChatMessage,
  PrivateChatStatus,
  PrivateChatThread,
} from '@/types/database'
import {
  formatChatClusterTime,
  formatChatDateDivider,
  formatInboxDate,
  isSameCalendarDay,
} from '@/lib/contact'

export type PrivateChatProfileKind = 'band' | 'venue'
export type PrivateChatParticipantSlot = 'one' | 'two'

export type PrivateChatProfileSummary = {
  kind: PrivateChatProfileKind
  id: string
  name: string
  href: string | null
  meta: string
  ownerUserId: string | null
}

export type PrivateChatBandLookupRow = {
  id: string
  name: string
  slug: string
  user_id: string | null
}

export type PrivateChatVenueLookupRow = {
  id: string
  name: string
  slug: string
  location_city: string | null
  location_state: string | null
  claimed_by_user_id: string | null
}

export type InboxPrivateChatThread = PrivateChatThread & {
  participantOne: PrivateChatProfileSummary | null
  participantTwo: PrivateChatProfileSummary | null
}

export type InboxPrivateChatMessage = PrivateChatMessage & {
  senderProfile: PrivateChatProfileSummary | null
  profiles: { full_name: string | null } | null
}

export const PRIVATE_CHAT_STATUS_LABELS: Record<PrivateChatStatus, string> = {
  pending: 'Pending',
  accepted: 'Open',
  declined: 'Denied',
  blocked: 'Blocked',
}

export function getPrivateChatProfileKey(kind: PrivateChatProfileKind, id: string) {
  return `${kind}:${id}`
}

export function createPrivateChatProfileLookup({
  bands,
  venues,
}: {
  bands: PrivateChatBandLookupRow[]
  venues: PrivateChatVenueLookupRow[]
}) {
  const lookup = new Map<string, PrivateChatProfileSummary>()

  bands.forEach((band) => {
    lookup.set(getPrivateChatProfileKey('band', band.id), {
      kind: 'band',
      id: band.id,
      name: band.name,
      href: `/bands/${band.slug}`,
      meta: 'Artist profile',
      ownerUserId: band.user_id,
    })
  })

  venues.forEach((venue) => {
    lookup.set(getPrivateChatProfileKey('venue', venue.id), {
      kind: 'venue',
      id: venue.id,
      name: venue.name,
      href: `/venues/${venue.slug}`,
      meta: [venue.location_city, venue.location_state].filter(Boolean).join(', '),
      ownerUserId: venue.claimed_by_user_id,
    })
  })

  return lookup
}

export function hydratePrivateChatThread(
  thread: PrivateChatThread,
  lookup: Map<string, PrivateChatProfileSummary>
): InboxPrivateChatThread {
  return {
    ...thread,
    participantOne: lookup.get(getPrivateChatProfileKey(thread.participant_one_kind, thread.participant_one_id)) ?? null,
    participantTwo: lookup.get(getPrivateChatProfileKey(thread.participant_two_kind, thread.participant_two_id)) ?? null,
  }
}

export function hydratePrivateChatMessage(
  message: PrivateChatMessage & { profiles: { full_name: string | null } | null },
  lookup: Map<string, PrivateChatProfileSummary>
): InboxPrivateChatMessage {
  return {
    ...message,
    senderProfile:
      message.sender_profile_kind && message.sender_profile_id
        ? lookup.get(getPrivateChatProfileKey(message.sender_profile_kind, message.sender_profile_id)) ?? null
        : null,
  }
}

export function getPrivateChatViewerSlot(
  thread: Pick<
    PrivateChatThread,
    'participant_one_kind' | 'participant_one_id' | 'participant_two_kind' | 'participant_two_id'
  >,
  identity: Pick<ManagedIdentity, 'kind' | 'id'>
): PrivateChatParticipantSlot | null {
  if (thread.participant_one_kind === identity.kind && thread.participant_one_id === identity.id) return 'one'
  if (thread.participant_two_kind === identity.kind && thread.participant_two_id === identity.id) return 'two'
  return null
}

export function getPrivateChatParticipant(
  thread: Pick<InboxPrivateChatThread, 'participantOne' | 'participantTwo'>,
  slot: PrivateChatParticipantSlot
) {
  return slot === 'one' ? thread.participantOne : thread.participantTwo
}

export function getPrivateChatPartner(
  thread: InboxPrivateChatThread,
  identity: Pick<ManagedIdentity, 'kind' | 'id'>
) {
  const viewerSlot = getPrivateChatViewerSlot(thread, identity)
  if (!viewerSlot) return null
  return viewerSlot === 'one' ? thread.participantTwo : thread.participantOne
}

export function getPrivateChatRequester(
  thread: InboxPrivateChatThread
) {
  if (!thread.requested_by_kind || !thread.requested_by_id) return null

  if (
    thread.participantOne &&
    thread.participantOne.kind === thread.requested_by_kind &&
    thread.participantOne.id === thread.requested_by_id
  ) {
    return thread.participantOne
  }

  if (
    thread.participantTwo &&
    thread.participantTwo.kind === thread.requested_by_kind &&
    thread.participantTwo.id === thread.requested_by_id
  ) {
    return thread.participantTwo
  }

  return null
}

export function isIncomingPrivateChatRequest(
  thread: InboxPrivateChatThread,
  identity: Pick<ManagedIdentity, 'kind' | 'id'>
) {
  return (
    thread.status === 'pending' &&
    !(thread.requested_by_kind === identity.kind && thread.requested_by_id === identity.id)
  )
}

export function isOutgoingPrivateChatRequest(
  thread: InboxPrivateChatThread,
  identity: Pick<ManagedIdentity, 'kind' | 'id'>
) {
  return (
    thread.status === 'pending' &&
    thread.requested_by_kind === identity.kind &&
    thread.requested_by_id === identity.id
  )
}

export function hasUnreadPrivateChat(
  thread: InboxPrivateChatThread,
  identity: Pick<ManagedIdentity, 'kind' | 'id'>
) {
  const viewerSlot = getPrivateChatViewerSlot(thread, identity)
  if (!viewerSlot || !thread.last_message_at) return false

  const lastReadAt =
    viewerSlot === 'one' ? thread.participant_one_last_read_at : thread.participant_two_last_read_at

  if (!lastReadAt) return true
  return new Date(thread.last_message_at).getTime() > new Date(lastReadAt).getTime()
}

export function isPrivateChatArchived(
  thread: InboxPrivateChatThread,
  identity: Pick<ManagedIdentity, 'kind' | 'id'>
) {
  const viewerSlot = getPrivateChatViewerSlot(thread, identity)
  if (!viewerSlot) return false

  return viewerSlot === 'one'
    ? !!thread.participant_one_archived_at
    : !!thread.participant_two_archived_at
}

export function getPrivateChatLastReadAt(
  thread: InboxPrivateChatThread,
  identity: Pick<ManagedIdentity, 'kind' | 'id'>
) {
  const viewerSlot = getPrivateChatViewerSlot(thread, identity)
  if (!viewerSlot) return null

  return viewerSlot === 'one'
    ? thread.participant_one_last_read_at
    : thread.participant_two_last_read_at
}

export function getPrivateChatSenderLabel(
  message: InboxPrivateChatMessage,
  thread: InboxPrivateChatThread,
  identity: Pick<ManagedIdentity, 'kind' | 'id'>
) {
  if (!message.sender_profile_kind || !message.sender_profile_id) return 'System'

  if (message.sender_profile_kind === identity.kind && message.sender_profile_id === identity.id) {
    const viewerSlot = getPrivateChatViewerSlot(thread, identity)
    const viewer = viewerSlot ? getPrivateChatParticipant(thread, viewerSlot) : null
    return `You as ${viewer?.name ?? 'your profile'}`
  }

  return message.senderProfile?.name ?? 'Unknown profile'
}

export function getPrivateChatPrompt(
  thread: InboxPrivateChatThread
) {
  const requester = getPrivateChatRequester(thread)
  return `${requester?.name ?? 'Someone'} wants to chat with you. Allow?`
}

export function getPrivateChatConversationTitle(
  thread: InboxPrivateChatThread,
  identity: Pick<ManagedIdentity, 'kind' | 'id'>
) {
  return getPrivateChatPartner(thread, identity)?.name ?? 'Private chat'
}

export function getPrivateChatConversationMeta(
  thread: InboxPrivateChatThread,
  identity: Pick<ManagedIdentity, 'kind' | 'id'>
) {
  return getPrivateChatPartner(thread, identity)?.meta ?? ''
}

export function buildPrivateChatTimeline(messages: InboxPrivateChatMessage[]) {
  const clusterGapMs = 5 * 60 * 1000

  return messages.map((message, index) => {
    const previousMessage = index > 0 ? messages[index - 1] : null
    const isNewDay =
      !previousMessage || !isSameCalendarDay(previousMessage.created_at, message.created_at)
    const gapFromPrevious = previousMessage
      ? new Date(message.created_at).getTime() - new Date(previousMessage.created_at).getTime()
      : Number.POSITIVE_INFINITY
    const startsNewCluster =
      !previousMessage || isNewDay || gapFromPrevious >= clusterGapMs

    return { message, showDateDivider: isNewDay, showClusterTime: startsNewCluster }
  })
}

export {
  formatChatClusterTime,
  formatChatDateDivider,
  formatInboxDate,
}
