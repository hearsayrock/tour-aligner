'use client'

import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { Badge } from '@/components/ui/primitives'
import type { CalendarActivity } from '@/lib/calendar-activity'

export function CalendarActivityList({
  items,
  emptyMessage,
}: {
  items: CalendarActivity[]
  emptyMessage: string
}) {
  if (items.length === 0) {
    return (
      <div className="py-4 text-sm leading-6 text-text-secondary">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const content = (
          <div className="group border-b border-border py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-ink">{item.title}</p>
                  {item.statusLabel && <Badge tone={item.tone}>{item.statusLabel}</Badge>}
                </div>
                {item.subtitle && <p className="mt-1 text-sm leading-6 text-text-secondary">{item.subtitle}</p>}
                {item.meta && (
                  <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-text-subtle">
                    {item.meta}
                  </p>
                )}
              </div>
              {item.href && (
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-text-subtle transition-colors group-hover:text-ink">
                  <ArrowUpRight className="h-4 w-4" />
                </span>
              )}
            </div>
          </div>
        )

        return item.href ? (
          <Link key={item.id} href={item.href} className="block">
            {content}
          </Link>
        ) : (
          <div key={item.id}>{content}</div>
        )
      })}
    </div>
  )
}
