'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { slugify } from '@/lib/events'
import type { Event, EventArtistMembership } from '@/types/database'

type ActionResult<T extends object = object> = T & { error?: string; success?: true }

function normalizeText(value: string | null | undefined) {
  return value?.trim() ?? ''
}

function eventPaths(eventId?: string, slug?: string) {
  revalidatePath('/dashboard')
  revalidatePath('/dashboard/backstage')
  revalidatePath('/events')
  if (eventId) revalidatePath(`/dashboard/backstage/${eventId}`)
  if (slug) revalidatePath(`/events/${slug}`)
}

async function getUserId() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return { supabase, userId: user?.id ?? null }
}

async function ensureVenueOwner(
  supabase: Awaited<ReturnType<typeof createClient>>,
  venueId: string,
  userId: string
) {
  const { data: venue } = await supabase
    .from('venues')
    .select('id, name, slug, claimed_by_user_id')
    .eq('id', venueId)
    .eq('claimed_by_user_id', userId)
    .single()

  return venue
}

async function ensureEventOwner(
  supabase: Awaited<ReturnType<typeof createClient>>,
  eventId: string,
  userId: string
) {
  const { data: event } = await supabase
    .from('events')
    .select('id, venue_id, slug, venues(claimed_by_user_id)')
    .eq('id', eventId)
    .single()

  const rawVenue = Array.isArray(event?.venues) ? event?.venues[0] : event?.venues
  if (!event || rawVenue?.claimed_by_user_id !== userId) return null

  return event as Pick<Event, 'id' | 'venue_id' | 'slug'>
}

async function uniqueEventSlug(
  supabase: Awaited<ReturnType<typeof createClient>>,
  title: string,
  eventDate: string
) {
  const base = slugify(`${title}-${eventDate}`) || `event-${eventDate}`
  let candidate = base
  let suffix = 2

  while (true) {
    const { data } = await supabase.from('events').select('id').eq('slug', candidate).maybeSingle()
    if (!data) return candidate
    candidate = `${base}-${suffix}`
    suffix += 1
  }
}

export async function createEvent(input: {
  venueId: string
  title: string
  eventDate: string
  startTime: string
  genreIds: string[]
  artistNeedDescription: string
  description: string
  attendeeCapacity: number
  neededArtistCount: number
}): Promise<ActionResult<{ eventId?: string }>> {
  const { supabase, userId } = await getUserId()
  if (!userId) return { error: 'You must be signed in to create an event.' }

  const venue = await ensureVenueOwner(supabase, input.venueId, userId)
  if (!venue) return { error: 'You can only create events for claimed venues you manage.' }

  const title = normalizeText(input.title)
  const artistNeedDescription = normalizeText(input.artistNeedDescription)
  const description = normalizeText(input.description)
  const genreIds = Array.from(new Set(input.genreIds.filter(Boolean)))

  if (!title) return { error: 'Event title is required.' }
  if (!input.eventDate) return { error: 'Event date is required.' }
  if (!input.startTime) return { error: 'Show start time is required.' }
  if (genreIds.length === 0) return { error: 'Choose at least one event genre.' }
  if (!artistNeedDescription) return { error: 'Describe the artists needed for this event.' }
  if (!description) return { error: 'Event description is required.' }
  if (!Number.isFinite(input.attendeeCapacity) || input.attendeeCapacity < 1) {
    return { error: 'Attendee capacity must be at least 1.' }
  }
  if (!Number.isFinite(input.neededArtistCount) || input.neededArtistCount < 1) {
    return { error: 'Needed artist count must be at least 1.' }
  }

  const slug = await uniqueEventSlug(supabase, title, input.eventDate)
  const { data: event, error } = await supabase
    .from('events')
    .insert({
      venue_id: input.venueId,
      created_by_user_id: userId,
      title,
      slug,
      event_date: input.eventDate,
      start_time: input.startTime,
      artist_need_description: artistNeedDescription,
      description,
      attendee_capacity: input.attendeeCapacity,
      needed_artist_count: input.neededArtistCount,
      is_public: false,
      is_accepting_artists: true,
      status: 'draft',
    })
    .select('id, slug')
    .single()

  if (error || !event) return { error: error?.message ?? 'Unable to create event.' }

  const { error: genreError } = await supabase
    .from('event_genres')
    .insert(genreIds.map((genreId) => ({ event_id: event.id, genre_id: genreId })))

  if (genreError) return { error: genreError.message }

  await supabase.from('backstage_messages').insert({
    event_id: event.id,
    sender_user_id: userId,
    sender_kind: 'system',
    body: 'Backstage was created for this event.',
  })

  eventPaths(event.id, event.slug)
  return { success: true, eventId: event.id }
}

export async function updateEventSettings(input: {
  eventId: string
  title: string
  eventDate: string
  startTime: string
  artistNeedDescription: string
  description: string
  attendeeCapacity: number
  neededArtistCount: number
  isPublic: boolean
  isAcceptingArtists: boolean
  status: Event['status']
  lineupPublished: boolean
  genreIds: string[]
}): Promise<ActionResult> {
  const { supabase, userId } = await getUserId()
  if (!userId) return { error: 'You must be signed in.' }

  const event = await ensureEventOwner(supabase, input.eventId, userId)
  if (!event) return { error: 'You can only manage events for venues you own.' }

  const title = normalizeText(input.title)
  const genreIds = Array.from(new Set(input.genreIds.filter(Boolean)))
  if (!title || !input.eventDate || !input.startTime) return { error: 'Title, date, and time are required.' }
  if (genreIds.length === 0) return { error: 'Choose at least one genre.' }
  if (input.attendeeCapacity < 1 || input.neededArtistCount < 1) {
    return { error: 'Capacity and needed artist count must be at least 1.' }
  }

  const { error } = await supabase
    .from('events')
    .update({
      title,
      event_date: input.eventDate,
      start_time: input.startTime,
      artist_need_description: normalizeText(input.artistNeedDescription),
      description: normalizeText(input.description),
      attendee_capacity: input.attendeeCapacity,
      needed_artist_count: input.neededArtistCount,
      is_public: input.isPublic,
      is_accepting_artists: input.isAcceptingArtists,
      status: input.status,
      lineup_published: input.lineupPublished,
    })
    .eq('id', input.eventId)

  if (error) return { error: error.message }

  await supabase.from('event_genres').delete().eq('event_id', input.eventId)
  const { error: genreError } = await supabase
    .from('event_genres')
    .insert(genreIds.map((genreId) => ({ event_id: input.eventId, genre_id: genreId })))

  if (genreError) return { error: genreError.message }

  eventPaths(input.eventId, event.slug)
  return { success: true }
}

export async function updateEventLogistics(input: {
  eventId: string
  loadIn: string
  soundcheck: string
  setTimes: string
  backline: string
  artistShouldBring: string
  parkingAccess: string
  notes: string
}): Promise<ActionResult> {
  const { supabase, userId } = await getUserId()
  if (!userId) return { error: 'You must be signed in.' }

  const event = await ensureEventOwner(supabase, input.eventId, userId)
  if (!event) return { error: 'Only the venue leader can update logistics.' }

  const { error } = await supabase
    .from('events')
    .update({
      logistics_load_in: normalizeText(input.loadIn) || null,
      logistics_soundcheck: normalizeText(input.soundcheck) || null,
      logistics_set_times: normalizeText(input.setTimes) || null,
      logistics_backline: normalizeText(input.backline) || null,
      logistics_artist_should_bring: normalizeText(input.artistShouldBring) || null,
      logistics_parking_access: normalizeText(input.parkingAccess) || null,
      logistics_notes: normalizeText(input.notes) || null,
    })
    .eq('id', input.eventId)

  if (error) return { error: error.message }

  await supabase.from('backstage_messages').insert({
    event_id: input.eventId,
    sender_user_id: userId,
    sender_kind: 'system',
    body: 'Venue updated the pinned logistics.',
  })

  eventPaths(input.eventId, event.slug)
  return { success: true }
}

export async function applyToEvent(input: {
  eventId: string
  bandId: string
  note: string
}): Promise<ActionResult> {
  const { supabase, userId } = await getUserId()
  if (!userId) return { error: 'You must be signed in to apply.' }

  const { data: band } = await supabase
    .from('bands')
    .select('id, name, user_id')
    .eq('id', input.bandId)
    .eq('user_id', userId)
    .single()

  if (!band) return { error: 'Choose an artist profile you manage.' }

  const { data: event } = await supabase
    .from('events')
    .select('id, slug, is_public, is_accepting_artists, status')
    .eq('id', input.eventId)
    .single()

  if (!event?.is_public || !event.is_accepting_artists || !['draft', 'active'].includes(event.status)) {
    return { error: 'This event is not accepting applications.' }
  }

  const now = new Date().toISOString()
  const { data: existing } = await supabase
    .from('event_artist_memberships')
    .select('id, status')
    .eq('event_id', input.eventId)
    .eq('band_id', input.bandId)
    .maybeSingle()

  if (existing?.status === 'accepted' || existing?.status === 'removal_requested') {
    return { error: 'This artist is already in Backstage for this event.' }
  }
  if (existing?.status === 'applied') return { error: 'This artist has already applied.' }

  const payload = {
    event_id: input.eventId,
    band_id: input.bandId,
    status: 'applied' as const,
    source: 'application' as const,
    application_note: normalizeText(input.note),
    applied_at: now,
  }

  const { error } = existing
    ? await supabase.from('event_artist_memberships').update(payload).eq('id', existing.id)
    : await supabase.from('event_artist_memberships').insert(payload)

  if (error) return { error: error.message }

  eventPaths(input.eventId, event.slug)
  return { success: true }
}

export async function inviteArtistToEvent(input: {
  eventId: string
  bandId: string
  note: string
}): Promise<ActionResult> {
  const { supabase, userId } = await getUserId()
  if (!userId) return { error: 'You must be signed in.' }

  const event = await ensureEventOwner(supabase, input.eventId, userId)
  if (!event) return { error: 'Only the venue leader can invite artists.' }

  const { data: band } = await supabase.from('bands').select('id, name').eq('id', input.bandId).single()
  if (!band) return { error: 'Artist not found.' }

  const now = new Date().toISOString()
  const payload = {
    event_id: input.eventId,
    band_id: input.bandId,
    status: 'invited' as const,
    source: 'invitation' as const,
    invite_note: normalizeText(input.note),
    invited_at: now,
  }

  const { error } = await supabase
    .from('event_artist_memberships')
    .upsert(payload, { onConflict: 'event_id,band_id' })

  if (error) return { error: error.message }

  await supabase.from('backstage_messages').insert({
    event_id: input.eventId,
    sender_user_id: userId,
    sender_kind: 'system',
    body: `Venue invited ${band.name} to this event.`,
  })

  eventPaths(input.eventId, event.slug)
  return { success: true }
}

export async function updateMembershipStatus(input: {
  membershipId: string
  status: EventArtistMembership['status']
  note?: string
}): Promise<ActionResult> {
  const { supabase, userId } = await getUserId()
  if (!userId) return { error: 'You must be signed in.' }

  const { data: rawMembership } = await supabase
    .from('event_artist_memberships')
    .select('id, event_id, band_id, status, events(id, slug, venue_id, venues(claimed_by_user_id)), bands(name, user_id)')
    .eq('id', input.membershipId)
    .single()

  const membership = rawMembership as unknown as (EventArtistMembership & {
    events: (Pick<Event, 'id' | 'slug' | 'venue_id'> & { venues: { claimed_by_user_id: string | null } | null }) | null
    bands: { name: string | null; user_id: string | null } | null
  }) | null

  if (!membership?.events) return { error: 'Event membership not found.' }

  const isVenueLeader = membership.events.venues?.claimed_by_user_id === userId
  const isArtistOwner = membership.bands?.user_id === userId
  const now = new Date().toISOString()
  const update: Partial<EventArtistMembership> = { status: input.status }
  let message: string | null = null

  if (input.status === 'accepted') {
    if (isArtistOwner && membership.status === 'invited' && !isVenueLeader) {
      const { error } = await supabase.rpc('accept_event_invite', {
        p_membership_id: input.membershipId,
      })
      if (error) return { error: error.message }
      eventPaths(membership.event_id, membership.events.slug)
      return { success: true }
    }

    if (!isVenueLeader && !(isArtistOwner && membership.status === 'invited')) {
      return { error: 'You do not have permission to accept this artist.' }
    }
    update.accepted_at = now
    message = `${membership.bands?.name ?? 'Artist'} joined Backstage.`
  } else if (input.status === 'declined') {
    if (!isVenueLeader) return { error: 'Only the venue leader can decline artists.' }
    update.declined_at = now
    message = `Venue declined ${membership.bands?.name ?? 'this artist'} for this event.`
  } else if (input.status === 'removed') {
    if (!isVenueLeader) return { error: 'Only the venue leader can remove artists.' }
    update.removed_at = now
    update.removal_note = normalizeText(input.note) || null
    message = `Venue removed ${membership.bands?.name ?? 'an artist'} from this Backstage.`
  } else if (input.status === 'removal_requested') {
    if (isArtistOwner) {
      const { error } = await supabase.rpc('request_event_removal', {
        p_membership_id: input.membershipId,
        p_note: normalizeText(input.note) || null,
      })
      if (error) return { error: error.message }
      eventPaths(membership.event_id, membership.events.slug)
      return { success: true }
    }

    if (!isArtistOwner) return { error: 'Only the artist can request removal.' }
    update.removal_requested_at = now
    update.removal_note = normalizeText(input.note) || null
    message = `${membership.bands?.name ?? 'Artist'} requested removal from this Backstage.`
  } else {
    return { error: 'Unsupported membership update.' }
  }

  const { error } = await supabase
    .from('event_artist_memberships')
    .update(update)
    .eq('id', input.membershipId)

  if (error) return { error: error.message }

  if (message && isVenueLeader) {
    await supabase.from('backstage_messages').insert({
      event_id: membership.event_id,
      sender_user_id: userId,
      sender_kind: 'system',
      body: normalizeText(input.note) ? `${message} Note: ${normalizeText(input.note)}` : message,
    })
  }

  eventPaths(membership.event_id, membership.events.slug)
  return { success: true }
}

export async function sendBackstageMessage(input: {
  eventId: string
  bandId?: string | null
  body: string
}): Promise<ActionResult> {
  const { supabase, userId } = await getUserId()
  if (!userId) return { error: 'You must be signed in.' }

  const body = normalizeText(input.body)
  if (!body) return { error: 'Message cannot be empty.' }

  const { data: event } = await supabase
    .from('events')
    .select('id, slug, venue_id, venues(claimed_by_user_id)')
    .eq('id', input.eventId)
    .single()

  const rawVenue = Array.isArray(event?.venues) ? event?.venues[0] : event?.venues
  const isVenueLeader = rawVenue?.claimed_by_user_id === userId

  if (isVenueLeader && !input.bandId) {
    const { error } = await supabase.from('backstage_messages').insert({
      event_id: input.eventId,
      sender_user_id: userId,
      sender_kind: 'venue',
      body,
    })
    if (error) return { error: error.message }
    eventPaths(input.eventId, event?.slug)
    return { success: true }
  }

  if (!input.bandId) return { error: 'Choose an artist profile to message from.' }

  const { data: membership } = await supabase
    .from('event_artist_memberships')
    .select('id, status, bands(user_id)')
    .eq('event_id', input.eventId)
    .eq('band_id', input.bandId)
    .single()

  const rawBand = Array.isArray(membership?.bands) ? membership?.bands[0] : membership?.bands
  if (!membership || rawBand?.user_id !== userId || !['accepted', 'removal_requested'].includes(membership.status)) {
    return { error: 'Only accepted artists can post in Backstage.' }
  }

  const { error } = await supabase.from('backstage_messages').insert({
    event_id: input.eventId,
    sender_user_id: userId,
    sender_kind: 'artist',
    sender_band_id: input.bandId,
    body,
  })

  if (error) return { error: error.message }
  eventPaths(input.eventId, event?.slug)
  return { success: true }
}

export async function markBackstageRead(eventId: string): Promise<ActionResult> {
  const { supabase, userId } = await getUserId()
  if (!userId) return { error: 'You must be signed in.' }

  const { error } = await supabase.from('backstage_read_states').upsert({
    event_id: eventId,
    user_id: userId,
    last_read_at: new Date().toISOString(),
  })

  if (error) return { error: error.message }
  revalidatePath(`/dashboard/backstage/${eventId}`)
  return { success: true }
}
