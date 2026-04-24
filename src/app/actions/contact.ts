'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { ACTIVE_IDENTITY_COOKIE, resolveActiveIdentity, type ManagedIdentity } from '@/lib/managed-identity'
import type { ConversationSide, Json } from '@/types/database'

type RpcPayload = {
  thread_id: string
  status: string
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

async function getActiveContactIdentity(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
) {
  const [{ data: rawBands }, { data: rawVenues }] = await Promise.all([
    supabase.from('bands').select('id, name').eq('user_id', userId).eq('is_active', true).order('name'),
    supabase.from('venues').select('id, name').eq('claimed_by_user_id', userId).eq('is_active', true).order('name'),
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
  return resolveActiveIdentity(cookieStore.get(ACTIVE_IDENTITY_COOKIE)?.value, identities)
}

export async function requestContact(formData: {
  bandId: string
  venueId: string
  initiatorSide: ConversationSide
  message: string
  showDate?: string | null
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'You must be signed in to request contact.' }
  }

  const activeIdentity = await getActiveContactIdentity(supabase, user.id)
  const requestedIdentityId = formData.initiatorSide === 'band' ? formData.bandId : formData.venueId
  if (activeIdentity.kind === 'all') {
    return { error: 'Select one acting identity before requesting contact.' }
  }
  if (activeIdentity.kind !== formData.initiatorSide || activeIdentity.id !== requestedIdentityId) {
    return { error: `You are currently acting as ${activeIdentity.name}. Switch identities before requesting contact from another profile.` }
  }

  const { data, error } = await supabase.rpc('request_contact', {
    p_band_id: formData.bandId,
    p_venue_id: formData.venueId,
    p_initiator_side: formData.initiatorSide,
    p_body: formData.message,
    p_show_date: formData.showDate ?? null,
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

export async function updateThreadWorkingDate(threadId: string, showDate: string | null) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'You must be signed in.' }
  }

  const { data, error } = await supabase.rpc('set_contact_thread_working_date', {
    p_thread_id: threadId,
    p_show_date: showDate,
  })

  if (error) {
    return { error: error.message }
  }

  if (!isRpcPayload(data)) {
    return { error: 'Unexpected response while updating the working date.' }
  }

  revalidateInbox(data.thread_id)

  return {
    success: true as const,
    threadId: data.thread_id,
    status: data.status,
    action: data.action,
  }
}

export async function confirmContactBooking(formData: {
  threadId: string
  showDate: string | null
  billCap: number | null
  closeBill: boolean
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'You must be signed in.' }
  }

  const { data, error } = await supabase.rpc('confirm_contact_booking', {
    p_thread_id: formData.threadId,
    p_show_date: formData.showDate,
    p_bill_cap: formData.billCap,
    p_close_bill: formData.closeBill,
  })

  if (error) {
    return { error: error.message }
  }

  if (!isRpcPayload(data)) {
    return { error: 'Unexpected response while confirming the booking.' }
  }

  revalidateInbox(data.thread_id)

  return {
    success: true as const,
    threadId: data.thread_id,
    status: data.status,
    action: data.action,
  }
}

export async function requestBookingCancellation(bookingId: string, note: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'You must be signed in.' }
  }

  const { data, error } = await supabase.rpc('request_booking_cancellation', {
    p_booking_id: bookingId,
    p_note: note || null,
  })

  if (error) {
    return { error: error.message }
  }

  if (!isRpcPayload(data)) {
    return { error: 'Unexpected response while requesting cancellation.' }
  }

  revalidateInbox(data.thread_id)

  return {
    success: true as const,
    threadId: data.thread_id,
    status: data.status,
    action: data.action,
  }
}

export async function resolveBookingCancellation(
  bookingId: string,
  action: 'keep' | 'cancel',
  note: string
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'You must be signed in.' }
  }

  const { data, error } = await supabase.rpc('resolve_booking_cancellation', {
    p_booking_id: bookingId,
    p_action: action,
    p_note: note || null,
  })

  if (error) {
    return { error: error.message }
  }

  if (!isRpcPayload(data)) {
    return { error: 'Unexpected response while resolving cancellation.' }
  }

  revalidateInbox(data.thread_id)

  return {
    success: true as const,
    threadId: data.thread_id,
    status: data.status,
    action: data.action,
  }
}

export async function cancelConfirmedBooking(bookingId: string, note: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'You must be signed in.' }
  }

  const { data, error } = await supabase.rpc('cancel_confirmed_booking', {
    p_booking_id: bookingId,
    p_note: note || null,
  })

  if (error) {
    return { error: error.message }
  }

  if (!isRpcPayload(data)) {
    return { error: 'Unexpected response while cancelling the booking.' }
  }

  revalidateInbox(data.thread_id)

  return {
    success: true as const,
    threadId: data.thread_id,
    status: data.status,
    action: data.action,
  }
}

export async function archiveContactThread(threadId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'You must be signed in.' }
  }

  const { data, error } = await supabase.rpc('archive_contact_thread', {
    p_thread_id: threadId,
  })

  if (error) {
    return { error: error.message }
  }

  if (!isRpcPayload(data)) {
    return { error: 'Unexpected response while archiving the conversation.' }
  }

  revalidateInbox(data.thread_id)

  return {
    success: true as const,
    threadId: data.thread_id,
    status: data.status,
    action: data.action,
  }
}

export async function unarchiveContactThread(threadId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'You must be signed in.' }
  }

  const { data, error } = await supabase.rpc('unarchive_contact_thread', {
    p_thread_id: threadId,
  })

  if (error) {
    return { error: error.message }
  }

  if (!isRpcPayload(data)) {
    return { error: 'Unexpected response while unarchiving the conversation.' }
  }

  revalidateInbox(data.thread_id)

  return {
    success: true as const,
    threadId: data.thread_id,
    status: data.status,
    action: data.action,
  }
}
