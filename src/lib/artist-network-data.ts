import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

export async function loadArtistFollowState(supabase: SupabaseClient<Database>, artistId: string, targetIds: string[]) {
  if (targetIds.length === 0) return { following: new Set<string>(), followers: new Set<string>(), available: true }

  const [outgoing, incoming] = await Promise.all([
    supabase.from('artist_follows').select('followed_band_id').eq('follower_band_id', artistId).in('followed_band_id', targetIds),
    supabase.from('artist_follows').select('follower_band_id').eq('followed_band_id', artistId).in('follower_band_id', targetIds),
  ])

  return {
    following: new Set((outgoing.data ?? []).map((row) => row.followed_band_id)),
    followers: new Set((incoming.data ?? []).map((row) => row.follower_band_id)),
    available: !outgoing.error && !incoming.error,
  }
}
