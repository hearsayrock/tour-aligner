import { createClient } from '@/lib/supabase/server'
import { ActivityHeartbeat } from '@/components/auth/ActivityHeartbeat'
import { DashboardNav } from '@/components/dashboard/DashboardNav'
import { Navbar } from '@/components/marketing/Navbar'
import type { ContactThreadStatus, ConversationSide } from '@/types/database'

/**
 * Renders DashboardNav for logged-in users and Navbar for logged-out users.
 * Use this in all layouts so the nav is always consistent.
 */
export async function AppNav() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return <Navbar />

  const [
    { data: rawProfile },
    { count: userPendingClaimCount },
    { data: rawBands },
    { data: rawVenues },
  ] = await Promise.all([
    supabase.from('profiles').select('is_admin').eq('id', user.id).single(),
    supabase.from('venue_claims').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'pending'),
    supabase.from('bands').select('id').eq('user_id', user.id),
    supabase.from('venues').select('id').eq('claimed_by_user_id', user.id),
  ])

  const profile = rawProfile as { is_admin: boolean } | null
  const bandIds = (rawBands ?? []).map((b) => b.id)
  const venueIds = (rawVenues ?? []).map((v) => v.id)

  const [rawBandThreads, rawVenueThreads] = await Promise.all([
    bandIds.length > 0
      ? supabase
          .from('contact_threads')
          .select('id, status, requested_by_side, last_message_at, band_last_read_at, band_archived_at')
          .in('band_id', bandIds)
      : Promise.resolve({ data: [] }),
    venueIds.length > 0
      ? supabase
          .from('contact_threads')
          .select('id, status, requested_by_side, last_message_at, venue_last_read_at, venue_archived_at')
          .in('venue_id', venueIds)
      : Promise.resolve({ data: [] }),
  ])

  type Thread = {
    id: string
    status: ContactThreadStatus
    requested_by_side: ConversationSide | null
    last_message_at: string | null
    last_read_at: string | null
    archived_at: string | null
  }

  const bandThreads: Thread[] = ((rawBandThreads.data ?? []) as Array<{
    id: string; status: ContactThreadStatus; requested_by_side: ConversationSide | null
    last_message_at: string | null; band_last_read_at: string | null; band_archived_at: string | null
  }>).map((t) => ({ id: t.id, status: t.status, requested_by_side: t.requested_by_side, last_message_at: t.last_message_at, last_read_at: t.band_last_read_at, archived_at: t.band_archived_at }))

  const venueThreads: Thread[] = ((rawVenueThreads.data ?? []) as Array<{
    id: string; status: ContactThreadStatus; requested_by_side: ConversationSide | null
    last_message_at: string | null; venue_last_read_at: string | null; venue_archived_at: string | null
  }>).map((t) => ({ id: t.id, status: t.status, requested_by_side: t.requested_by_side, last_message_at: t.last_message_at, last_read_at: t.venue_last_read_at, archived_at: t.venue_archived_at }))

  const adminClaimsResult = profile?.is_admin
    ? await supabase.from('venue_claims').select('id', { count: 'exact', head: true }).eq('status', 'pending')
    : { count: 0 }

  function hasUnread(threads: Thread[], viewerSide: ConversationSide) {
    return threads.some((t) => {
      if (t.archived_at) return false
      if (t.status === 'pending' && t.requested_by_side !== viewerSide) return true
      if (!t.last_message_at) return false
      if (!t.last_read_at) return true
      return new Date(t.last_message_at).getTime() > new Date(t.last_read_at).getTime()
    })
  }

  const notifications = {
    inbox:         hasUnread(bandThreads, 'band') || hasUnread(venueThreads, 'venue'),
    pendingClaims: (userPendingClaimCount ?? 0) > 0,
    adminClaims:   (adminClaimsResult.count ?? 0) > 0,
  }

  return (
    <>
      <ActivityHeartbeat />
      <DashboardNav
        isAdmin={profile?.is_admin ?? false}
        notifications={notifications}
        hasBands={bandIds.length > 0}
        hasVenues={venueIds.length > 0}
      />
    </>
  )
}
