'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  CalendarDays,
  CalendarRange,
  Inbox,
  LayoutDashboard,
  MapPin,
  Mic2,
  Plus,
  Search,
} from 'lucide-react'
import { IdentitySwitcher } from '@/components/dashboard/IdentitySwitcher'
import { EnvironmentBadge } from '@/components/layout/EnvironmentBadge'
import { NavAccountMenu } from '@/components/ui/NavAccountMenu'
import { Badge, cx } from '@/components/ui/primitives'
import type { ActiveIdentity, ManagedIdentity } from '@/lib/managed-identity'

interface Notifications {
  inbox: boolean
  backstage: boolean
  pendingClaims: boolean
  adminClaims: boolean
}

const NAV_LINKS = [
  { label: 'Dashboard', shortLabel: 'Home', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Inbox', shortLabel: 'Inbox', href: '/dashboard/inbox', icon: Inbox },
  { label: 'Backstages', shortLabel: 'Backstage', href: '/dashboard/backstage', icon: CalendarRange },
  { label: 'Calendar', shortLabel: 'Calendar', href: '/dashboard/calendar', icon: CalendarDays },
  { label: 'Available Events', shortLabel: 'Events', href: '/events', icon: Search },
  { label: 'Artists', shortLabel: 'Artists', href: '/dashboard/bands', icon: Mic2 },
  { label: 'Venues', shortLabel: 'Venues', href: '/dashboard/venues', icon: MapPin },
]

function Dot({ className }: { className?: string }) {
  return <span className={cx('h-2 w-2 rounded-full bg-[#FD6A2F] ring-2 ring-white', className)} />
}

export function DashboardNav({
  showStagingBadge = false,
  isAdmin = false,
  phaseOne = false,
  notifications,
  hasVenues = false,
  activeIdentity,
  identities = [],
}: {
  showStagingBadge?: boolean
  isAdmin?: boolean
  phaseOne?: boolean
  notifications?: Notifications
  hasVenues?: boolean
  activeIdentity?: ActiveIdentity
  identities?: ManagedIdentity[]
}) {
  const pathname = usePathname()
  const isPhaseOneArtist = phaseOne && !isAdmin
  const links = NAV_LINKS
  const allowAllIdentities = !isPhaseOneArtist && pathname === '/dashboard'

  function isActive(href: string) {
    return href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href)
  }

  function dotForLink(href: string) {
    if (!notifications) return false
    if (href === '/dashboard/inbox') return notifications.inbox
    if (href === '/dashboard/backstage') return notifications.backstage
    if (href === '/dashboard/venues') return notifications.pendingClaims
    return false
  }

  return (
    <>
      {!isPhaseOneArtist && (
      <aside className={`fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-[#E3E1DC] bg-[#FBFBFA] lg:flex ${isPhaseOneArtist ? 'w-20' : 'w-60'}`}>
        <div className="flex h-full flex-col">
          <div className={cx('border-b border-[#E8E6E0]', isPhaseOneArtist ? 'flex h-20 items-center justify-center' : 'px-5 py-5')}>
            <Link
              href={isPhaseOneArtist ? '/dashboard/profiles' : '/dashboard'}
              aria-label={isPhaseOneArtist ? 'My Artist Profiles' : undefined}
              className={cx('flex min-h-11 items-center gap-3', isPhaseOneArtist && 'h-11 w-11 justify-center rounded-2xl text-[#FD6A2F] transition-colors hover:bg-[#FFF3EE]')}
            >
              {isPhaseOneArtist ? <MapPin className="h-6 w-6" /> : <Image src="/logo.png" alt="TourAligner" width={142} height={37} priority />}
              {!isPhaseOneArtist && showStagingBadge && <EnvironmentBadge />}
            </Link>
            {!isPhaseOneArtist && <div className="mt-5">
              {activeIdentity ? (
                <IdentitySwitcher
                  activeIdentity={activeIdentity}
                  identities={identities}
                  allowAll={allowAllIdentities}
                  className="w-full"
                />
              ) : (
                <Badge tone="muted">No profile selected</Badge>
              )}
            </div>}
          </div>

          <nav className={cx('flex-1 space-y-1 px-3 py-4', isPhaseOneArtist && 'hidden')}>
            {links.map(({ href, label, icon: Icon }) => {
              const active = isActive(href)
              const hasDot = dotForLink(href)
              return (
                <Link
                  key={href}
                  href={href}
                  className={cx(
                    'group flex min-h-11 items-center justify-between rounded-xl px-3 text-sm font-semibold transition-colors',
                    active
                      ? 'bg-[#252525] text-white shadow-sm'
                      : 'text-[#5F5F5F] hover:bg-white hover:text-[#252525]'
                  )}
                >
                  <span className="flex items-center gap-3">
                    <Icon className={cx('h-4.5 w-4.5', active ? 'text-white' : 'text-[#8B8B8B] group-hover:text-[#FD6A2F]')} />
                    {label}
                  </span>
                  {hasDot && <Dot className={active ? 'ring-[#252525]' : ''} />}
                </Link>
              )
            })}
          </nav>

          <div className={cx('border-t border-[#E8E6E0]', isPhaseOneArtist ? 'flex justify-center p-4' : 'px-3 py-4')}>
            {isPhaseOneArtist ? (
              <NavAccountMenu
                isAdmin={isAdmin}
                notifications={{ adminClaims: notifications?.adminClaims ?? false }}
                placement="right"
                showManageProfiles={identities.length > 0}
              />
            ) : (
              <>
            {hasVenues && (
              <Link
                href="/dashboard/events/new"
                className="mb-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#FD6A2F] px-3 text-sm font-semibold text-white transition-colors hover:bg-[#E55A22]"
              >
                <Plus className="h-4 w-4" />
                Event
              </Link>
            )}
              </>
            )}
          </div>
        </div>
      </aside>
      )}

      {!isPhaseOneArtist && (
        <div className="fixed right-8 top-5 z-50 hidden lg:block">
          <NavAccountMenu
            isAdmin={isAdmin}
            notifications={{ adminClaims: notifications?.adminClaims ?? false }}
          />
        </div>
      )}

      <header className={cx('sticky top-0 z-30 border-b border-[#E3E1DC] bg-[#FBFBFA]/95 px-4 py-3 backdrop-blur', !isPhaseOneArtist && 'lg:hidden')}>
        <div className={cx('flex items-center justify-between gap-3', isPhaseOneArtist && 'mx-auto max-w-7xl')}>
          <Link href={isPhaseOneArtist ? '/dashboard/profiles' : '/dashboard'} className="flex min-h-10 items-center gap-2">
            <Image src="/logo.png" alt="TourAligner" width={isPhaseOneArtist ? 142 : 126} height={isPhaseOneArtist ? 37 : 33} priority />
            {showStagingBadge && <EnvironmentBadge />}
          </Link>
          <div className="flex items-center gap-2">
            {!isPhaseOneArtist && activeIdentity && (
              <div className="lg:hidden">
                <IdentitySwitcher
                  activeIdentity={activeIdentity}
                  identities={identities}
                  allowAll={allowAllIdentities}
                />
              </div>
            )}
            {isPhaseOneArtist ? (
              <NavAccountMenu
                isAdmin={isAdmin}
                notifications={{ adminClaims: notifications?.adminClaims ?? false }}
                showManageProfiles={identities.length > 0}
              />
            ) : (
              <div className="lg:hidden">
                <NavAccountMenu
                  isAdmin={isAdmin}
                  notifications={{ adminClaims: notifications?.adminClaims ?? false }}
                />
              </div>
            )}
          </div>
        </div>
      </header>

    </>
  )
}
