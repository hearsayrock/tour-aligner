'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { RouteLoadingIndicator } from '@/components/ui/RouteLoadingIndicator'

const INDICATOR_DELAY_MS = 200
const INDICATOR_TIMEOUT_MS = 15_000

function NavigationIndicatorForRoute({ routeKey }: { routeKey: string }) {
  const showTimerRef = useRef<number | null>(null)
  const clearTimerRef = useRef<number | null>(null)
  const [pendingRoute, setPendingRoute] = useState<string | null>(null)

  useEffect(() => {
    function clearTimers() {
      if (showTimerRef.current !== null) window.clearTimeout(showTimerRef.current)
      if (clearTimerRef.current !== null) window.clearTimeout(clearTimerRef.current)
      showTimerRef.current = null
      clearTimerRef.current = null
    }

    function handleDocumentClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      const target = event.target
      if (!(target instanceof Element)) return
      const link = target.closest<HTMLAnchorElement>('a[href]')
      if (!link || link.target || link.hasAttribute('download')) return

      const href = link.getAttribute('href')
      if (!href || href.startsWith('#')) return

      const destination = new URL(href, window.location.href)
      if (destination.origin !== window.location.origin || destination.href === window.location.href) return
      const destinationKey = `${destination.pathname}${destination.search}`
      if (destinationKey === routeKey) return

      clearTimers()
      showTimerRef.current = window.setTimeout(() => {
        // Fast navigations should complete without flashing a global loader.
        // A route-key change remounts this component, so redirects dismiss it too.
        setPendingRoute(destinationKey)
        clearTimerRef.current = window.setTimeout(() => {
          setPendingRoute((current) => current === destinationKey ? null : current)
        }, INDICATOR_TIMEOUT_MS)
      }, INDICATOR_DELAY_MS)
    }

    document.addEventListener('click', handleDocumentClick, true)
    return () => {
      document.removeEventListener('click', handleDocumentClick, true)
      clearTimers()
    }
  }, [routeKey])

  return pendingRoute ? <RouteLoadingIndicator /> : null
}

export function NavigationProcessingOverlay() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const routeKey = `${pathname}${searchParams.size > 0 ? `?${searchParams.toString()}` : ''}`

  return <NavigationIndicatorForRoute key={routeKey} routeKey={routeKey} />
}
