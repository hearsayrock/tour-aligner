'use server'

import {
  ChatDockAccessError,
  requireChatDockContext,
  loadDockPrivateChats,
  loadDockBackstages,
  toChatProfile,
} from '@/lib/chat-dock-server'
import {
  backstageDockMessage,
  privateDockMessage,
  DOCK_MESSAGE_PAGE_SIZE,
  isDockMessageCursor,
  type DockMessageCursor,
  type ChatProfile,
  type DockConversation,
  type DockInbox,
  type DockResult,
  type DockSelection,
} from '@/lib/chat-dock'
import type { BackstageMessage, PrivateChatMessage } from '@/types/database'

function failure(error: unknown) {
  return {
    error: error instanceof Error ? error.message : 'Could not load chats. Try again.',
    accessChanged: error instanceof ChatDockAccessError,
  }
}

async function loadMessages(
  context: Awaited<ReturnType<typeof requireChatDockContext>>,
  kind: DockSelection['kind'],
  id: string,
  cursor?: DockMessageCursor
) {
  if (cursor && !isDockMessageCursor(cursor)) throw new Error('Could not load messages. Try again.')
  let query = context.supabase
    .from(kind === 'private' ? 'private_chat_messages' : 'backstage_messages')
    .select('*')
    .eq(kind === 'private' ? 'thread_id' : 'event_id', id)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(DOCK_MESSAGE_PAGE_SIZE + 1)
  if (cursor)
    query = query.or(
      `created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`
    )
  const { data, error } = await query
  if (error) throw new Error('Could not load messages. Try again.')
  const rows = (data ?? []) as Array<PrivateChatMessage | BackstageMessage>
  const page = rows.slice(0, DOCK_MESSAGE_PAGE_SIZE).reverse()
  const oldest = page[0]
  return {
    messages: page,
    hasMoreMessages: rows.length > DOCK_MESSAGE_PAGE_SIZE,
    nextCursor: oldest ? { createdAt: oldest.created_at, id: oldest.id } : null,
  }
}

export async function getDockInbox(expectedIdentity: string): Promise<DockResult<DockInbox>> {
  try {
    const context = await requireChatDockContext(expectedIdentity)
    const [chats, backstages] = await Promise.all([
      loadDockPrivateChats(context),
      loadDockBackstages(context),
    ])
    return { data: { chats, backstages } }
  } catch (error) {
    return failure(error)
  }
}

export async function searchDockProfiles(
  expectedIdentity: string,
  text: string
): Promise<DockResult<ChatProfile[]>> {
  try {
    const { supabase, identity } = await requireChatDockContext(expectedIdentity)
    // PostgREST wildcard characters are literals in a profile-name search.
    const term = text
      .trim()
      .slice(0, 80)
      .replace(/[\\%_]/g, '\\$&')
    if (term.length < 2) return { data: [] }
    const [bands, venues] = await Promise.all([
      supabase
        .from('bands')
        .select('id, name, slug, profile_photo_url, location_city, location_state')
        .eq('is_active', true)
        .ilike('name', `%${term}%`)
        .order('name')
        .limit(8),
      supabase
        .from('venues')
        .select('id, name, slug, profile_photo_url, location_city, location_state')
        .eq('is_active', true)
        .eq('is_unlisted', false)
        .not('claimed_by_user_id', 'is', null)
        .ilike('name', `%${term}%`)
        .order('name')
        .limit(8),
    ])
    if (bands.error || venues.error) throw new Error('Could not search profiles. Try again.')
    return {
      data: [
        ...(bands.data ?? []).map((row) => toChatProfile(row, 'band')),
        ...(venues.data ?? []).map((row) => toChatProfile(row, 'venue')),
      ]
        .filter((profile) => profile.kind !== identity.kind || profile.id !== identity.id)
        .sort((a, b) => a.name.localeCompare(b.name))
        .slice(0, 12),
    }
  } catch (error) {
    return failure(error)
  }
}

export async function prepareDockChat(
  expectedIdentity: string,
  kind: ChatProfile['kind'],
  id: string
): Promise<DockResult<{ profile: ChatProfile; threadId?: string }>> {
  try {
    const context = await requireChatDockContext(expectedIdentity)
    const { data, error } = await context.supabase
      .from(kind === 'band' ? 'bands' : 'venues')
      .select('id, name, slug, profile_photo_url, location_city, location_state')
      .eq('id', id)
      .eq('is_active', true)
      .maybeSingle()
    if (error || !data) throw new Error('This profile is not available for chat.')
    const chats = await loadDockPrivateChats(context)
    const existing = chats.find((chat) => chat.partner.kind === kind && chat.partner.id === id)
    return { data: { profile: toChatProfile(data, kind), threadId: existing?.thread.id } }
  } catch (error) {
    return failure(error)
  }
}

export async function getDockConversation(
  expectedIdentity: string,
  selection: DockSelection,
  cursor?: DockMessageCursor
): Promise<DockResult<DockConversation>> {
  try {
    const context = await requireChatDockContext(expectedIdentity)
    if (selection.kind === 'private') {
      const [chats, page] = await Promise.all([
        loadDockPrivateChats(context, selection.id),
        loadMessages(context, 'private', selection.id, cursor),
      ])
      const [chat] = chats
      if (!chat) throw new Error('This chat is not available for the selected profile.')
      return {
        data: {
          kind: 'private',
          ...page,
          chat,
          messages: (page.messages as PrivateChatMessage[]).map((message) =>
            privateDockMessage(message, context.identity, chat.partner.name)
          ),
        },
      }
    }
    const [backstage] = await loadDockBackstages(context, selection.id)
    if (!backstage) throw new Error('This Backstage is not available for the selected profile.')
    // User-level RLS can grant access through another managed profile. Enforce the
    // selected profile's membership before returning any room messages.
    if (!backstage.canChat)
      return {
        data: {
          kind: 'backstage',
          backstage,
          messages: [],
          artistNames: {},
          hasMoreMessages: false,
          nextCursor: null,
        },
      }
    const [page, memberships] = await Promise.all([
      loadMessages(context, 'backstage', selection.id, cursor),
      context.supabase
        .from('event_artist_memberships')
        .select('band_id, bands(name)')
        .eq('event_id', selection.id),
    ])
    if (memberships.error) throw new Error('Could not load Backstage messages. Try again.')
    const artistNames = Object.fromEntries(
      ((memberships.data ?? []) as unknown as Array<{ band_id: string; bands: { name: string } | null }>).map(
        (row) => [row.band_id, row.bands?.name ?? 'Artist']
      )
    )
    return {
      data: {
        kind: 'backstage',
        ...page,
        backstage,
        artistNames,
        messages: (page.messages as BackstageMessage[]).map((message) =>
          backstageDockMessage(message, context.identity, backstage.venueName, artistNames)
        ),
      },
    }
  } catch (error) {
    return failure(error)
  }
}
