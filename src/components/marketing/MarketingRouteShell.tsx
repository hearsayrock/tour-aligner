'use client'

import { usePathname } from 'next/navigation'
import { cx } from '@/components/ui/primitives'

function usesAuthenticatedAppShell(pathname: string) {
  return (
    pathname === '/events' ||
    pathname.startsWith('/events/') ||
    pathname === '/venues' ||
    pathname.startsWith('/venues/') ||
    pathname === '/bands' ||
    pathname.startsWith('/bands/')
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

  return (
    <>
      <div className={useAppShell ? 'hidden' : undefined}>{marketingNav}</div>
      <div className={useAppShell ? undefined : 'hidden'}>{appNav}</div>
      <main className={cx(useAppShell && 'min-h-screen pb-24 lg:pb-0')}>
        {children}
      </main>
      <div className={useAppShell ? 'hidden' : undefined}>{footer}</div>
    </>
  )
}
