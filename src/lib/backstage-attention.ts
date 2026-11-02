import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Event } from '@/types/database'
import type { ManagedIdentity } from './managed-identity'

type AttentionEvent = Pick<Event, 'id' | 'title' | 'event_date' | 'start_time'>

export type BackstageAttentionItem = AttentionEvent & { pendingCount: number }

// Keep the navigation indicator and the Backstages action list on the same scope.
// Dates match the Backstages page: today's events belong to Upcoming.
export async function loadBackstageAttention(
  supabase: SupabaseClient<Database>,
  identity: ManagedIdentity | null,
  todayIso = new Date().toISOString().slice(0, 10)
): Promise<BackstageAttentionItem[]> {
  if (!identity) return []

  let query = supabase
    .from('event_artist_memberships')
    .select('events!inner(id, title, event_date, start_time)')
    .eq('status', identity.kind === 'band' ? 'invited' : 'applied')
    .eq('events.status', 'active')
    .gte('events.event_date', todayIso)

  query = identity.kind === 'band'
    ? query.eq('band_id', identity.id)
    : query.eq('events.venue_id', identity.id)

  const { data, error } = await query
  if (error) throw error

  const items = new Map<string, BackstageAttentionItem>()
  for (const row of data ?? []) {
    const event = Array.isArray(row.events) ? row.events[0] : row.events
    if (!event) continue
    const existing = items.get(event.id)
    if (existing) existing.pendingCount += 1
    else items.set(event.id, { ...event, pendingCount: 1 })
  }

  return [...items.values()].sort((a, b) =>
    `${a.event_date}T${a.start_time}`.localeCompare(`${b.event_date}T${b.start_time}`)
  )
}
