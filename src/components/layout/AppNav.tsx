import { cookies } from 'next/headers'
import { ActivityHeartbeat } from '@/components/auth/ActivityHeartbeat'
import { InboxRealtime } from '@/components/contact/InboxRealtime'
import { DashboardNav } from '@/components/dashboard/DashboardNav'
import { Navbar } from '@/components/marketing/Navbar'
import { isStagingEnvironment } from '@/lib/deployment-environment'
import { ACTIVE_IDENTITY_COOKIE, resolveActiveIdentity, type ManagedIdentity } from '@/lib/managed-identity'
import { getServerTimingStart, logServerTiming, measureServerOperation } from '@/lib/performance'
import { getManagedUserData } from '@/lib/managed-user-data'

/**
 * Renders DashboardNav for logged-in users and Navbar for logged-out users.
 * Use this in all layouts so the nav is always consistent.
 */
export async function AppNav({ userId }: { userId: string | null }) {
  const startedAt = getServerTimingStart()
  const showStagingBadge = isStagingEnvironment()
  if (!userId) return <Navbar userId={null} />

  const [managedUserDataQuery, cookieQuery] = await Promise.all([
    measureServerOperation(getManagedUserData(userId)),
    measureServerOperation(cookies()),
  ])

  const { profile, bands, venues } = managedUserDataQuery.value
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
  const cookieStore = cookieQuery.value
  const activeIdentity = resolveActiveIdentity(cookieStore.get(ACTIVE_IDENTITY_COOKIE)?.value, identities)
  logServerTiming('app nav', {
    managedData: managedUserDataQuery.duration,
    cookies: cookieQuery.duration,
    total: getServerTimingStart() - startedAt,
  })

  return (
    <>
      <ActivityHeartbeat />
      <InboxRealtime />
      <DashboardNav
        showStagingBadge={showStagingBadge}
        isAdmin={profile?.is_admin ?? false}
        phaseOne
        notificationScope={{ userId, bandIds, venueIds }}
        hasVenues={venueIds.length > 0}
        activeIdentity={activeIdentity}
        identities={identities}
      />
    </>
  )
}
