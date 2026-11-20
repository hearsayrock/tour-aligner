import 'server-only'
import { createClient } from '@/lib/supabase/server'
import type { Changes, StudioKind } from './model'
export async function loadDraft(kind: StudioKind, id: string) {
  const db = await createClient()
  const { data, error } = await db
    .from('studio_drafts')
    .select('revision,changes')
    .eq('kind', kind)
    .eq('entity_id', id)
    .maybeSingle()
  if (error) throw new Error('Could not load the private draft. Reload before editing.')
  return { revision: data?.revision ?? 0, changes: (data?.changes ?? {}) as Changes }
}
