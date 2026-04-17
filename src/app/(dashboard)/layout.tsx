import { createClient } from '@/lib/supabase/server'
import { DashboardNav } from '@/components/dashboard/DashboardNav'
import { Navbar } from '@/components/marketing/Navbar'
import { Footer } from '@/components/marketing/Footer'
import type { ContactThreadStatus, ConversationSide } from '@/types/database'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    type NotificationThread = {
      id: string
      status: ContactThreadStatus
      requested_by_side: ConversationSide | null
      last_message_at: string | null
      last_read_at: string | null
    }

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
    const bandIds = (rawBands ?? []).map((band) => band.id)
    const venueIds = (rawVenues ?? []).map((venue) => venue.id)

    const [rawBandThreads, rawVenueThreads] = await Promise.all([
      bandIds.length > 0
        ? supabase
            .from('contact_threads')
            .select('id, status, requested_by_side, last_message_at, band_last_read_at')
            .in('band_id', bandIds)
        : Promise.resolve({ data: [] }),
      venueIds.length > 0
        ? supabase
            .from('contact_threads')
            .select('id, status, requested_by_side, last_message_at, venue_last_read_at')
            .in('venue_id', venueIds)
        : Promise.resolve({ data: [] }),
    ])

    const bandThreads = ((rawBandThreads.data ?? []) as Array<{
      id: string
      status: ContactThreadStatus
      requested_by_side: ConversationSide | null
      last_message_at: string | null
      band_last_read_at: string | null
    }>).map((thread) => ({
      id: thread.id,
      status: thread.status,
      requested_by_side: thread.requested_by_side,
      last_message_at: thread.last_message_at,
      last_read_at: thread.band_last_read_at,
    }))

    const venueThreads = ((rawVenueThreads.data ?? []) as Array<{
      id: string
      status: ContactThreadStatus
      requested_by_side: ConversationSide | null
      last_message_at: string | null
      venue_last_read_at: string | null
    }>).map((thread) => ({
      id: thread.id,
      status: thread.status,
      requested_by_side: thread.requested_by_side,
      last_message_at: thread.last_message_at,
      last_read_at: thread.venue_last_read_at,
    }))

    const [adminClaimsResult] = await Promise.all([
      profile?.is_admin
        ? supabase.from('venue_claims').select('id', { count: 'exact', head: true }).eq('status', 'pending')
        : Promise.resolve({ count: 0 }),
    ])

    const hasNotification = (threads: NotificationThread[], viewerSide: ConversationSide) =>
      threads.some((thread) => {
        if (thread.status === 'pending' && thread.requested_by_side !== viewerSide) {
          return true
        }

        if (!thread.last_message_at) return false

        if (!thread.last_read_at) return true

        return new Date(thread.last_message_at).getTime() > new Date(thread.last_read_at).getTime()
      })

    const inboxHasNotification =
      hasNotification(bandThreads, 'band') ||
      hasNotification(venueThreads, 'venue')

    const notifications = {
      inbox:        inboxHasNotification,
      pendingClaims: (userPendingClaimCount ?? 0) > 0,
      adminClaims:  (adminClaimsResult.count ?? 0) > 0,
    }

    return (
      <div className="min-h-screen bg-[#FAFAFA]">
        <DashboardNav isAdmin={profile?.is_admin ?? false} notifications={notifications} />
        <main>{children}</main>
      </div>
    )
  }

  // Public pages inside this route group (e.g. /venues) get the marketing shell
  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <Navbar />
      <main className="pt-14">{children}</main>
      <Footer />
    </div>
  )
}
