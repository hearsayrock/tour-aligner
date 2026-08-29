'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { slugify } from '@/lib/events'
import { ACTIVE_IDENTITY_COOKIE, resolveActiveIdentity, type ManagedIdentity } from '@/lib/managed-identity'
import type { Event, EventArtistMembership } from '@/types/database'

type ActionResult<T extends object = object> = T & { error?: string; success?: true }
type RecurrenceInput = {
  weekdays: number[]
  limitType: 'count' | 'end_date'
  occurrenceCount?: number | null
  endDate?: string | null
}

const DEFAULT_RECURRENCE_COUNT = 12
const MAX_RECURRENCE_OCCURRENCES = 104

function normalizeText(value: string | null | undefined) {
  return value?.trim() ?? ''
}

function eventPaths(eventId?: string, slug?: string) {
  revalidatePath('/dashboard')
  revalidatePath('/dashboard/backstage')
  revalidatePath('/dashboard/calendar')
  revalidatePath('/events')
  if (eventId) revalidatePath(`/dashboard/backstage/${eventId}`)
  if (slug) revalidatePath(`/events/${slug}`)
}

function parseIsoDate(isoDate: string) {
  const [year, month, day] = isoDate.split('-').map(Number)
  if (!year || !month || !day) return null

  const date = new Date(Date.UTC(year, month - 1, day))
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null
  }

  return date
}

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

function addDays(date: Date, days: number) {
  const next = new Date(date.getTime())
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

function normalizeWeekdays(weekdays: number[]) {
  return Array.from(
    new Set(
      weekdays
        .map((weekday) => Number(weekday))
        .filter((weekday) => Number.isInteger(weekday) && weekday >= 0 && weekday <= 6)
    )
  ).sort((a, b) => a - b)
}

function normalizeIsoDates(dates: string[]) {
  return Array.from(
    new Set(
      dates.filter((date) => parseIsoDate(date))
    )
  ).sort()
}

function buildOccurrenceDates(startIso: string, recurrence?: RecurrenceInput | null) {
  if (!recurrence) return { dates: [startIso] }

  const startDate = parseIsoDate(startIso)
  if (!startDate) return { error: 'Event date is invalid.' }

  const weekdays = normalizeWeekdays(recurrence.weekdays)
  if (weekdays.length === 0) return { error: 'Choose at least one recurring weekday.' }

  if (recurrence.limitType === 'count') {
    const occurrenceCount = recurrence.occurrenceCount ?? DEFAULT_RECURRENCE_COUNT
    if (!Number.isInteger(occurrenceCount) || occurrenceCount < 1) {
      return { error: 'Occurrence count must be at least 1.' }
    }
    if (occurrenceCount > MAX_RECURRENCE_OCCURRENCES) {
      return { error: `Recurring events are limited to ${MAX_RECURRENCE_OCCURRENCES} occurrences.` }
    }

    const dates: string[] = []
    for (let cursor = startDate; dates.length < occurrenceCount; cursor = addDays(cursor, 1)) {
      if (weekdays.includes(cursor.getUTCDay())) dates.push(toIsoDate(cursor))
    }
    return { dates, weekdays, occurrenceCount }
  }

  const endDate = recurrence.endDate ? parseIsoDate(recurrence.endDate) : null
  if (!endDate) return { error: 'Choose an end date for recurring events.' }
  if (endDate < startDate) return { error: 'Recurring end date must be on or after the first event date.' }

  const dates: string[] = []
  for (let cursor = startDate; cursor <= endDate; cursor = addDays(cursor, 1)) {
    if (weekdays.includes(cursor.getUTCDay())) dates.push(toIsoDate(cursor))
    if (dates.length > MAX_RECURRENCE_OCCURRENCES) {
      return { error: `Recurring events are limited to ${MAX_RECURRENCE_OCCURRENCES} occurrences.` }
    }
  }

  if (dates.length === 0) return { error: 'The recurrence settings do not create any events.' }
  return { dates, weekdays, endDate: toIsoDate(endDate) }
}

async function getUserId() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return { supabase, userId: user?.id ?? null }
}

async function getActiveManagedIdentity(
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
    .select('id, venue_id, slug, title, venues(claimed_by_user_id)')
    .eq('id', eventId)
    .single()

  const rawVenue = Array.isArray(event?.venues) ? event?.venues[0] : event?.venues
  if (!event || rawVenue?.claimed_by_user_id !== userId) return null

  return event as Pick<Event, 'id' | 'venue_id' | 'slug' | 'title'>
}

async function sendEventPrivateChat(
  supabase: Awaited<ReturnType<typeof createClient>>,
  input: {
    senderKind: 'band' | 'venue'
    senderId: string
    recipientKind: 'band' | 'venue'
    recipientId: string
    body: string
  }
) {
  const { data, error } = await supabase.rpc('request_private_chat', {
    p_sender_kind: input.senderKind,
    p_sender_id: input.senderId,
    p_recipient_kind: input.recipientKind,
    p_recipient_id: input.recipientId,
    p_body: input.body,
  })

  if (error) return { error: error.message }

  const result = data as { thread_id?: string; action?: string } | null
  if (!result?.thread_id || !result.action) {
    return { error: 'Unable to start the private chat.' }
  }

  if (result.action === 'incoming_pending') {
    return { error: 'A private chat request from this profile is waiting in your Inbox. Respond there before continuing.' }
  }

  if (result.action === 'existing') {
    const { error: messageError } = await supabase.rpc('send_private_chat_message', {
      p_thread_id: result.thread_id,
      p_sender_kind: input.senderKind,
      p_sender_id: input.senderId,
      p_body: input.body,
    })

    if (messageError) return { error: messageError.message }
  }

  return { threadId: result.thread_id }
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
  eventDates?: string[]
  startTime: string
  genreIds: string[]
  artistNeedDescription: string
  description: string
  attendeeCapacity: number
  neededArtistCount: number
  recurrence?: RecurrenceInput | null
}): Promise<ActionResult<{ eventId?: string; eventIds?: string[]; createdCount?: number; seriesId?: string }>> {
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

  const isRecurring = !!input.recurrence
  const recurrenceResult = isRecurring
    ? buildOccurrenceDates(input.eventDate, input.recurrence)
    : { dates: normalizeIsoDates([input.eventDate, ...(input.eventDates ?? [])]) }
  if (recurrenceResult.error) return { error: recurrenceResult.error }

  const occurrenceDates = recurrenceResult.dates ?? [input.eventDate]
  if (occurrenceDates.length === 0) return { error: 'Choose at least one event date.' }
  if (occurrenceDates.length > MAX_RECURRENCE_OCCURRENCES) {
    return { error: `Event creation is limited to ${MAX_RECURRENCE_OCCURRENCES} dates.` }
  }
  let seriesId: string | null = null

  const { data: unavailableDates } = await supabase
    .from('venue_unavailable_dates')
    .select('unavailable_date')
    .eq('venue_id', input.venueId)
    .in('unavailable_date', occurrenceDates)

  if ((unavailableDates ?? []).length > 0) {
    const blockedDate = unavailableDates?.[0]?.unavailable_date
    return { error: blockedDate ? `${blockedDate} is marked unavailable.` : 'One or more dates are marked unavailable.' }
  }

  if (isRecurring) {
    const { data: series, error: seriesError } = await supabase
      .from('event_series')
      .insert({
        venue_id: input.venueId,
        created_by_user_id: userId,
        recurrence_weekdays: recurrenceResult.weekdays ?? normalizeWeekdays(input.recurrence?.weekdays ?? []),
        start_date: input.eventDate,
        start_time: input.startTime,
        limit_type: input.recurrence?.limitType ?? 'count',
        occurrence_count: input.recurrence?.limitType === 'count'
          ? input.recurrence.occurrenceCount ?? DEFAULT_RECURRENCE_COUNT
          : null,
        recurrence_end_date: input.recurrence?.limitType === 'end_date'
          ? input.recurrence.endDate
          : null,
      })
      .select('id')
      .single()

    if (seriesError || !series) return { error: seriesError?.message ?? 'Unable to create recurring event series.' }
    seriesId = series.id
  }

  const eventRows = []
  for (const [index, eventDate] of occurrenceDates.entries()) {
    eventRows.push({
      venue_id: input.venueId,
      created_by_user_id: userId,
      event_series_id: seriesId,
      series_occurrence_index: seriesId ? index + 1 : null,
      title,
      slug: await uniqueEventSlug(supabase, title, eventDate),
      event_date: eventDate,
      start_time: input.startTime,
      artist_need_description: artistNeedDescription,
      description,
      attendee_capacity: input.attendeeCapacity,
      needed_artist_count: input.neededArtistCount,
      is_public: false,
      is_accepting_artists: true,
      status: 'draft' as const,
    })
  }

  const { data: events, error } = await supabase
    .from('events')
    .insert(eventRows)
    .select('id, slug')

  if (error || !events || events.length === 0) {
    if (seriesId) await supabase.from('event_series').delete().eq('id', seriesId)
    return { error: error?.message ?? 'Unable to create event.' }
  }

  const { error: genreError } = await supabase
    .from('event_genres')
    .insert(events.flatMap((event) => genreIds.map((genreId) => ({ event_id: event.id, genre_id: genreId }))))

  if (genreError) return { error: genreError.message }

  const { error: messageError } = await supabase.from('backstage_messages').insert(
    events.map((event) => ({
      event_id: event.id,
      sender_user_id: userId,
      sender_kind: 'system' as const,
      body: 'Backstage was created for this event.',
    }))
  )

  if (messageError) return { error: messageError.message }

  eventPaths(events[0].id, events[0].slug)
  return {
    success: true,
    eventId: events[0].id,
    eventIds: events.map((event) => event.id),
    createdCount: events.length,
    seriesId: seriesId ?? undefined,
  }
}

export async function createVenueUnavailableDates(input: {
  venueId: string
  startDate: string
  reason: string
  recurrence?: RecurrenceInput | null
}): Promise<ActionResult<{ createdCount?: number; unavailableDateIds?: string[]; seriesId?: string }>> {
  const { supabase, userId } = await getUserId()
  if (!userId) return { error: 'You must be signed in to update the calendar.' }

  const venue = await ensureVenueOwner(supabase, input.venueId, userId)
  if (!venue) return { error: 'You can only mark dates unavailable for venues you manage.' }

  if (!input.startDate) return { error: 'Choose a date first.' }

  const recurrenceResult = buildOccurrenceDates(input.startDate, input.recurrence)
  if (recurrenceResult.error) return { error: recurrenceResult.error }

  const unavailableDates = recurrenceResult.dates ?? [input.startDate]
  const isRecurring = !!input.recurrence
  const { data: existingEvents } = await supabase
    .from('events')
    .select('event_date, title')
    .eq('venue_id', input.venueId)
    .in('event_date', unavailableDates)

  if ((existingEvents ?? []).length > 0) {
    const event = existingEvents?.[0]
    return {
      error: event
        ? `${event.event_date} already has "${event.title}". Move or cancel that Event before marking the date unavailable.`
        : 'One or more selected dates already have Events.',
    }
  }

  let seriesId: string | null = null
  if (isRecurring) {
    const { data: series, error: seriesError } = await supabase
      .from('venue_unavailable_series')
      .insert({
        venue_id: input.venueId,
        created_by_user_id: userId,
        recurrence_weekdays: recurrenceResult.weekdays ?? normalizeWeekdays(input.recurrence?.weekdays ?? []),
        start_date: input.startDate,
        limit_type: input.recurrence?.limitType ?? 'count',
        occurrence_count: input.recurrence?.limitType === 'count'
          ? input.recurrence.occurrenceCount ?? DEFAULT_RECURRENCE_COUNT
          : null,
        recurrence_end_date: input.recurrence?.limitType === 'end_date'
          ? input.recurrence.endDate
          : null,
      })
      .select('id')
      .single()

    if (seriesError || !series) return { error: seriesError?.message ?? 'Unable to create unavailable date series.' }
    seriesId = series.id
  }

  const reason = normalizeText(input.reason) || null
  const { data: rows, error } = await supabase
    .from('venue_unavailable_dates')
    .upsert(
      unavailableDates.map((unavailableDate) => ({
        venue_id: input.venueId,
        unavailable_series_id: seriesId,
        unavailable_date: unavailableDate,
        reason,
        created_by_user_id: userId,
      })),
      { onConflict: 'venue_id,unavailable_date' }
    )
    .select('id')

  if (error || !rows) {
    if (seriesId) await supabase.from('venue_unavailable_series').delete().eq('id', seriesId)
    return { error: error?.message ?? 'Unable to mark dates unavailable.' }
  }

  eventPaths()
  return {
    success: true,
    createdCount: rows.length,
    unavailableDateIds: rows.map((row) => row.id),
    seriesId: seriesId ?? undefined,
  }
}

export async function deleteVenueUnavailableDate(input: {
  unavailableDateId: string
}): Promise<ActionResult> {
  const { supabase, userId } = await getUserId()
  if (!userId) return { error: 'You must be signed in to update the calendar.' }

  const { data: row } = await supabase
    .from('venue_unavailable_dates')
    .select('id, venue_id, venues(claimed_by_user_id)')
    .eq('id', input.unavailableDateId)
    .single()

  const rawVenue = Array.isArray(row?.venues) ? row?.venues[0] : row?.venues
  if (!row || rawVenue?.claimed_by_user_id !== userId) {
    return { error: 'You can only update unavailable dates for venues you manage.' }
  }

  const { error } = await supabase
    .from('venue_unavailable_dates')
    .delete()
    .eq('id', input.unavailableDateId)

  if (error) return { error: error.message }

  eventPaths()
  return { success: true }
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

  const activeIdentity = await getActiveManagedIdentity(supabase, userId)
  if (activeIdentity.kind !== 'band') {
    return { error: 'Select one artist profile before applying.' }
  }
  if (activeIdentity.id !== input.bandId) {
    return { error: `You are currently acting as ${activeIdentity.name}. Switch identities before applying from another artist profile.` }
  }

  const { data: band } = await supabase
    .from('bands')
    .select('id, name, user_id')
    .eq('id', input.bandId)
    .eq('user_id', userId)
    .single()

  if (!band) return { error: 'Choose an artist profile you manage.' }

  const { data: event } = await supabase
    .from('events')
    .select('id, venue_id, slug, title, is_public, is_accepting_artists, status')
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

  const privateChatResult = await sendEventPrivateChat(supabase, {
    senderKind: 'band',
    senderId: input.bandId,
    recipientKind: 'venue',
    recipientId: event.venue_id,
    body: `Application for ${event.title}\n\n${normalizeText(input.note)}`,
  })
  if (privateChatResult.error) return privateChatResult

  const payload = {
    event_id: input.eventId,
    band_id: input.bandId,
    status: 'applied' as const,
    source: 'application' as const,
    applied_at: now,
  }

  const { error } = existing
    ? await supabase.from('event_artist_memberships').update(payload).eq('id', existing.id)
    : await supabase.from('event_artist_memberships').insert(payload)

  if (error) return { error: error.message }

  eventPaths(input.eventId, event.slug)
  revalidatePath('/dashboard/inbox')
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

  const activeIdentity = await getActiveManagedIdentity(supabase, userId)
  if (activeIdentity.kind !== 'venue' || activeIdentity.id !== event.venue_id) {
    return { error: 'Switch to the venue profile that owns this Backstage before inviting an artist.' }
  }

  const { data: band } = await supabase.from('bands').select('id, name').eq('id', input.bandId).single()
  if (!band) return { error: 'Artist not found.' }

  const privateChatResult = await sendEventPrivateChat(supabase, {
    senderKind: 'venue',
    senderId: event.venue_id,
    recipientKind: 'band',
    recipientId: input.bandId,
    body: `Invitation to perform at ${event.title}${normalizeText(input.note) ? `\n\n${normalizeText(input.note)}` : ''}`,
  })
  if (privateChatResult.error) return privateChatResult

  const now = new Date().toISOString()
  const payload = {
    event_id: input.eventId,
    band_id: input.bandId,
    status: 'invited' as const,
    source: 'invitation' as const,
    invited_at: now,
  }

  const { error } = await supabase
    .from('event_artist_memberships')
    .upsert(payload, { onConflict: 'event_id,band_id' })

  if (error) return { error: error.message }

  eventPaths(input.eventId, event.slug)
  revalidatePath('/dashboard/inbox')
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
  const activeIdentity = isVenueLeader || isArtistOwner
    ? await getActiveManagedIdentity(supabase, userId)
    : null
  const isActiveVenueLeader =
    isVenueLeader && activeIdentity?.kind === 'venue' && activeIdentity.id === membership.events.venue_id
  const isActiveArtistOwner =
    isArtistOwner && activeIdentity?.kind === 'band' && activeIdentity.id === membership.band_id
  if ((isVenueLeader || isArtistOwner) && !isActiveVenueLeader && !isActiveArtistOwner) {
    return { error: 'Switch to the profile that owns this Backstage before updating it.' }
  }
  const now = new Date().toISOString()
  const update: Partial<EventArtistMembership> = { status: input.status }
  let message: string | null = null

  if (input.status === 'accepted') {
    if (isActiveArtistOwner && membership.status === 'invited' && !isActiveVenueLeader) {
      const { error } = await supabase.rpc('accept_event_invite', {
        p_membership_id: input.membershipId,
      })
      if (error) return { error: error.message }
      eventPaths(membership.event_id, membership.events.slug)
      return { success: true }
    }

    if (!isActiveVenueLeader && !(isActiveArtistOwner && membership.status === 'invited')) {
      return { error: 'You do not have permission to accept this artist.' }
    }
    update.accepted_at = now
    message = `${membership.bands?.name ?? 'Artist'} joined Backstage.`
  } else if (input.status === 'declined') {
    if (!isActiveVenueLeader) return { error: 'Only the active venue profile can decline artists.' }
    update.declined_at = now
    message = `Venue declined ${membership.bands?.name ?? 'this artist'} for this event.`
  } else if (input.status === 'removed') {
    if (!isActiveVenueLeader) return { error: 'Only the active venue profile can remove artists.' }
    update.removed_at = now
    update.removal_note = normalizeText(input.note) || null
    message = `Venue removed ${membership.bands?.name ?? 'an artist'} from this Backstage.`
  } else if (input.status === 'removal_requested') {
    if (isActiveArtistOwner) {
      const { error } = await supabase.rpc('request_event_removal', {
        p_membership_id: input.membershipId,
        p_note: normalizeText(input.note) || null,
      })
      if (error) return { error: error.message }
      eventPaths(membership.event_id, membership.events.slug)
      return { success: true }
    }

    if (!isActiveArtistOwner) return { error: 'Only the active artist profile can request removal.' }
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

  if (message && isActiveVenueLeader) {
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
    const activeIdentity = await getActiveManagedIdentity(supabase, userId)
    if (activeIdentity.kind !== 'venue' || activeIdentity.id !== event?.venue_id) {
      return { error: 'Switch to the venue profile before posting as the venue.' }
    }

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
  const activeIdentity = await getActiveManagedIdentity(supabase, userId)
  if (activeIdentity.kind !== 'band') {
    return { error: 'Select one artist profile before posting in Backstage.' }
  }
  if (activeIdentity.id !== input.bandId) {
    return { error: `You are currently acting as ${activeIdentity.name}. Switch identities before posting from another artist profile.` }
  }

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
