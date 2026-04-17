'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function claimVenue(venueId: string, venueSlug: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'You must be signed in to claim a venue.' }
  }

  const { data: venue } = await supabase
    .from('venues')
    .select('claimed_by_user_id')
    .eq('id', venueId)
    .single()

  if (venue?.claimed_by_user_id) {
    return { error: 'This venue has already been claimed.' }
  }

  const { error } = await supabase
    .from('venue_claims')
    .insert({ venue_id: venueId, user_id: user.id, status: 'pending' })

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/venues/${venueSlug}`)
  return { success: true }
}

export async function saveVenueBookingDate(input: {
  venueId: string
  venueSlug: string
  showDate: string
  billCap: number
  closeBill: boolean
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'You must be signed in to update the calendar.' }
  }

  if (!input.showDate) {
    return { error: 'Choose a date first.' }
  }

  if (!Number.isFinite(input.billCap) || input.billCap < 1) {
    return { error: 'Bill cap must be at least 1.' }
  }

  const { error } = await supabase
    .from('venue_booking_dates')
    .upsert(
      {
        venue_id: input.venueId,
        show_date: input.showDate,
        bill_cap: input.billCap,
        is_closed_to_more_bands: input.closeBill,
      },
      {
        onConflict: 'venue_id,show_date',
      }
    )

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/venues/${input.venueSlug}`)
  revalidatePath(`/dashboard/venues/${input.venueId}/edit`)

  return { success: true as const }
}
