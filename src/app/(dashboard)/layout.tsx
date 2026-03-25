import { createClient } from '@/lib/supabase/server'
import { DashboardNav } from '@/components/dashboard/DashboardNav'
import { Navbar } from '@/components/marketing/Navbar'
import { Footer } from '@/components/marketing/Footer'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const [{ data: profile }, { data: ownedVenues }, { count: userPendingClaimCount }] = await Promise.all([
      supabase.from('profiles').select('is_admin').eq('id', user.id).single(),
      supabase.from('venues').select('id').eq('claimed_by_user_id', user.id),
      supabase.from('venue_claims').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'pending'),
    ])

    const ownedVenueIds = (ownedVenues ?? []).map((v) => v.id)

    const [pendingInquiryResult, adminClaimsResult] = await Promise.all([
      ownedVenueIds.length > 0
        ? supabase.from('booking_inquiries').select('id', { count: 'exact', head: true }).eq('status', 'pending').in('venue_id', ownedVenueIds)
        : Promise.resolve({ count: 0 }),
      profile?.is_admin
        ? supabase.from('venue_claims').select('id', { count: 'exact', head: true }).eq('status', 'pending')
        : Promise.resolve({ count: 0 }),
    ])

    const notifications = {
      inquiries:    (pendingInquiryResult.count ?? 0) > 0,
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
