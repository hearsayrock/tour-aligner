'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { ContactThreadStatus, ConversationSide, Json } from '@/types/database'

type RpcPayload = {
  thread_id: string
  status: ContactThreadStatus
  action: string
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
  revalidatePath('/dashboard/inquiries')

  if (threadId) {
    revalidatePath(`/dashboard/inbox/${threadId}`)
  }
}

async function findExistingThreadId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  bandId: string,
  venueId: string
) {
  const { data } = await supabase
    .from('contact_threads')
    .select('id')
    .eq('band_id', bandId)
    .eq('venue_id', venueId)
    .maybeSingle()

  return data?.id ?? null
}

export async function requestContact(formData: {
  bandId: string
  venueId: string
  initiatorSide: ConversationSide
  message: string
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'You must be signed in to request contact.' }
  }

  const { data, error } = await supabase.rpc('request_contact', {
    p_band_id: formData.bandId,
    p_venue_id: formData.venueId,
    p_initiator_side: formData.initiatorSide,
    p_body: formData.message,
  })

  if (error) {
    return {
      error: error.message,
      threadId: await findExistingThreadId(supabase, formData.bandId, formData.venueId),
    }
  }

  if (!isRpcPayload(data)) {
    return { error: 'Unexpected response while creating the conversation.' }
  }

  revalidateInbox(data.thread_id)

  return {
    success: true as const,
    threadId: data.thread_id,
    status: data.status,
    action: data.action,
  }
}

export async function respondToContactRequest(
  threadId: string,
  action: 'accept' | 'decline_retry_later' | 'decline_and_block',
  note: string
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'You must be signed in.' }
  }

  const { data, error } = await supabase.rpc('respond_to_contact_request', {
    p_thread_id: threadId,
    p_action: action,
    p_note: note || null,
  })

  if (error) {
    return { error: error.message }
  }

  if (!isRpcPayload(data)) {
    return { error: 'Unexpected response while updating the request.' }
  }

  revalidateInbox(data.thread_id)

  return {
    success: true as const,
    threadId: data.thread_id,
    status: data.status,
    action: data.action,
  }
}

export async function unblockContactThread(threadId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'You must be signed in.' }
  }

  const { data, error } = await supabase.rpc('unblock_contact_thread', {
    p_thread_id: threadId,
  })

  if (error) {
    return { error: error.message }
  }

  if (!isRpcPayload(data)) {
    return { error: 'Unexpected response while unblocking the conversation.' }
  }

  revalidateInbox(data.thread_id)

  return {
    success: true as const,
    threadId: data.thread_id,
    status: data.status,
    action: data.action,
  }
}

export async function blockContactThread(threadId: string, note: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'You must be signed in.' }
  }

  const { data, error } = await supabase.rpc('block_contact_thread', {
    p_thread_id: threadId,
    p_note: note || null,
  })

  if (error) {
    return { error: error.message }
  }

  if (!isRpcPayload(data)) {
    return { error: 'Unexpected response while blocking the conversation.' }
  }

  revalidateInbox(data.thread_id)

  return {
    success: true as const,
    threadId: data.thread_id,
    status: data.status,
    action: data.action,
  }
}

export async function sendDirectMessage(threadId: string, body: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'You must be signed in.' }
  }

  const { data, error } = await supabase.rpc('send_contact_message', {
    p_thread_id: threadId,
    p_body: body,
  })

  if (error) {
    return { error: error.message }
  }

  if (!isRpcPayload(data)) {
    return { error: 'Unexpected response while sending your message.' }
  }

  revalidateInbox(data.thread_id)

  return {
    success: true as const,
    threadId: data.thread_id,
    status: data.status,
    action: data.action,
  }
}

export async function markThreadRead(threadId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'You must be signed in.' }
  }

  const { error } = await supabase.rpc('mark_contact_thread_read', {
    p_thread_id: threadId,
  })

  if (error) {
    return { error: error.message }
  }

  revalidateInbox(threadId)
  return { success: true as const }
}
