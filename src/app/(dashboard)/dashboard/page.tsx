import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { Suspense } from 'react'
import { AlertCircle, Layers3, MapPin, Mic2 } from 'lucide-react'
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
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-brand-tint-text" aria-hidden="true" />
        <div role="alert">
          <p className="font-semibold text-ink">Dashboard activity could not be loaded</p>
          <p className="mt-1 text-sm text-text-secondary">Refresh the page to try again.</p>
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

  const IdentityIcon = activeIdentity.kind === 'venue' ? MapPin : activeIdentity.kind === 'band' ? Mic2 : Layers3
  return (
    <div className="workspace-page dashboard-page">
      <header className="dashboard-masthead">
        <h1>Dashboard</h1>
        <p><IdentityIcon size={16} aria-hidden="true" />{activeIdentity.kind === 'all' ? 'All profiles' : activeIdentity.name}</p>
      </header>

      <Suspense key={activeIdentity.kind === 'all' ? 'all' : `${activeIdentity.kind}:${activeIdentity.id}`} fallback={<DashboardActivitySkeleton />}>
        <DashboardActivity userId={userId} activeIdentity={activeIdentity} identities={identities} />
      </Suspense>
    </div>
  )
}
