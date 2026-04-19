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
  showDates: string[]
  billCap: number
  closeBill: boolean
  unavailable: boolean
  showType: 'open_bill' | 'touring_package' | 'local_showcase' | 'festival' | 'private_event' | 'special_event' | null
  genreFocus: string | null
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'You must be signed in to update the calendar.' }
  }

  if (input.showDates.length === 0) {
    return { error: 'Choose at least one date first.' }
  }

  if (!Number.isFinite(input.billCap) || input.billCap < 1) {
    return { error: 'Bill cap must be at least 1.' }
  }

  const { data: existingRows } = await supabase
    .from('venue_booking_dates')
    .select('id, show_date')
    .eq('venue_id', input.venueId)
    .in('show_date', input.showDates)

  const existingIds = (existingRows ?? []).map((row) => row.id)

  if (input.unavailable && existingIds.length > 0) {
    const { count } = await supabase
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .in('venue_booking_date_id', existingIds)
      .in('status', ['confirmed', 'cancellation_requested'])

    if ((count ?? 0) > 0) {
      return { error: 'Dates with confirmed bookings cannot be marked unavailable.' }
    }
  }

  const rows = input.showDates.map((showDate) => ({
    venue_id: input.venueId,
    show_date: showDate,
    bill_cap: input.billCap,
    is_closed_to_more_bands: input.unavailable ? false : input.closeBill,
    is_unavailable: input.unavailable,
    show_type: input.showType,
    genre_focus: input.genreFocus,
  }))

  const { error } = await supabase
    .from('venue_booking_dates')
    .upsert(rows, {
      onConflict: 'venue_id,show_date',
    })

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/venues/${input.venueSlug}`)
  revalidatePath(`/dashboard/venues/${input.venueId}/edit`)

  return { success: true as const }
}
