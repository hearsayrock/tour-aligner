import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { ActivityHeartbeat } from '@/components/auth/ActivityHeartbeat'
import { DashboardNav } from '@/components/dashboard/DashboardNav'
import { Navbar } from '@/components/marketing/Navbar'
import { isStagingEnvironment } from '@/lib/deployment-environment'
import { ACTIVE_IDENTITY_COOKIE, resolveActiveIdentity, type ManagedIdentity } from '@/lib/managed-identity'

/**
 * Renders DashboardNav for logged-in users and Navbar for logged-out users.
 * Use this in all layouts so the nav is always consistent.
 */
export async function AppNav() {
  const showStagingBadge = isStagingEnvironment()
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
    supabase.from('bands').select('id, name, slug').eq('user_id', user.id).eq('is_active', true).order('name'),
    supabase.from('venues').select('id, name, slug').eq('claimed_by_user_id', user.id).eq('is_active', true).order('name'),
  ])

  const profile = rawProfile as { is_admin: boolean } | null
  const bands = (rawBands ?? []) as Array<{ id: string; name: string; slug: string }>
  const venues = (rawVenues ?? []) as Array<{ id: string; name: string; slug: string }>
  const bandIds = bands.map((b) => b.id)
  const venueIds = venues.map((v) => v.id)
  const identities: ManagedIdentity[] = [
    ...bands.map((band) => ({
      kind: 'band' as const,
      id: band.id,
      name: band.name,
      href: `/dashboard/bands/${band.id}/edit`,
    })),
    ...venues.map((venue) => ({
      kind: 'venue' as const,
      id: venue.id,
      name: venue.name,
      href: `/dashboard/venues/${venue.id}/edit`,
    })),
  ]
  const cookieStore = await cookies()
  const activeIdentity = resolveActiveIdentity(cookieStore.get(ACTIVE_IDENTITY_COOKIE)?.value, identities)

  const adminClaimsResult = profile?.is_admin
    ? await supabase.from('venue_claims').select('id', { count: 'exact', head: true }).eq('status', 'pending')
    : { count: 0 }
  const [{ count: invitedMembershipCount }, { data: venueEventIds }] = await Promise.all([
    bandIds.length
      ? supabase
          .from('event_artist_memberships')
          .select('id', { count: 'exact', head: true })
          .in('band_id', bandIds)
          .eq('status', 'invited')
      : Promise.resolve({ count: 0 }),
    venueIds.length
      ? supabase
          .from('events')
          .select('id')
          .in('venue_id', venueIds)
          .in('status', ['draft', 'active'])
      : Promise.resolve({ data: [] }),
  ])
  const eventIds = (venueEventIds ?? []).map((event) => event.id)
  const { count: venueApplicationCount } = eventIds.length
    ? await supabase
        .from('event_artist_memberships')
        .select('id', { count: 'exact', head: true })
        .in('event_id', eventIds)
        .eq('status', 'applied')
    : { count: 0 }

  const notifications = {
    backstage:     (invitedMembershipCount ?? 0) > 0 || (venueApplicationCount ?? 0) > 0,
    pendingClaims: (userPendingClaimCount ?? 0) > 0,
    adminClaims:   (adminClaimsResult.count ?? 0) > 0,
  }

  return (
    <>
      <ActivityHeartbeat />
      <DashboardNav
        showStagingBadge={showStagingBadge}
        isAdmin={profile?.is_admin ?? false}
        notifications={notifications}
        hasVenues={venueIds.length > 0}
        activeIdentity={activeIdentity}
        identities={identities}
      />
    </>
  )
}
