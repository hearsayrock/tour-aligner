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
