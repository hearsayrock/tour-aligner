'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { Json } from '@/types/database'
import {
  ARTIST_PAGE_SECTION_DEFINITIONS,
  parseArtistProfileTheme,
  type ArtistPageCustomization,
} from '@/components/profile-page/artist/artist-page-config'
import { normalizeProfilePageLayout } from '@/components/profile-page/profile-page-types'

export type SaveArtistPageLayoutResult = {
  success?: true
  error?: string
}

export async function saveArtistPageCustomization(
  bandId: string,
  customization: ArtistPageCustomization
): Promise<SaveArtistPageLayoutResult> {
  if (!customization || typeof customization !== 'object') {
    return { error: 'The artist page changes were invalid.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'You must be signed in to edit this artist page.' }

  const { data: band, error: bandError } = await supabase
    .from('bands')
    .select('user_id, slug, profile_theme')
    .eq('id', bandId)
    .single()

  if (bandError || !band) return { error: 'Artist profile not found.' }
  if (band.user_id !== user.id) return { error: 'You do not have permission to edit this artist page.' }

  const currentTheme = parseArtistProfileTheme(band.profile_theme)
  const normalizedLayout = normalizeProfilePageLayout(customization.layout, ARTIST_PAGE_SECTION_DEFINITIONS)
  const nextTheme = parseArtistProfileTheme({
    ...currentTheme,
    ...customization.appearance,
    layout: normalizedLayout,
  } as unknown as Json)
  const imageChanges = customization.imageChanges ?? {}
  const imageUpdates: {
    profile_photo_url?: string | null
    cover_photo_url?: string | null
    profile_background_url?: string | null
  } = {}

  function publicImageUrl(type: 'profile' | 'cover' | 'background') {
    return supabase.storage.from('band-images').getPublicUrl(`bands/${bandId}/${type}.jpg`).data.publicUrl
  }

  if (imageChanges.profile === 'replace') imageUpdates.profile_photo_url = publicImageUrl('profile')
  else if (imageChanges.profile === 'remove') imageUpdates.profile_photo_url = null
  if (imageChanges.cover === 'replace') imageUpdates.cover_photo_url = publicImageUrl('cover')
  else if (imageChanges.cover === 'remove') imageUpdates.cover_photo_url = null
  if (imageChanges.background === 'replace') imageUpdates.profile_background_url = publicImageUrl('background')
  else if (imageChanges.background === 'remove') imageUpdates.profile_background_url = null

  const { error } = await supabase
    .from('bands')
    .update({ profile_theme: nextTheme as unknown as Json, ...imageUpdates })
    .eq('id', bandId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath(`/bands/${band.slug}`)
  revalidatePath(`/dashboard/bands/${bandId}/edit`)
  return { success: true }
}
