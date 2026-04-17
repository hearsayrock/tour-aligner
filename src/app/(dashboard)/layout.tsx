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
      band_last_read_at: string | null
      venue_last_read_at: string | null
      bands: { user_id: string } | null
      venues: { claimed_by_user_id: string | null } | null
    }

    const [{ data: rawProfile }, { count: userPendingClaimCount }, { data: rawThreads }] = await Promise.all([
      supabase.from('profiles').select('is_admin').eq('id', user.id).single(),
      supabase.from('venue_claims').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'pending'),
      supabase
        .from('contact_threads')
        .select(`
          id,
          status,
          requested_by_side,
          last_message_at,
          band_last_read_at,
          venue_last_read_at,
          bands (user_id),
          venues (claimed_by_user_id)
        `),
    ])
    const profile = rawProfile as { is_admin: boolean } | null
    const threads = rawThreads as unknown as NotificationThread[] | null

    const [adminClaimsResult] = await Promise.all([
      profile?.is_admin
        ? supabase.from('venue_claims').select('id', { count: 'exact', head: true }).eq('status', 'pending')
        : Promise.resolve({ count: 0 }),
    ])

    const inboxHasNotification = (threads ?? []).some((thread) => {
      const viewerSide =
        thread.bands?.user_id === user.id
          ? 'band'
          : thread.venues?.claimed_by_user_id === user.id
            ? 'venue'
            : null

      if (!viewerSide) return false

      if (thread.status === 'pending' && thread.requested_by_side !== viewerSide) {
        return true
      }

      if (!thread.last_message_at) return false

      const lastReadAt =
        viewerSide === 'band' ? thread.band_last_read_at : thread.venue_last_read_at

      if (!lastReadAt) return true

      return new Date(thread.last_message_at).getTime() > new Date(lastReadAt).getTime()
    })

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
