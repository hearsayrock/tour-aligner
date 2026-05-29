'use client'

import Link from 'next/link'
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
    return <p className="text-sm leading-6 text-[#777777]">{emptyMessage}</p>
  }

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const content = (
          <div className="rounded-xl border border-[#E8E8E8] bg-[#FCFCFC] px-4 py-3 transition-colors hover:border-[#D5D5D5]">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold text-[#252525]">{item.title}</p>
              {item.statusLabel && <Badge tone={item.tone}>{item.statusLabel}</Badge>}
            </div>
            {item.subtitle && <p className="mt-1 text-sm text-[#666666]">{item.subtitle}</p>}
            {item.meta && <p className="mt-1 text-xs font-medium uppercase tracking-[0.16em] text-[#8A8A8A]">{item.meta}</p>}
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
