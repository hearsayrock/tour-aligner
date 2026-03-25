'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function sendInquiry(formData: {
  venueId: string
  bandId: string
  requestedDate: string
  message: string
  expectedDraw: number | null
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'You must be signed in to send an inquiry.' }
  }

  const { data: band } = await supabase
    .from('bands')
    .select('id')
    .eq('id', formData.bandId)
    .eq('user_id', user.id)
    .single()

  if (!band) {
    return { error: 'Band not found or you do not own this band.' }
  }

  const { error } = await supabase.from('booking_inquiries').insert({
    band_id: formData.bandId,
    venue_id: formData.venueId,
    requested_date: formData.requestedDate,
    message: formData.message,
    expected_draw: formData.expectedDraw,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard/inquiries')
  return { success: true }
}

export async function respondToInquiry(
  inquiryId: string,
  status: 'accepted' | 'declined',
  responseMessage: string
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'You must be signed in.' }
  }

  const { error } = await supabase
    .from('booking_inquiries')
    .update({ status, response_message: responseMessage || null })
    .eq('id', inquiryId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard/inquiries')
  return { success: true }
}

export async function cancelInquiry(inquiryId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'You must be signed in.' }
  }

  const { error } = await supabase
    .from('booking_inquiries')
    .update({ status: 'cancelled' })
    .eq('id', inquiryId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard/inquiries')
  return { success: true }
}
