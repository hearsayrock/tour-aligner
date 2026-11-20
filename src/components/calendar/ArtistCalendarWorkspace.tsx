'use client'

import { useMemo, useState } from 'react'
import { CalendarActivityList } from '@/components/calendar/CalendarActivityList'
import { VenueAvailabilityCalendar } from '@/components/venues/VenueAvailabilityCalendar'
import type { CalendarActivity, CalendarDayMarker } from '@/lib/calendar-activity'

function formatSelectedDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export function ArtistCalendarWorkspace({
  todayIso,
  activitiesByDate,
  markersByDate,
}: {
  todayIso: string
  activitiesByDate: Record<string, CalendarActivity[]>
  markersByDate: Record<string, CalendarDayMarker[]>
}) {
  const [selectedDate, setSelectedDate] = useState(todayIso)
  const selectedActivities = activitiesByDate[selectedDate] ?? []
  const activityCounts = useMemo(
    () => ({
      backstages: Object.values(activitiesByDate).flat().filter((item) => item.kind === 'event').length,
      shows: Object.values(activitiesByDate).flat().filter((item) => item.kind === 'show').length,
    }),
    [activitiesByDate]
  )

  return (
    <section className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_19rem]">
      <VenueAvailabilityCalendar
        todayIso={todayIso}
        bookingDates={[]}
        bookings={[]}
        defaultBillCap={null}
        title="Artist calendar"
        selectedDate={selectedDate}
        onDateSelect={setSelectedDate}
        markersByDate={markersByDate}
        headerActions={<dl className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-baseline gap-1.5"><dt>Backstages</dt><dd className="font-bold tabular-nums">{activityCounts.backstages}</dd></div>
          <div className="flex items-baseline gap-1.5"><dt>Shows</dt><dd className="font-bold tabular-nums">{activityCounts.shows}</dd></div>
        </dl>}
        monthCount={6}
      />
      <aside data-theme="cream" aria-live="polite" aria-atomic="true" className="h-fit rounded-ds-2xl border border-border bg-page p-5 text-ink xl:sticky xl:top-6">
        <p className="font-ds-mono text-xs tracking-widest uppercase text-text-secondary">Selected date</p>
        <h2 className="mt-3 border-b border-border-strong pb-4 font-ds-display text-3xl leading-none font-extrabold uppercase">{formatSelectedDate(selectedDate)}</h2>
        <CalendarActivityList items={selectedActivities} emptyMessage="No shows or Backstage activity on this date." />
      </aside>
    </section>
  )
}
