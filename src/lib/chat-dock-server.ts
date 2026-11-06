import 'server-only'

import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { getManagedUserData } from '@/lib/managed-user-data'
import {
  ACTIVE_IDENTITY_COOKIE,
  resolveRequiredActiveIdentity,
  identityValue,
  parseIdentityValue,
  type ManagedIdentity,
} from '@/lib/managed-identity'
import {
  createPrivateChatProfileLookup,
  getPrivateChatPartner,
  getPrivateChatViewerSlot,
  hasUnreadPrivateChat,
  hydratePrivateChatThread,
  isPrivateChatArchived,
} from '@/lib/private-chat'
import {
  canChatInBackstage,
  hasUnreadBackstage,
  type ChatProfile,
  type DockBackstage,
  type DockPrivateChat,
} from '@/lib/chat-dock'
import type { PrivateChatThread } from '@/types/database'

export async function getChatDockContext() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  const [{ bands, venues, profile }, cookieStore] = await Promise.all([
    getManagedUserData(user.id),
    cookies(),
  ])
  const identities: ManagedIdentity[] = [
    ...bands.map((band) => ({
      kind: 'band' as const,
      id: band.id,
      name: band.name,
      href: `/bands/${band.slug}`,
    })),
    ...venues.map((venue) => ({
      kind: 'venue' as const,
      id: venue.id,
      name: venue.name,
      href: `/venues/${venue.slug}`,
    })),
  ]
  return {
    supabase,
    userId: user.id,
    identities,
    isAdmin: profile?.is_admin ?? false,
    identity: resolveRequiredActiveIdentity(cookieStore.get(ACTIVE_IDENTITY_COOKIE)?.value, identities)
      .activeIdentity,
  }
}

export class ChatDockAccessError extends Error {}

export async function requireChatDockContext(expectedIdentity: string) {
  const cookieStore = await cookies()
  const selected = parseIdentityValue(cookieStore.get(ACTIVE_IDENTITY_COOKIE)?.value)
  if (selected && selected.kind !== 'all' && `${selected.kind}:${selected.id}` === expectedIdentity) {
    // The dock host loads the full profile menu. A conversation read needs only
    // proof that this user still owns the selected, active profile.
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new ChatDockAccessError('Sign in to use chats.')
    const profile =
      selected.kind === 'band'
        ? await supabase
            .from('bands')
            .select('id, name, slug')
            .eq('id', selected.id)
            .eq('user_id', user.id)
            .eq('is_active', true)
            .maybeSingle()
        : await supabase
            .from('venues')
            .select('id, name, slug')
            .eq('id', selected.id)
            .eq('claimed_by_user_id', user.id)
            .eq('is_active', true)
            .maybeSingle()
    if (profile.error || !profile.data)
      throw new ChatDockAccessError('Your selected profile changed. Reopen the chat to continue.')
    return {
      supabase,
      userId: user.id,
      identity: {
        kind: selected.kind,
        id: profile.data.id,
        name: profile.data.name,
        href: `/${selected.kind === 'band' ? 'bands' : 'venues'}/${profile.data.slug}`,
      },
    }
  }
  // No explicit selection can still resolve to a single managed profile. Keep
  // the existing resolution rules for that case and for stale selection cookies.
  const context = await getChatDockContext()
  if (!context) throw new ChatDockAccessError('Sign in to use chats.')
  if (!context.identity || identityValue(context.identity) !== expectedIdentity) {
    throw new ChatDockAccessError('Your selected profile changed. Reopen the chat to continue.')
  }
  return { ...context, identity: context.identity }
}

type Context = Awaited<ReturnType<typeof requireChatDockContext>>
type ThreadRow = PrivateChatThread & { private_chat_messages: Array<{ body: string; created_at: string }> }

export async function loadDockPrivateChats(
  { supabase, identity }: Context,
  threadId?: string
): Promise<DockPrivateChat[]> {
  let query = supabase
    .from('private_chat_threads')
    .select(threadId ? '*' : '*, private_chat_messages(body, created_at)')
    .or(
      `and(participant_one_kind.eq.${identity.kind},participant_one_id.eq.${identity.id}),and(participant_two_kind.eq.${identity.kind},participant_two_id.eq.${identity.id})`
    )
    .order('last_message_at', { ascending: false, nullsFirst: false })
  if (!threadId)
    query = query
      .order('created_at', { referencedTable: 'private_chat_messages', ascending: false })
      .limit(1, { referencedTable: 'private_chat_messages' })
  if (threadId) query = query.eq('id', threadId)
  const { data, error } = await query
  if (error) throw new Error('Could not load private chats. Try again.')
  const threads = (data ?? []) as unknown as ThreadRow[]
  const bandIds = [
    ...new Set(
      threads
        .flatMap((thread) => [
          thread.participant_one_kind === 'band' ? thread.participant_one_id : null,
          thread.participant_two_kind === 'band' ? thread.participant_two_id : null,
        ])
        .filter((id): id is string => !!id)
    ),
  ]
  const venueIds = [
    ...new Set(
      threads
        .flatMap((thread) => [
          thread.participant_one_kind === 'venue' ? thread.participant_one_id : null,
          thread.participant_two_kind === 'venue' ? thread.participant_two_id : null,
        ])
        .filter((id): id is string => !!id)
    ),
  ]
  const [bands, venues] = await Promise.all([
    bandIds.length
      ? supabase.from('bands').select('id, name, slug, user_id, profile_photo_url').in('id', bandIds)
      : Promise.resolve({ data: [], error: null }),
    venueIds.length
      ? supabase
          .from('venues')
          .select('id, name, slug, location_city, location_state, claimed_by_user_id, profile_photo_url')
          .in('id', venueIds)
      : Promise.resolve({ data: [], error: null }),
  ])
  if (bands.error || venues.error) throw new Error('Could not load chat profiles. Try again.')
  const lookup = createPrivateChatProfileLookup({ bands: bands.data ?? [], venues: venues.data ?? [] })
  const photos = new Map(
    [...(bands.data ?? []), ...(venues.data ?? [])].map((profile) => [profile.id, profile.profile_photo_url])
  )
  return threads.flatMap((row) => {
    const thread = hydratePrivateChatThread(row, lookup)
    if (!getPrivateChatViewerSlot(thread, identity)) return []
    const partner = getPrivateChatPartner(thread, identity)
    if (!partner) return []
    return [
      {
        thread,
        partner: {
          ...partner,
          href: partner.href ?? '/dashboard/profiles',
          photo: photos.get(partner.id) ?? null,
        },
        preview: row.private_chat_messages?.[0]?.body ?? '',
        unread: hasUnreadPrivateChat(thread, identity),
        archived: isPrivateChatArchived(thread, identity),
      },
    ]
  })
}

type EventRow = {
  id: string
  slug: string
  title: string
  venue_id: string
  event_date: string
  venues: { name: string; profile_photo_url: string | null } | null
  backstage_messages: Array<{ body: string; created_at: string }>
}

export async function loadDockBackstages(
  { supabase, userId, identity }: Context,
  eventId?: string
): Promise<DockBackstage[]> {
  const memberships =
    identity.kind === 'band'
      ? await supabase
          .from('event_artist_memberships')
          .select('id, event_id, status')
          .eq('band_id', identity.id)
          .in('status', ['invited', 'accepted', 'removal_requested'])
          // A conversation request only needs the selected room's membership.
          .match(eventId ? { event_id: eventId } : {})
      : { data: [], error: null }
  if (memberships.error) throw new Error('Could not load Backstage invitations. Try again.')
  const memberRows = memberships.data ?? []
  if (identity.kind === 'band' && !memberRows.length) return []
  let query = supabase
    .from('events')
    .select(
      'id, slug, title, venue_id, event_date, venues(name, profile_photo_url), backstage_messages(body, created_at)'
    )
    .order('event_date', { ascending: false })
    .order('created_at', { referencedTable: 'backstage_messages', ascending: false })
    .limit(1, { referencedTable: 'backstage_messages' })
  query =
    identity.kind === 'venue'
      ? query.eq('venue_id', identity.id)
      : query.in(
          'id',
          memberRows.map((membership) => membership.event_id)
        )
  if (eventId) query = query.eq('id', eventId)
  const [{ data, error }, reads] = await Promise.all([
    query,
    supabase.from('backstage_read_states').select('event_id, last_read_at').eq('user_id', userId),
  ])
  if (error || reads.error) throw new Error('Could not load Backstage chats. Try again.')
  const readLookup = new Map((reads.data ?? []).map((read) => [read.event_id, read.last_read_at]))
  return ((data ?? []) as unknown as EventRow[])
    .map((event) => {
      const membership = memberRows.find((row) => row.event_id === event.id)
      const canChat = canChatInBackstage(identity.kind, membership?.status ?? null)
      const latest = canChat ? event.backstage_messages?.[0] : null
      return {
        id: event.id,
        slug: event.slug,
        title: event.title,
        venueName: event.venues?.name ?? 'Venue',
        photo: event.venues?.profile_photo_url ?? null,
        date: event.event_date,
        membershipId: membership?.id ?? null,
        membershipStatus: membership?.status ?? null,
        canChat,
        preview: latest?.body ?? '',
        lastMessageAt: latest?.created_at ?? null,
        unread:
          membership?.status === 'invited' ||
          hasUnreadBackstage(latest?.created_at ?? null, readLookup.get(event.id) ?? null),
      }
    })
    .sort((a, b) => (b.lastMessageAt ?? b.date).localeCompare(a.lastMessageAt ?? a.date))
}

export function toChatProfile(
  row: {
    id: string
    name: string
    slug: string
    profile_photo_url: string | null
    location_city: string | null
    location_state: string | null
  },
  kind: ChatProfile['kind']
): ChatProfile {
  return {
    id: row.id,
    name: row.name,
    kind,
    href: `/${kind === 'band' ? 'bands' : 'venues'}/${row.slug}`,
    photo: row.profile_photo_url,
    meta: [kind === 'band' ? 'Artist' : 'Venue', row.location_city, row.location_state]
      .filter(Boolean)
      .join(' · '),
  }
}
