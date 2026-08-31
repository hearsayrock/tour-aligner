'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useSyncExternalStore } from 'react'
import { usePathname } from 'next/navigation'
import {
  CalendarDays,
  CalendarRange,
  Inbox,
  LayoutDashboard,
  MapPin,
  Mic2,
  PanelLeftClose,
  PanelLeftOpen,
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

const SIDEBAR_COLLAPSED_KEY = 'touraligner-sidebar-collapsed'
const SIDEBAR_STATE_EVENT = 'touraligner-sidebar-state'

function subscribeToSidebarState(callback: () => void) {
  window.addEventListener('storage', callback)
  window.addEventListener(SIDEBAR_STATE_EVENT, callback)
  return () => {
    window.removeEventListener('storage', callback)
    window.removeEventListener(SIDEBAR_STATE_EVENT, callback)
  }
}

function getSidebarState() {
  return window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true'
}

function getServerSidebarState() {
  return false
}

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
  const sidebarCollapsed = useSyncExternalStore(subscribeToSidebarState, getSidebarState, getServerSidebarState)
  const isPhaseOneArtist = phaseOne && !isAdmin
  const links = NAV_LINKS
  const allowAllIdentities = !isPhaseOneArtist && pathname === '/dashboard'

  function toggleSidebar() {
    window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(!sidebarCollapsed))
    window.dispatchEvent(new Event(SIDEBAR_STATE_EVENT))
  }

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
      <aside data-collapsed={sidebarCollapsed} className={cx('desktop-app-sidebar fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-[#E3E1DC] bg-[#FBFBFA] transition-[width] duration-200 lg:flex', sidebarCollapsed ? 'w-20' : 'w-60')}>
        <div className="flex h-full flex-col">
          <div className={cx('border-b border-[#E8E6E0] py-4', sidebarCollapsed ? 'px-3' : 'px-5')}>
            <div className={cx('flex items-center gap-2', sidebarCollapsed ? 'flex-col' : 'justify-between')}>
              <Link href="/dashboard" aria-label="TourAligner dashboard" className={cx('flex min-h-10 items-center', sidebarCollapsed && 'h-10 w-10 justify-center rounded-xl bg-[#FFF3EE] text-[#FD6A2F]')}>
                {sidebarCollapsed ? <Mic2 className="h-5 w-5" /> : <Image src="/logo.png" alt="TourAligner" width={132} height={35} priority />}
              </Link>
              <button type="button" onClick={toggleSidebar} aria-label={sidebarCollapsed ? 'Expand navigation' : 'Collapse navigation'} aria-expanded={!sidebarCollapsed} title={sidebarCollapsed ? 'Expand navigation' : 'Collapse navigation'} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[#888888] transition-colors hover:bg-white hover:text-[#252525]">
                {sidebarCollapsed ? <PanelLeftOpen className="h-4.5 w-4.5" /> : <PanelLeftClose className="h-4.5 w-4.5" />}
              </button>
            </div>
            {!sidebarCollapsed && showStagingBadge && <div className="mt-2"><EnvironmentBadge /></div>}
            {!sidebarCollapsed && <div className="mt-4">
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

          <nav className="flex-1 space-y-1 px-3 py-4">
            {links.map(({ href, label, icon: Icon }) => {
              const active = isActive(href)
              const hasDot = dotForLink(href)
              return (
                <Link
                  key={href}
                  href={href}
                  title={sidebarCollapsed ? label : undefined}
                  className={cx(
                    'group relative flex min-h-11 items-center rounded-xl text-sm font-semibold transition-colors',
                    sidebarCollapsed ? 'justify-center px-0' : 'justify-between px-3',
                    active
                      ? 'bg-[#252525] text-white shadow-sm'
                      : 'text-[#5F5F5F] hover:bg-white hover:text-[#252525]'
                  )}
                >
                  <span className="flex items-center gap-3">
                    <Icon className={cx('h-4.5 w-4.5', active ? 'text-white' : 'text-[#8B8B8B] group-hover:text-[#FD6A2F]')} />
                    <span className={sidebarCollapsed ? 'sr-only' : undefined}>{label}</span>
                  </span>
                  {hasDot && <Dot className={cx(active ? 'ring-[#252525]' : '', sidebarCollapsed && 'absolute right-2 top-2')} />}
                </Link>
              )
            })}
          </nav>

          <div className="border-t border-[#E8E6E0] px-3 py-4">
            {hasVenues && (
              <Link
                href="/dashboard/events/new"
                title={sidebarCollapsed ? 'Create event' : undefined}
                aria-label={sidebarCollapsed ? 'Create event' : undefined}
                className={cx('mb-3 inline-flex min-h-10 w-full items-center justify-center rounded-xl bg-[#FD6A2F] text-sm font-semibold text-white transition-colors hover:bg-[#E55A22]', sidebarCollapsed ? 'px-0' : 'gap-2 px-3')}
              >
                <Plus className="h-4 w-4" />
                {!sidebarCollapsed && 'Event'}
              </Link>
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
