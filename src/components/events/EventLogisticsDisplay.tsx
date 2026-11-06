import { LinkifiedText } from '@/components/contact/LinkifiedText'
import { EmptyState } from '@/components/ui/primitives'
import type { EventLogistics } from '@/types/database'

export function EventLogisticsDisplay({ logistics }: { logistics: EventLogistics | null }) {
  const rows = [
    ['Load-in', logistics?.load_in],
    ['Soundcheck', logistics?.soundcheck],
    ['Set times', logistics?.set_times],
    ['Backline / gear', logistics?.backline],
    ['Artists should bring', logistics?.artist_should_bring],
    ['Parking / access', logistics?.parking_access],
    ['General notes', logistics?.notes],
  ].filter(([, value]) => !!value)

  if (rows.length === 0) {
    return (
      <EmptyState
        title="No pinned logistics yet"
        description="Load-in, soundcheck, set times, parking, and backline notes will appear here once the venue adds them."
        className="border-dashed py-8"
      />
    )
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {rows.map(([label, value]) => (
        <div key={label} className="rounded-2xl border border-[#E8E8E8] bg-[#FCFCFC] px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#888888]">{label}</p>
          <LinkifiedText text={value ?? ''} className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#252525]" />
        </div>
      ))}
    </div>
  )
}
