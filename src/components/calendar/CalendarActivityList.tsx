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
      <div className="rounded-[24px] border border-dashed border-[#E0D8CD] bg-[linear-gradient(180deg,#FFFDFB_0%,#FAF7F2_100%)] px-4 py-6 text-sm leading-6 text-[#7B736B]">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const content = (
          <div className="group rounded-[24px] border border-[#E8E0D7] bg-[linear-gradient(180deg,#FFFFFF_0%,#FCFAF7_100%)] px-4 py-3.5 shadow-[0_14px_32px_rgba(17,17,17,0.05)] transition-all hover:-translate-y-0.5 hover:border-[#D8CCBD] hover:shadow-[0_18px_38px_rgba(17,17,17,0.09)]">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-[#252525]">{item.title}</p>
                  {item.statusLabel && <Badge tone={item.tone}>{item.statusLabel}</Badge>}
                </div>
                {item.subtitle && <p className="mt-1 text-sm leading-6 text-[#666666]">{item.subtitle}</p>}
                {item.meta && (
                  <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8A7D70]">
                    {item.meta}
                  </p>
                )}
              </div>
              {item.href && (
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#E8E0D7] bg-white text-[#8A7D70] transition-colors group-hover:text-[#252525]">
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
