'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function suspendUser(userId: string, suspended: boolean) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('profiles')
    .update({ is_suspended: suspended })
    .eq('id', userId)
  if (error) throw new Error(error.message)
  revalidatePath(`/admin/users/${userId}`)
  revalidatePath('/admin/users')
}

export async function deactivateBand(bandId: string, active: boolean) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('bands')
    .update({ is_active: active })
    .eq('id', bandId)
  if (error) throw new Error(error.message)
  revalidatePath(`/admin/bands/${bandId}`)
  revalidatePath('/admin/bands')
}

export async function unlistVenue(venueId: string, unlisted: boolean) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('venues')
    .update({ is_unlisted: unlisted })
    .eq('id', venueId)
  if (error) throw new Error(error.message)
  revalidatePath(`/admin/venues/${venueId}`)
  revalidatePath('/admin/venues')
}

export async function approveVenueClaim(claimId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('venue_claims')
    .update({ status: 'approved' })
    .eq('id', claimId)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/claims')
  revalidatePath('/admin/venues')
}

// Works for both rejecting a pending claim and revoking an approved one.
// Deletes the claim row and clears claimed_by_user_id on the venue.
export async function rejectVenueClaim(claimId: string, venueId: string) {
  const supabase = await createClient()
  const [{ error: claimErr }, { error: venueErr }] = await Promise.all([
    supabase.from('venue_claims').delete().eq('id', claimId),
    supabase.from('venues').update({ claimed_by_user_id: null }).eq('id', venueId),
  ])
  if (claimErr) throw new Error(claimErr.message)
  if (venueErr) throw new Error(venueErr.message)
  revalidatePath('/admin/claims')
  revalidatePath(`/admin/venues/${venueId}`)
  revalidatePath('/admin/venues')
}
