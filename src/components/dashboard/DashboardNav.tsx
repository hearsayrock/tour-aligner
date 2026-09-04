'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
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
import { createClient } from '@/lib/supabase/client'

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

interface NotificationScope {
  userId: string
  bandIds: string[]
  venueIds: string[]
}

const EMPTY_NOTIFICATIONS: Notifications = {
  inbox: false,
  backstage: false,
  pendingClaims: false,
  adminClaims: false,
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
  notificationScope,
  hasVenues = false,
  activeIdentity,
  identities = [],
}: {
  showStagingBadge?: boolean
  isAdmin?: boolean
  phaseOne?: boolean
  notifications?: Notifications
  notificationScope?: NotificationScope
  hasVenues?: boolean
  activeIdentity?: ActiveIdentity
  identities?: ManagedIdentity[]
}) {
  const pathname = usePathname()
  const sidebarCollapsed = useSyncExternalStore(subscribeToSidebarState, getSidebarState, getServerSidebarState)
  const [resolvedNotifications, setResolvedNotifications] = useState(notifications ?? EMPTY_NOTIFICATIONS)
  const notificationLoadRef = useRef<{ key: string; promise: Promise<Notifications> } | null>(null)
  const isPhaseOneArtist = phaseOne && !isAdmin
  const links = NAV_LINKS
  const allowAllIdentities = !isPhaseOneArtist && pathname === '/dashboard'

  useEffect(() => {
    const navigationStartedAt = window.sessionStorage.getItem('ta_login_navigation_started_at')
    if (!navigationStartedAt) return

    window.sessionStorage.removeItem('ta_login_navigation_started_at')
    if (process.env.NODE_ENV === 'development') {
      console.info(`[perf] login navigation shell=${(performance.now() - Number(navigationStartedAt)).toFixed(0)}ms`)
    }
  }, [])

  useEffect(() => {
    if (!notificationScope) return

    let cancelled = false
    const scope = notificationScope
    const scopeKey = `${isAdmin}:${scope.userId}:${scope.bandIds.join(',')}:${scope.venueIds.join(',')}`

    async function loadNotifications(): Promise<Notifications> {
      const startedAt = performance.now()
      const supabase = createClient()
      const { userId, bandIds, venueIds } = scope
      const privateThreadFilters = [
        ...(bandIds.length
          ? [
              `and(participant_one_kind.eq.band,participant_one_id.in.(${bandIds.join(',')}))`,
              `and(participant_two_kind.eq.band,participant_two_id.in.(${bandIds.join(',')}))`,
            ]
          : []),
        ...(venueIds.length
          ? [
              `and(participant_one_kind.eq.venue,participant_one_id.in.(${venueIds.join(',')}))`,
              `and(participant_two_kind.eq.venue,participant_two_id.in.(${venueIds.join(',')}))`,
            ]
          : []),
      ]

      const [
        { count: pendingClaimsCount },
        { count: invitedMembershipCount },
        { data: venueEventIds },
        { data: bandBookingThreads },
        { data: venueBookingThreads },
        { data: privateThreads },
        { count: adminClaimsCount },
      ] = await Promise.all([
        supabase.from('venue_claims').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'pending'),
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
        bandIds.length
          ? supabase
              .from('contact_threads')
              .select('status, requested_by_side, last_message_at, band_last_read_at')
              .in('band_id', bandIds)
          : Promise.resolve({ data: [] }),
        venueIds.length
          ? supabase
              .from('contact_threads')
              .select('status, requested_by_side, last_message_at, venue_last_read_at')
              .in('venue_id', venueIds)
          : Promise.resolve({ data: [] }),
        privateThreadFilters.length
          ? supabase
              .from('private_chat_threads')
              .select(`
                participant_one_kind,
                participant_one_id,
                participant_two_kind,
                participant_two_id,
                status,
                requested_by_kind,
                requested_by_id,
                last_message_at,
                participant_one_last_read_at,
                participant_two_last_read_at
              `)
              .or(privateThreadFilters.join(','))
          : Promise.resolve({ data: [] }),
        isAdmin
          ? supabase.from('venue_claims').select('id', { count: 'exact', head: true }).eq('status', 'pending')
          : Promise.resolve({ count: 0 }),
      ])

      const eventIds = (venueEventIds ?? []).map((event) => event.id)
      const { count: venueApplicationCount } = eventIds.length
        ? await supabase
            .from('event_artist_memberships')
            .select('id', { count: 'exact', head: true })
            .in('event_id', eventIds)
            .eq('status', 'applied')
        : { count: 0 }

      const hasBandBookingAttention = (bandBookingThreads ?? []).some((thread) =>
        (thread.status === 'pending' && thread.requested_by_side !== 'band') ||
        (!!thread.last_message_at && (!thread.band_last_read_at || new Date(thread.last_message_at).getTime() > new Date(thread.band_last_read_at).getTime()))
      )
      const hasVenueBookingAttention = (venueBookingThreads ?? []).some((thread) =>
        (thread.status === 'pending' && thread.requested_by_side !== 'venue') ||
        (!!thread.last_message_at && (!thread.venue_last_read_at || new Date(thread.last_message_at).getTime() > new Date(thread.venue_last_read_at).getTime()))
      )
      const hasPrivateInboxAttention = (privateThreads ?? []).some((thread) => {
        const participantOneNeedsAttention =
          ((thread.participant_one_kind === 'band' && bandIds.includes(thread.participant_one_id)) ||
            (thread.participant_one_kind === 'venue' && venueIds.includes(thread.participant_one_id))) &&
          ((thread.status === 'pending' &&
            !(thread.requested_by_kind === thread.participant_one_kind && thread.requested_by_id === thread.participant_one_id)) ||
            (!!thread.last_message_at &&
              (!thread.participant_one_last_read_at ||
                new Date(thread.last_message_at).getTime() > new Date(thread.participant_one_last_read_at).getTime())))
        const participantTwoNeedsAttention =
          ((thread.participant_two_kind === 'band' && bandIds.includes(thread.participant_two_id)) ||
            (thread.participant_two_kind === 'venue' && venueIds.includes(thread.participant_two_id))) &&
          ((thread.status === 'pending' &&
            !(thread.requested_by_kind === thread.participant_two_kind && thread.requested_by_id === thread.participant_two_id)) ||
            (!!thread.last_message_at &&
              (!thread.participant_two_last_read_at ||
                new Date(thread.last_message_at).getTime() > new Date(thread.participant_two_last_read_at).getTime())))

        return participantOneNeedsAttention || participantTwoNeedsAttention
      })

      const resolved = {
        inbox: hasBandBookingAttention || hasVenueBookingAttention || hasPrivateInboxAttention,
        backstage: (invitedMembershipCount ?? 0) > 0 || (venueApplicationCount ?? 0) > 0,
        pendingClaims: (pendingClaimsCount ?? 0) > 0,
        adminClaims: (adminClaimsCount ?? 0) > 0,
      }

      if (process.env.NODE_ENV === 'development') {
        console.info(`[perf] navigation notifications=${(performance.now() - startedAt).toFixed(0)}ms`)
      }

      return resolved
    }

    if (notificationLoadRef.current?.key !== scopeKey) {
      notificationLoadRef.current = { key: scopeKey, promise: loadNotifications() }
    }

    void notificationLoadRef.current.promise.then((nextNotifications) => {
      if (!cancelled) setResolvedNotifications(nextNotifications)
    })

    return () => {
      cancelled = true
    }
  }, [isAdmin, notificationScope])

  function toggleSidebar() {
    window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(!sidebarCollapsed))
    window.dispatchEvent(new Event(SIDEBAR_STATE_EVENT))
  }

  function isActive(href: string) {
    return href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href)
  }

  function dotForLink(href: string) {
    if (href === '/dashboard/inbox') return resolvedNotifications.inbox
    if (href === '/dashboard/backstage') return resolvedNotifications.backstage
    if (href === '/dashboard/venues') return resolvedNotifications.pendingClaims
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
            notifications={{ adminClaims: resolvedNotifications.adminClaims }}
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
                notifications={{ adminClaims: resolvedNotifications.adminClaims }}
                showManageProfiles={identities.length > 0}
              />
            ) : (
              <div className="lg:hidden">
                <NavAccountMenu
                  isAdmin={isAdmin}
                  notifications={{ adminClaims: resolvedNotifications.adminClaims }}
                />
              </div>
            )}
          </div>
        </div>
      </header>

    </>
  )
}
