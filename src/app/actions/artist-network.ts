'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getManagedUserData } from '@/lib/managed-user-data'
import { ACTIVE_IDENTITY_COOKIE, resolveRequiredActiveIdentity, type ManagedIdentity } from '@/lib/managed-identity'

export async function setArtistFollow(artistId: string, targetId: string, following: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Sign in to follow artists.' }
  if (typeof following !== 'boolean') return { error: 'Choose whether to follow this artist.' }

  const { bands, venues } = await getManagedUserData(user.id)
  const identities: ManagedIdentity[] = [
    ...bands.map((band) => ({ kind: 'band' as const, id: band.id, name: band.name, href: `/dashboard/bands/${band.id}/edit` })),
    ...venues.map((venue) => ({ kind: 'venue' as const, id: venue.id, name: venue.name, href: `/dashboard/venues/${venue.id}/edit` })),
  ]
  const cookieStore = await cookies()
  const { activeIdentity } = resolveRequiredActiveIdentity(cookieStore.get(ACTIVE_IDENTITY_COOKIE)?.value, identities)
  if (activeIdentity?.kind !== 'band' || activeIdentity.id !== artistId) {
    return { error: 'Choose the artist profile you want to follow from.' }
  }
  if (artistId === targetId) return { error: 'An artist cannot follow their own profile.' }

  const { data: target, error: targetError } = await supabase.from('bands').select('slug').eq('id', targetId).eq('is_active', true).maybeSingle()
  if (targetError || !target) return { error: 'This artist is unavailable. Refresh the page and try again.' }

  const result = following
    ? await supabase.from('artist_follows').upsert({ follower_band_id: artistId, followed_band_id: targetId }, { onConflict: 'follower_band_id,followed_band_id', ignoreDuplicates: true })
    : await supabase.from('artist_follows').delete().eq('follower_band_id', artistId).eq('followed_band_id', targetId)
  if (result.error) return { error: 'Could not update this follow. Please try again.' }

  revalidatePath('/dashboard/bands')
  revalidatePath(`/bands/${target.slug}`)
  return { following }
}
