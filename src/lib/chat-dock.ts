import type { ManagedIdentity } from '@/lib/managed-identity'
import type { InboxPrivateChatThread } from '@/lib/private-chat'
import type { BackstageMessage, EventArtistMembership, PrivateChatMessage } from '@/types/database'

export type ChatProfile = {
  kind: 'band' | 'venue'
  id: string
  name: string
  href: string
  photo: string | null
  meta: string
}

export type DockPrivateChat = {
  thread: InboxPrivateChatThread
  partner: ChatProfile
  preview: string
  unread: boolean
  archived: boolean
}

export type DockBackstage = {
  id: string
  slug: string
  title: string
  venueName: string
  photo: string | null
  date: string
  membershipId: string | null
  membershipStatus: EventArtistMembership['status'] | null
  canChat: boolean
  preview: string
  lastMessageAt: string | null
  unread: boolean
}

export type DockInbox = { chats: DockPrivateChat[]; backstages: DockBackstage[] }
export type DockSelection = { kind: 'private' | 'backstage'; id: string }
export type DockMessageCursor = { createdAt: string; id: string }
export const DOCK_MESSAGE_PAGE_SIZE = 50
export type DockMessage = {
  id: string
  created_at: string
  body: string
  own: boolean
  system: boolean
  sender: string
}

export type DockConversation = { hasMoreMessages: boolean; nextCursor: DockMessageCursor | null } & (
  | { kind: 'private'; chat: DockPrivateChat; messages: DockMessage[] }
  | {
      kind: 'backstage'
      backstage: DockBackstage
      messages: DockMessage[]
      artistNames: Record<string, string>
    }
)

export function isDockMessageCursor(cursor: DockMessageCursor) {
  // Keep Postgres microseconds intact, while allowing only timestamp/UUID syntax
  // in the compound PostgREST pagination filter.
  return (
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/.test(cursor.createdAt) &&
    Number.isFinite(Date.parse(cursor.createdAt)) &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cursor.id)
  )
}

export type DockResult<T> =
  | { data: T; error?: never }
  | { data?: never; error: string; accessChanged?: boolean }

export function privateDockMessage(
  message: PrivateChatMessage,
  identity: ManagedIdentity,
  partnerName: string
): DockMessage {
  const own = message.sender_profile_kind === identity.kind && message.sender_profile_id === identity.id
  return {
    id: message.id,
    created_at: message.created_at,
    body: message.body,
    own,
    system: message.kind === 'system',
    sender: own ? identity.name : partnerName,
  }
}

export function backstageDockMessage(
  message: BackstageMessage,
  identity: ManagedIdentity,
  venueName: string,
  artistNames: Record<string, string>
): DockMessage {
  return {
    id: message.id,
    created_at: message.created_at,
    body: message.body,
    own:
      identity.kind === 'venue'
        ? message.sender_kind === 'venue'
        : message.sender_kind === 'artist' && message.sender_band_id === identity.id,
    system: message.sender_kind === 'system',
    sender:
      message.sender_kind === 'venue' ? venueName : (artistNames[message.sender_band_id ?? ''] ?? 'Artist'),
  }
}

export function canChatInBackstage(
  identityKind: ManagedIdentity['kind'],
  membershipStatus: EventArtistMembership['status'] | null
) {
  return (
    identityKind === 'venue' || membershipStatus === 'accepted' || membershipStatus === 'removal_requested'
  )
}

export function hasUnreadBackstage(lastMessageAt: string | null, lastReadAt: string | null) {
  return (
    !!lastMessageAt && (!lastReadAt || new Date(lastMessageAt).getTime() > new Date(lastReadAt).getTime())
  )
}

export function chatDockHidden(pathname: string) {
  return [
    '/login',
    '/signup',
    '/forgot-password',
    '/reset-password',
    '/onboarding',
    '/auth',
    '/terms/accept',
  ].some((path) => pathname === path || pathname.startsWith(`${path}/`))
}
