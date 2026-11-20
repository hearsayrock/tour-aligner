'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { usePathname } from 'next/navigation'
import {
  CalendarDays,
  CalendarRange,
  LayoutDashboard,
  Layers3,
  Menu,
  X,
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
import { cx } from '@/components/ui/primitives'
import type { ActiveIdentity, ManagedIdentity } from '@/lib/managed-identity'
import { createClient } from '@/lib/supabase/client'
import { loadBackstageAttention } from '@/lib/backstage-attention'

interface Notifications {
  backstage: boolean
  pendingClaims: boolean
  adminClaims: boolean
}

const NAV_GROUPS = [
  {
    title: 'Workspace',
    links: [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { label: 'Your Studios', href: '/dashboard/profiles', icon: Layers3 },
      { label: 'Backstages', href: '/dashboard/backstage', icon: CalendarRange },
      { label: 'Calendar', href: '/dashboard/calendar', icon: CalendarDays },
    ],
  },
  {
    title: 'Discover',
    links: [
      { label: 'Available Events', href: '/events', icon: Search },
      { label: 'Artists', href: '/dashboard/bands', icon: Mic2 },
      { label: 'Venues', href: '/dashboard/venues', icon: MapPin },
    ],
  },
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
  identity: ManagedIdentity | null
}

const EMPTY_NOTIFICATIONS: Notifications = {
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
  return <span className={cx('h-2 w-2 rounded-full bg-brand ring-2 ring-white', className)} />
}

export function DashboardNav({
  showStagingBadge = false,
  isAdmin = false,
  phaseOne = false,
  notifications,
  notificationScope,
  activeIdentity,
  identities = [],
}: {
  showStagingBadge?: boolean
  isAdmin?: boolean
  phaseOne?: boolean
  notifications?: Notifications
  notificationScope?: NotificationScope
  activeIdentity?: ActiveIdentity
  identities?: ManagedIdentity[]
}) {
  const pathname = usePathname()
  const sidebarCollapsed = useSyncExternalStore(subscribeToSidebarState, getSidebarState, getServerSidebarState)
  const notificationKey = notificationScope
    ? `${notificationScope.userId}:${notificationScope.identity?.kind ?? 'none'}:${notificationScope.identity?.id ?? ''}:${isAdmin}`
    : ''
  const [notificationState, setNotificationState] = useState({
    key: notificationKey,
    value: notifications ?? EMPTY_NOTIFICATIONS,
  })
  // Never display the previous profile's dot while the next profile is loading.
  const resolvedNotifications = notificationState.key === notificationKey
    ? notificationState.value
    : EMPTY_NOTIFICATIONS
  const isPhaseOneArtist = phaseOne && !isAdmin
  const drawer = useRef<HTMLDialogElement>(null)
  const homeHref = isPhaseOneArtist ? '/dashboard/profiles' : '/dashboard'
  const groups = NAV_GROUPS.map(({ title, links }) => ({
    title,
    items: links.filter(({ href }) => !isPhaseOneArtist || (
      identities.length > 0 && href !== '/dashboard' && href !== '/dashboard/venues'
    )),
  })).filter(({ items }) => items.length > 0)
  const allowAllIdentities = !isPhaseOneArtist && pathname === '/dashboard'
  const canCreateEvent = activeIdentity?.kind === 'venue' || (
    activeIdentity?.kind === 'all' && identities.some((identity) => identity.kind === 'venue')
  )

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
    let requestId = 0
    const scope = notificationScope

    async function loadNotifications(): Promise<Notifications> {
      const startedAt = performance.now()
      const supabase = createClient()
      const { userId, identity } = scope
      const [
        { count: pendingClaimsCount },
        backstageAttention,
        { count: adminClaimsCount },
      ] = await Promise.all([
        supabase.from('venue_claims').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'pending'),
        loadBackstageAttention(supabase, identity),
        isAdmin
          ? supabase.from('venue_claims').select('id', { count: 'exact', head: true }).eq('status', 'pending')
          : Promise.resolve({ count: 0 }),
      ])

      const resolved = {
        backstage: backstageAttention.length > 0,
        pendingClaims: (pendingClaimsCount ?? 0) > 0,
        adminClaims: (adminClaimsCount ?? 0) > 0,
      }

      if (process.env.NODE_ENV === 'development') {
        console.info(`[perf] navigation notifications=${(performance.now() - startedAt).toFixed(0)}ms`)
      }

      return resolved
    }

    function refreshNotifications() {
      if (document.visibilityState !== 'visible') return
      const currentRequest = ++requestId
      void loadNotifications()
        .then((next) => {
          if (!cancelled && currentRequest === requestId) {
            setNotificationState({ key: notificationKey, value: next })
          }
        })
        .catch((error: unknown) => console.error('Failed to load navigation notifications', error))
    }
    let timer: ReturnType<typeof setTimeout> | undefined
    const supabase = createClient()
    const channel = supabase.channel(`navigation-notifications-${scope.userId}`)
    for (const table of ['events', 'event_artist_memberships', 'venue_claims']) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, () => {
        window.clearTimeout(timer)
        timer = setTimeout(refreshNotifications, 250)
      })
    }
    channel.subscribe()
    refreshNotifications()
    const poll = window.setInterval(refreshNotifications, 30000)
    window.addEventListener('focus', refreshNotifications)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
      window.clearInterval(poll)
      window.removeEventListener('focus', refreshNotifications)
      void supabase.removeChannel(channel)
    }
  }, [isAdmin, notificationScope, notificationKey])

  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 1024px)')
    const closeOnDesktop = () => { if (desktop.matches) drawer.current?.close() }
    desktop.addEventListener('change', closeOnDesktop)
    return () => desktop.removeEventListener('change', closeOnDesktop)
  }, [])

  useEffect(() => {
    drawer.current?.close()
  }, [pathname])

  function toggleSidebar() {
    window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(!sidebarCollapsed))
    window.dispatchEvent(new Event(SIDEBAR_STATE_EVENT))
  }

  function isActive(href: string) {
    return href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href)
  }

  function dotForLink(href: string) {
    if (href === '/dashboard/backstage') return resolvedNotifications.backstage
    if (href === '/dashboard/venues') return resolvedNotifications.pendingClaims
    return false
  }

  function navigation(compact: boolean) {
    return (
      <nav aria-label="Main navigation" className="workspace-rail-links">
        {groups.map(({ title, items }) => (
          <div key={title} className="workspace-nav-group">
            <p className={compact ? 'sr-only' : 'workspace-label'}>{title}</p>
            {items.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} aria-current={isActive(href) ? 'page' : undefined}
                title={compact ? label : undefined} className="workspace-nav-link" onClick={() => drawer.current?.close()}>
                <Icon size={19} strokeWidth={1.7} aria-hidden="true" />
                <span className={compact ? 'sr-only' : undefined}>{label}</span>
                {dotForLink(href) && <><Dot className="workspace-notification" /><span className="sr-only">Needs attention</span></>}
              </Link>
            ))}
          </div>
        ))}
      </nav>
    )
  }

  function profileControl() {
    if (!activeIdentity || !identities.length) return null
    if (identities.length > 1) return <IdentitySwitcher activeIdentity={activeIdentity} identities={identities} allowAll={allowAllIdentities} className="workspace-switcher" />
    const identity = identities[0]
    const Icon = identity.kind === 'venue' ? MapPin : Mic2
    return <Link href={identity.href} className="workspace-identity" onClick={() => drawer.current?.close()}>
      <Icon size={18} aria-hidden="true" /><span className="truncate">{identity.name}</span>
    </Link>
  }

  function createEvent(compact: boolean) {
    if (!canCreateEvent) return null
    return <Link data-nav-create-event href="/dashboard/events/new" className="workspace-create"
      title={compact ? 'Create Event' : undefined} onClick={() => drawer.current?.close()}>
      <Plus size={17} aria-hidden="true" /><span className={compact ? 'sr-only' : undefined}>Create Event</span>
    </Link>
  }

  const accountProps = { isAdmin, notifications: { adminClaims: resolvedNotifications.adminClaims }, showManageProfiles: !isPhaseOneArtist || identities.length > 0 }
  return (
    <>
      <aside data-theme="cocoa" data-collapsed={sidebarCollapsed} className="desktop-app-sidebar workspace-rail">
        <div className="workspace-rail-head">
          <Link href={homeHref} aria-label="TourAligner home" className="workspace-logo">
            <Image src={sidebarCollapsed ? '/touraligner/brand/touraligner-mark-color.svg' : '/touraligner/brand/touraligner-logo-light.svg'} alt="" width={sidebarCollapsed ? 29 : 148} height={39} priority />
          </Link>
          <button type="button" onClick={toggleSidebar} className="workspace-icon-button" aria-expanded={!sidebarCollapsed}
            aria-label={sidebarCollapsed ? 'Expand navigation' : 'Collapse navigation'} title={sidebarCollapsed ? 'Expand navigation' : 'Collapse navigation'}>
            {sidebarCollapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
          </button>
        </div>
        {!sidebarCollapsed && activeIdentity && identities.length > 0 && <div className="workspace-profile">{profileControl()}</div>}
        {navigation(sidebarCollapsed)}
        <div className="workspace-rail-foot">
          {createEvent(sidebarCollapsed)}
          <NavAccountMenu {...accountProps} placement="top" align="left" label={sidebarCollapsed ? undefined : 'Account'} />
          {showStagingBadge && !sidebarCollapsed && <EnvironmentBadge />}
        </div>
      </aside>

      <header data-theme="cocoa" className="workspace-mobile-bar">
        <button type="button" aria-label="Open navigation" aria-haspopup="dialog" className="workspace-icon-button" onClick={() => drawer.current?.showModal()}><Menu size={22} /></button>
        <Link href={homeHref} aria-label="TourAligner home"><Image src="/touraligner/brand/touraligner-logo-light.svg" alt="" width={126} height={35} priority /></Link>
        {showStagingBadge && <EnvironmentBadge />}
        <div className="ml-auto"><NavAccountMenu {...accountProps} /></div>
      </header>
      <dialog ref={drawer} data-theme="cocoa" className="workspace-drawer" aria-label="Workspace navigation"
        onClick={(event) => { if (event.target === event.currentTarget) drawer.current?.close() }}>
        <div className="workspace-drawer-inner">
          <div className="workspace-rail-head">
            <Link href={homeHref} aria-label="TourAligner home" onClick={() => drawer.current?.close()}><Image src="/touraligner/brand/touraligner-logo-light.svg" alt="" width={142} height={38} /></Link>
            <button type="button" aria-label="Close navigation" className="workspace-icon-button" onClick={() => drawer.current?.close()}><X size={21} /></button>
          </div>
          {activeIdentity && identities.length > 0 && <div className="workspace-profile">{profileControl()}</div>}
          {navigation(false)}
          {canCreateEvent && <div className="workspace-rail-foot">{createEvent(false)}</div>}
        </div>
      </dialog>
    </>
  )
}
