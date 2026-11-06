'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { cx } from '@/components/ui/primitives'

export function EventViewNav({ eventHref, backstageHref, backstageActive }: {
  eventHref: string
  backstageHref: string
  backstageActive: boolean
}) {
  const router = useRouter()

  useEffect(() => {
    function openLegacyBackstageLink() {
      const url = new URL(window.location.href)
      if (url.pathname !== eventHref || url.hash !== '#backstage') return
      url.searchParams.set('view', 'backstage')
      router.replace(url.pathname + url.search, { scroll: false })
    }

    openLegacyBackstageLink()
    window.addEventListener('hashchange', openLegacyBackstageLink)
    return () => window.removeEventListener('hashchange', openLegacyBackstageLink)
  }, [eventHref, router])

  const views = [
    { label: 'Event', href: eventHref, active: !backstageActive },
    { label: 'Backstage', href: backstageHref, active: backstageActive },
  ]

  return (
    <nav aria-label="Event views" className="inline-flex gap-1 rounded-xl border border-black/10 bg-white p-1 shadow-sm">
      {views.map(({ label, href, active }) => (
        <Link
          key={label}
          href={href}
          scroll={false}
          prefetch={false}
          aria-current={active ? 'page' : undefined}
          className={cx(
            'inline-flex min-h-10 items-center justify-center rounded-lg px-5 text-sm font-semibold',
            active ? 'bg-[#252525] text-white' : 'text-[#666666] hover:bg-[#F5F5F5] hover:text-[#252525]',
          )}
        >
          {label}
        </Link>
      ))}
    </nav>
  )
}
