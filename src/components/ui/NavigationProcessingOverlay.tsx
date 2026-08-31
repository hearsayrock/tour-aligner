'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ProcessingOverlay } from '@/components/ui/ProcessingOverlay'

export function NavigationProcessingOverlay() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const routeKey = `${pathname}${searchParams.size > 0 ? `?${searchParams.toString()}` : ''}`
  const [pendingRoute, setPendingRoute] = useState<string | null>(null)

  useEffect(() => {
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
      setPendingRoute(destinationKey)
      window.setTimeout(() => {
        setPendingRoute((current) => current === destinationKey ? null : current)
      }, 15_000)
    }

    document.addEventListener('click', handleDocumentClick, true)
    return () => document.removeEventListener('click', handleDocumentClick, true)
  }, [])

  if (!pendingRoute || pendingRoute === routeKey) return null
  return <ProcessingOverlay />
}
