'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  CalendarRange,
  LayoutDashboard,
  MapPin,
  Mic2,
  Plus,
  Search,
  Shield,
} from 'lucide-react'
import { IdentitySwitcher } from '@/components/dashboard/IdentitySwitcher'
import { EnvironmentBadge } from '@/components/layout/EnvironmentBadge'
import { NavAccountMenu } from '@/components/ui/NavAccountMenu'
import { Badge, cx } from '@/components/ui/primitives'
import type { ActiveIdentity, ManagedIdentity } from '@/lib/managed-identity'

interface Notifications {
  backstage: boolean
  pendingClaims: boolean
  adminClaims: boolean
}

const NAV_LINKS = [
  { label: 'Dashboard', shortLabel: 'Home', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Backstages', shortLabel: 'Backstage', href: '/dashboard/backstage', icon: CalendarRange },
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
  notifications,
  hasVenues = false,
  activeIdentity,
  identities = [],
}: {
  showStagingBadge?: boolean
  isAdmin?: boolean
  notifications?: Notifications
  hasVenues?: boolean
  activeIdentity?: ActiveIdentity
  identities?: ManagedIdentity[]
}) {
  const pathname = usePathname()
  const allowAllIdentities = pathname === '/dashboard'

  function isActive(href: string) {
    return href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href)
  }

  function dotForLink(href: string) {
    if (!notifications) return false
    if (href === '/dashboard/backstage') return notifications.backstage
    if (href === '/dashboard/venues') return notifications.pendingClaims
    return false
  }

  const profileCount = identities.length

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 flex-col border-r border-[#E3E1DC] bg-[#FBFBFA] lg:flex">
        <div className="flex h-full flex-col">
          <div className="border-b border-[#E8E6E0] px-5 py-5">
            <Link href="/dashboard" className="flex min-h-11 items-center gap-3">
              <Image src="/logo.png" alt="TourAligner" width={142} height={37} priority />
              {showStagingBadge && <EnvironmentBadge />}
            </Link>
            <div className="mt-5">
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
            </div>
          </div>

          <nav className="flex-1 space-y-1 px-3 py-4">
            {NAV_LINKS.map(({ href, label, icon: Icon }) => {
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

          <div className="border-t border-[#E8E6E0] px-3 py-4">
            {hasVenues && (
              <Link
                href="/dashboard/events/new"
                className="mb-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#FD6A2F] px-3 text-sm font-semibold text-white transition-colors hover:bg-[#E55A22]"
              >
                <Plus className="h-4 w-4" />
                Event
              </Link>
            )}
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#E8E6E0] bg-white px-3 py-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#9B9B9B]">
                  Account
                </p>
                {profileCount > 1 && (
                  <p className="mt-0.5 truncate text-sm font-medium text-[#252525]">
                    {profileCount} profiles
                  </p>
                )}
              </div>
              <NavAccountMenu
                isAdmin={isAdmin}
                notifications={{ adminClaims: notifications?.adminClaims ?? false }}
                placement="top"
              />
            </div>
            {isAdmin && (
              <Link
                href="/admin"
                className="mt-2 flex min-h-10 items-center justify-between rounded-xl px-3 text-sm font-semibold text-[#666666] transition-colors hover:bg-white hover:text-[#252525]"
              >
                <span className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Admin
                </span>
                {notifications?.adminClaims && <Dot />}
              </Link>
            )}
          </div>
        </div>
      </aside>

      <header className="sticky top-0 z-30 border-b border-[#E3E1DC] bg-[#FBFBFA]/95 px-4 py-3 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <Link href="/dashboard" className="flex min-h-10 items-center gap-2">
            <Image src="/logo.png" alt="TourAligner" width={126} height={33} priority />
            {showStagingBadge && <EnvironmentBadge />}
          </Link>
          <div className="flex items-center gap-2">
            {activeIdentity && (
              <IdentitySwitcher
                activeIdentity={activeIdentity}
                identities={identities}
                allowAll={allowAllIdentities}
              />
            )}
            <NavAccountMenu
              isAdmin={isAdmin}
              notifications={{ adminClaims: notifications?.adminClaims ?? false }}
            />
          </div>
        </div>
      </header>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-[#E3E1DC] bg-white/96 px-1 pb-[env(safe-area-inset-bottom)] shadow-[0_-12px_30px_rgba(0,0,0,0.08)] backdrop-blur lg:hidden">
        {NAV_LINKS.map(({ href, shortLabel, icon: Icon }) => {
          const active = isActive(href)
          const hasDot = dotForLink(href)
          return (
            <Link
              key={href}
              href={href}
              className={cx(
                'relative flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-semibold transition-colors',
                active ? 'text-[#FD6A2F]' : 'text-[#777777]'
              )}
            >
              <span className="relative">
                <Icon className="h-5 w-5" />
                {hasDot && <Dot className="absolute -right-1 -top-1 h-2 w-2" />}
              </span>
              <span className="max-w-full truncate">{shortLabel}</span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}
