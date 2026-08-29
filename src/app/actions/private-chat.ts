'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import {
  ACTIVE_IDENTITY_COOKIE,
  resolveActiveIdentity,
  type ManagedIdentity,
  type ManagedIdentityKind,
} from '@/lib/managed-identity'
import type { Json } from '@/types/database'

type RpcPayload = {
  thread_id: string
  status: string
  action: string
}

type ActionResult = {
  error?: string
  success?: true
  threadId?: string
  status?: string
  action?: string
}

function isRpcPayload(value: Json | null): value is RpcPayload {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false

  const record = value as Record<string, unknown>

  return (
    typeof record.thread_id === 'string' &&
    typeof record.status === 'string' &&
    typeof record.action === 'string'
  )
}

function revalidateInbox(threadId?: string) {
  revalidatePath('/dashboard')
  revalidatePath('/dashboard/inbox')

  if (threadId) {
    revalidatePath(`/dashboard/inbox/private/${threadId}`)
  }
}

async function getUserAndActiveIdentity() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { supabase, user: null, activeIdentity: null as ManagedIdentity | null }

  const [{ data: rawBands }, { data: rawVenues }] = await Promise.all([
    supabase.from('bands').select('id, name').eq('user_id', user.id).eq('is_active', true).order('name'),
    supabase.from('venues').select('id, name').eq('claimed_by_user_id', user.id).eq('is_active', true).order('name'),
  ])

  const identities: ManagedIdentity[] = [
    ...((rawBands ?? []) as Array<{ id: string; name: string }>).map((band) => ({
      kind: 'band' as const,
      id: band.id,
      name: band.name,
      href: `/dashboard/bands/${band.id}/edit`,
    })),
    ...((rawVenues ?? []) as Array<{ id: string; name: string }>).map((venue) => ({
      kind: 'venue' as const,
      id: venue.id,
      name: venue.name,
      href: `/dashboard/venues/${venue.id}/edit`,
    })),
  ]

  const cookieStore = await cookies()
  const resolved = resolveActiveIdentity(cookieStore.get(ACTIVE_IDENTITY_COOKIE)?.value, identities)

  return {
    supabase,
    user,
    activeIdentity: resolved.kind === 'all' ? null : resolved,
  }
}

function ensureActiveIdentityMatch(
  activeIdentity: ManagedIdentity | null,
  expectedKind: ManagedIdentityKind,
  expectedId: string
) {
  if (!activeIdentity) {
    return { error: 'Select one acting profile before using private chat.' }
  }

  if (activeIdentity.kind !== expectedKind || activeIdentity.id !== expectedId) {
    return {
      error: `You are currently acting as ${activeIdentity.name}. Switch identities before using another profile.`,
    }
  }

  return null
}

export async function requestPrivateChat(input: {
  senderKind: ManagedIdentityKind
  senderId: string
  recipientKind: ManagedIdentityKind
  recipientId: string
  message: string
}): Promise<ActionResult> {
  const { supabase, user, activeIdentity } = await getUserAndActiveIdentity()

  if (!user) {
    return { error: 'You must be signed in to request a private chat.' }
  }

  const mismatch = ensureActiveIdentityMatch(activeIdentity, input.senderKind, input.senderId)
  if (mismatch) return mismatch

  const { data, error } = await supabase.rpc('request_private_chat', {
    p_sender_kind: input.senderKind,
    p_sender_id: input.senderId,
    p_recipient_kind: input.recipientKind,
    p_recipient_id: input.recipientId,
    p_body: input.message,
  })

  if (error) {
    return { error: error.message }
  }

  if (!isRpcPayload(data)) {
    return { error: 'Unexpected response while creating the private chat.' }
  }

  revalidateInbox(data.thread_id)

  return {
    success: true as const,
    threadId: data.thread_id,
    status: data.status,
    action: data.action,
  }
}

export async function respondToPrivateChatRequest(
  threadId: string,
  actorKind: ManagedIdentityKind,
  actorId: string,
  action: 'accept' | 'deny' | 'deny_and_block',
  note: string
): Promise<ActionResult> {
  const { supabase, user, activeIdentity } = await getUserAndActiveIdentity()

  if (!user) {
    return { error: 'You must be signed in.' }
  }

  const mismatch = ensureActiveIdentityMatch(activeIdentity, actorKind, actorId)
  if (mismatch) return mismatch

  const { data, error } = await supabase.rpc('respond_to_private_chat_request', {
    p_thread_id: threadId,
    p_actor_kind: actorKind,
    p_actor_id: actorId,
    p_action: action,
    p_note: note || null,
  })

  if (error) {
    return { error: error.message }
  }

  if (!isRpcPayload(data)) {
    return { error: 'Unexpected response while updating the private chat request.' }
  }

  revalidateInbox(data.thread_id)

  return {
    success: true as const,
    threadId: data.thread_id,
    status: data.status,
    action: data.action,
  }
}

export async function sendPrivateChatMessage(
  threadId: string,
  senderKind: ManagedIdentityKind,
  senderId: string,
  body: string
): Promise<ActionResult> {
  const { supabase, user, activeIdentity } = await getUserAndActiveIdentity()

  if (!user) {
    return { error: 'You must be signed in.' }
  }

  const mismatch = ensureActiveIdentityMatch(activeIdentity, senderKind, senderId)
  if (mismatch) return mismatch

  const { data, error } = await supabase.rpc('send_private_chat_message', {
    p_thread_id: threadId,
    p_sender_kind: senderKind,
    p_sender_id: senderId,
    p_body: body,
  })

  if (error) {
    return { error: error.message }
  }

  if (!isRpcPayload(data)) {
    return { error: 'Unexpected response while sending your private message.' }
  }

  revalidateInbox(data.thread_id)

  return {
    success: true as const,
    threadId: data.thread_id,
    status: data.status,
    action: data.action,
  }
}

export async function markPrivateChatRead(
  threadId: string,
  actorKind: ManagedIdentityKind,
  actorId: string
): Promise<ActionResult> {
  const { supabase, user, activeIdentity } = await getUserAndActiveIdentity()

  if (!user) {
    return { error: 'You must be signed in.' }
  }

  const mismatch = ensureActiveIdentityMatch(activeIdentity, actorKind, actorId)
  if (mismatch) return mismatch

  const { error } = await supabase.rpc('mark_private_chat_read', {
    p_thread_id: threadId,
    p_actor_kind: actorKind,
    p_actor_id: actorId,
  })

  if (error) {
    return { error: error.message }
  }

  revalidateInbox(threadId)

  return { success: true as const }
}

async function runThreadMutation(
  mutation: (supabase: Awaited<ReturnType<typeof createClient>>) => Promise<{
    data: Json | null
    error: { message: string } | null
  }>,
  actorKind: ManagedIdentityKind,
  actorId: string
): Promise<ActionResult> {
  const { supabase, user, activeIdentity } = await getUserAndActiveIdentity()

  if (!user) {
    return { error: 'You must be signed in.' }
  }

  const mismatch = ensureActiveIdentityMatch(activeIdentity, actorKind, actorId)
  if (mismatch) return mismatch

  const { data, error } = await mutation(supabase)
  if (error) {
    return { error: error.message }
  }

  if (!isRpcPayload(data)) {
    return { error: 'Unexpected response while updating the private chat.' }
  }

  revalidateInbox(data.thread_id)

  return {
    success: true as const,
    threadId: data.thread_id,
    status: data.status,
    action: data.action,
  }
}

export async function archivePrivateChatThread(
  threadId: string,
  actorKind: ManagedIdentityKind,
  actorId: string
): Promise<ActionResult> {
  return runThreadMutation(
    async (supabase) =>
      await supabase.rpc('archive_private_chat_thread', {
        p_thread_id: threadId,
        p_actor_kind: actorKind,
        p_actor_id: actorId,
      }),
    actorKind,
    actorId
  )
}

export async function unarchivePrivateChatThread(
  threadId: string,
  actorKind: ManagedIdentityKind,
  actorId: string
): Promise<ActionResult> {
  return runThreadMutation(
    async (supabase) =>
      await supabase.rpc('unarchive_private_chat_thread', {
        p_thread_id: threadId,
        p_actor_kind: actorKind,
        p_actor_id: actorId,
      }),
    actorKind,
    actorId
  )
}

export async function blockPrivateChatThread(
  threadId: string,
  actorKind: ManagedIdentityKind,
  actorId: string,
  note: string
): Promise<ActionResult> {
  return runThreadMutation(
    async (supabase) =>
      await supabase.rpc('block_private_chat_thread', {
        p_thread_id: threadId,
        p_actor_kind: actorKind,
        p_actor_id: actorId,
        p_note: note || null,
      }),
    actorKind,
    actorId
  )
}

export async function unblockPrivateChatThread(
  threadId: string,
  actorKind: ManagedIdentityKind,
  actorId: string
): Promise<ActionResult> {
  return runThreadMutation(
    async (supabase) =>
      await supabase.rpc('unblock_private_chat_thread', {
        p_thread_id: threadId,
        p_actor_kind: actorKind,
        p_actor_id: actorId,
      }),
    actorKind,
    actorId
  )
}
