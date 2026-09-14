'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { Json } from '@/types/database'
import { normalizeProfilePageLayout } from '@/components/profile-page/profile-page-types'
import { createBlockDefinition, normalizeProfilePageBlockDraft, type ProfilePageBlockDraft } from '@/components/profile-page/blocks/profile-page-blocks'
import { parseVenueProfileTheme, VENUE_PAGE_BLOCK_TYPES, VENUE_PAGE_SECTION_DEFINITIONS, type VenuePageCustomization, type VenuePageEditableContent } from '@/components/profile-page/venue/venue-page-config'

export type SaveVenuePageResult = { success?: true; error?: string }

function normalizeContent(content: VenuePageEditableContent | undefined) {
  if (!content || typeof content !== 'object' || Array.isArray(content)) return { error: 'The venue content was invalid.' } as const
  const optionalText = (value: unknown, max: number) => typeof value === 'string' ? value.trim().slice(0, max) || null : null
  const requiredText = (value: unknown, max: number) => typeof value === 'string' ? value.trim().slice(0, max) : ''
  const city = requiredText(content.location_city, 120)
  const state = requiredText(content.location_state, 120)
  if (!city || !state) return { error: 'Venue city and state are required.' } as const
  const capacity = content.capacity === '' ? null : Number(content.capacity)
  if (capacity !== null && (!Number.isInteger(capacity) || capacity < 1 || capacity > 1000000)) return { error: 'Capacity must be a whole number between 1 and 1,000,000.' } as const
  const billCap = Number(content.default_bill_cap)
  if (!Number.isInteger(billCap) || billCap < 1 || billCap > 50) return { error: 'Default bill size must be between 1 and 50 acts.' } as const
  const ageRequirement = ['all_ages', '18_plus', '21_plus'].includes(content.age_requirement) ? content.age_requirement as 'all_ages' | '18_plus' | '21_plus' : null
  const urls: Record<'website_url' | 'instagram_url', string | null> = { website_url: null, instagram_url: null }
  for (const key of Object.keys(urls) as Array<keyof typeof urls>) {
    const value = optionalText(content[key], 2048)
    if (value) {
      try { const url = new URL(value); if (!['http:', 'https:'].includes(url.protocol)) return { error: `${key === 'website_url' ? 'Website' : 'Instagram'} must use an http or https URL.` } as const }
      catch { return { error: `${key === 'website_url' ? 'Website' : 'Instagram'} must be a complete URL.` } as const }
    }
    urls[key] = value
  }
  const email = optionalText(content.booking_email, 320)
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: 'Booking email must be a valid email address.' } as const
  const genreIds = Array.isArray(content.genre_ids) ? [...new Set(content.genre_ids.filter((id): id is string => typeof id === 'string' && /^[0-9a-f-]{36}$/i.test(id)))].slice(0, 5) : []
  return { value: { venue: { description: optionalText(content.description, 5000), location_address: optionalText(content.location_address, 240), location_city: city, location_state: state, location_zip: optionalText(content.location_zip, 20), capacity, default_bill_cap: billCap, age_requirement: ageRequirement, website_url: urls.website_url, instagram_url: urls.instagram_url, phone: optionalText(content.phone, 40), booking_email: email }, genreIds } } as const
}

export async function saveVenuePageCustomization(venueId: string, customization: VenuePageCustomization): Promise<SaveVenuePageResult> {
  if (!customization || typeof customization !== 'object') return { error: 'The venue page changes were invalid.' }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'You must be signed in to edit this venue page.' }
  const { data: venue, error: venueError } = await supabase.from('venues').select('claimed_by_user_id, slug, profile_theme').eq('id', venueId).single()
  if (venueError || !venue) return { error: 'Venue profile not found.' }
  if (venue.claimed_by_user_id !== user.id) return { error: 'You do not have permission to edit this venue page.' }

  const normalizedContent = normalizeContent(customization.content)
  if ('error' in normalizedContent) return { error: normalizedContent.error }
  if (!Array.isArray(customization.blocks) || customization.blocks.length > 30) return { error: 'The venue page can contain up to 30 page blocks.' }
  const blocks: ProfilePageBlockDraft[] = []
  const blockIds = new Set<string>()
  for (const rawBlock of customization.blocks) {
    const normalized = normalizeProfilePageBlockDraft(rawBlock)
    if ('error' in normalized) return { error: normalized.error }
    if (!VENUE_PAGE_BLOCK_TYPES.includes(normalized.value.blockType)) return { error: 'That block type is not available for venue pages.' }
    if (blockIds.has(normalized.value.id)) return { error: 'The venue page contained a duplicate block.' }
    blockIds.add(normalized.value.id)
    blocks.push(normalized.value)
  }
  if (normalizedContent.value.genreIds.length > 0) {
    const { data: genres, error } = await supabase.from('genres').select('id').in('id', normalizedContent.value.genreIds)
    if (error || genres?.length !== normalizedContent.value.genreIds.length) return { error: 'One or more selected genres are invalid.' }
  }

  const blockDefinitions = blocks.map((block, index) => createBlockDefinition(block, VENUE_PAGE_SECTION_DEFINITIONS.length + index))
  const definitions = [...VENUE_PAGE_SECTION_DEFINITIONS, ...blockDefinitions]
  const layout = normalizeProfilePageLayout(customization.layout, definitions)
  const theme = parseVenueProfileTheme({ ...parseVenueProfileTheme(venue.profile_theme), ...customization.appearance, layout } as unknown as Json, blockDefinitions)
  const imageChanges = customization.imageChanges ?? {}
  const imageUpdates: { profile_photo_url?: string | null; cover_photo_url?: string | null; profile_background_url?: string | null } = {}
  const publicImageUrl = (type: 'profile' | 'cover' | 'background') => supabase.storage.from('band-images').getPublicUrl(`venues/${venueId}/${type}.jpg`).data.publicUrl
  if (imageChanges.profile === 'replace') imageUpdates.profile_photo_url = publicImageUrl('profile')
  else if (imageChanges.profile === 'remove') imageUpdates.profile_photo_url = null
  if (imageChanges.cover === 'replace') imageUpdates.cover_photo_url = publicImageUrl('cover')
  else if (imageChanges.cover === 'remove') imageUpdates.cover_photo_url = null
  if (imageChanges.background === 'replace') imageUpdates.profile_background_url = publicImageUrl('background')
  else if (imageChanges.background === 'remove') imageUpdates.profile_background_url = null

  const { error: updateError } = await supabase.from('venues').update({ ...normalizedContent.value.venue, ...imageUpdates, profile_theme: theme as unknown as Json }).eq('id', venueId).eq('claimed_by_user_id', user.id)
  if (updateError) return { error: updateError.message }

  if (blocks.length > 0) {
    const { error } = await supabase.from('profile_page_blocks').upsert(blocks.map((block) => {
      const item = layout.sections.find((section) => section.sectionId === `block:${block.id}`)
      return { id: block.id, band_id: null, venue_id: venueId, block_type: block.blockType, schema_version: block.schemaVersion, content: block.content as unknown as Json, settings: { ...block.settings, placement: item ? { order: item.order, span: item.span, visible: item.visible } : undefined } as unknown as Json }
    }))
    if (error) return { error: error.message }
  }
  const existing = await supabase.from('profile_page_blocks').select('id').eq('venue_id', venueId)
  if (existing.error) return { error: existing.error.message }
  const removed = (existing.data ?? []).map((block) => block.id).filter((id) => !blockIds.has(id))
  if (removed.length > 0) {
    const { error } = await supabase.from('profile_page_blocks').delete().in('id', removed).eq('venue_id', venueId)
    if (error) return { error: error.message }
  }
  const { error: deleteGenresError } = await supabase.from('venue_genres').delete().eq('venue_id', venueId)
  if (deleteGenresError) return { error: deleteGenresError.message }
  if (normalizedContent.value.genreIds.length > 0) {
    const { error } = await supabase.from('venue_genres').insert(normalizedContent.value.genreIds.map((genre_id) => ({ venue_id: venueId, genre_id })))
    if (error) return { error: error.message }
  }
  revalidatePath(`/venues/${venue.slug}`)
  revalidatePath(`/dashboard/venues/${venueId}/edit`)
  return { success: true }
}
