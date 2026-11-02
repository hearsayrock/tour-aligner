import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { Suspense } from 'react'
import { AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getServerTimingStart, logServerTiming } from '@/lib/performance'
import { getManagedUserData } from '@/lib/managed-user-data'
import { loadDashboardActivity } from '@/lib/dashboard-activity'
import { EMPTY_DISCOVERY, loadDashboardDiscovery } from '@/lib/dashboard-discovery'
import { ACTIVE_IDENTITY_COOKIE, resolveActiveIdentity, type ActiveIdentity, type ManagedIdentity } from '@/lib/managed-identity'
import { DashboardActivitySkeleton, DashboardActivityView } from '@/components/dashboard/DashboardActivity'
import { Card } from '@/components/ui/primitives'

export const metadata = { title: 'Dashboard' }

async function DashboardActivity({ userId, activeIdentity, identities }: {
  userId: string
  activeIdentity: ActiveIdentity
  identities: ManagedIdentity[]
}) {
  const startedAt = getServerTimingStart()
  const supabase = await createClient()
  let activity
  try {
    activity = await loadDashboardActivity(supabase, { userId, activeIdentity, identities })
  } catch (error) {
    console.error('Failed to load dashboard activity', error)
    return (
      <Card className="flex items-start gap-3 p-5" as="div">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#A84216]" aria-hidden="true" />
        <div role="alert">
          <p className="font-semibold text-[#252525]">Dashboard activity could not be loaded</p>
          <p className="mt-1 text-sm text-[#777777]">Refresh the page to try again.</p>
        </div>
      </Card>
    )
  }
  let discovery = EMPTY_DISCOVERY
  try {
    discovery = await loadDashboardDiscovery(supabase, { userId, activeIdentity, activity })
  } catch (error) {
    console.error('Failed to load dashboard discovery', error)
    discovery = { ...EMPTY_DISCOVERY, available: false, kind: activeIdentity.kind === 'band' ? 'venues' : activeIdentity.kind === 'venue' ? 'artists' : null }
  }
  logServerTiming('dashboard activity', { total: getServerTimingStart() - startedAt })
  return <DashboardActivityView activity={activity} activeIdentity={activeIdentity} identities={identities} discovery={discovery} />
}

export default async function DashboardPage() {
  const startedAt = getServerTimingStart()
  const supabase = await createClient()
  const sessionStartedAt = getServerTimingStart()
  const { data: { session } } = await supabase.auth.getSession()
  const sessionMs = getServerTimingStart() - sessionStartedAt
  const userId = session?.user.id
  if (!userId) return redirect('/login')

  const identityStartedAt = getServerTimingStart()
  const [managedUserData, cookieStore] = await Promise.all([
    getManagedUserData(userId),
    cookies(),
  ])
  const identityMs = getServerTimingStart() - identityStartedAt
  const { bands, venues } = managedUserData
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
  const activeIdentity = resolveActiveIdentity(cookieStore.get(ACTIVE_IDENTITY_COOKIE)?.value, identities)

  logServerTiming('dashboard shell', {
    session: sessionMs,
    identities: identityMs,
    total: getServerTimingStart() - startedAt,
  })

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <header className="mb-6 lg:pr-12">
        <h1 className="text-2xl font-bold tracking-tight text-[#181818]">Dashboard</h1>
        <p className="mt-1 text-sm text-[#777777]">{activeIdentity.kind === 'all' ? 'All profiles' : activeIdentity.name}</p>
      </header>

      <Suspense key={activeIdentity.kind === 'all' ? 'all' : `${activeIdentity.kind}:${activeIdentity.id}`} fallback={<DashboardActivitySkeleton />}>
        <DashboardActivity userId={userId} activeIdentity={activeIdentity} identities={identities} />
      </Suspense>
    </div>
  )
}
