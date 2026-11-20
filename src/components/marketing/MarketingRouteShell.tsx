'use client'

import { usePathname } from 'next/navigation'
import { cx } from '@/components/ui/primitives'

function usesAuthenticatedAppShell(pathname: string) {
  return (
    pathname === '/events' ||
    pathname === '/venues' ||
    pathname === '/bands'
  )
}

export function MarketingRouteShell({
  isSignedIn,
  marketingNav,
  appNav,
  footer,
  children,
}: {
  isSignedIn: boolean
  marketingNav: React.ReactNode
  appNav: React.ReactNode
  footer: React.ReactNode
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const useAppShell = isSignedIn && usesAuthenticatedAppShell(pathname)
  const isStandalonePage = pathname.startsWith('/bands/') || pathname.startsWith('/events/') || pathname.startsWith('/venues/')
  const showFooter = !isStandalonePage

  return (
    <div data-theme="cream" className={cx(useAppShell && 'app-shell-layout')}>
      {!isStandalonePage && (
        <div className={useAppShell ? 'hidden' : undefined}>{marketingNav}</div>
      )}
      <div className={useAppShell ? 'contents' : 'hidden'}>{appNav}</div>
      <main className={cx(useAppShell && 'app-shell-main min-h-screen pb-24 lg:pb-0')}>
        {children}
      </main>
      <div className={cx(!showFooter && 'hidden', useAppShell && 'app-shell-main')}>{footer}</div>
    </div>
  )
}
