'use client'

import { useMemo, useState } from 'react'
import { CalendarActivityList } from '@/components/calendar/CalendarActivityList'
import { Badge } from '@/components/ui/primitives'
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
    <section className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-[#E6E6E6] bg-white p-5 shadow-[0_12px_28px_rgba(20,20,20,0.035)]">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#A24A22]">Backstages</p>
          <p className="mt-3 text-3xl font-bold tracking-tight text-[#202020]">{activityCounts.backstages}</p>
          <p className="mt-1 text-sm text-[#777777]">Applied, invited, accepted, and removal-requested rooms in this six-month view.</p>
        </div>
        <div className="rounded-2xl border border-[#E6E6E6] bg-white p-5 shadow-[0_12px_28px_rgba(20,20,20,0.035)]">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#A24A22]">Shows</p>
          <p className="mt-3 text-3xl font-bold tracking-tight text-[#202020]">{activityCounts.shows}</p>
          <p className="mt-1 text-sm text-[#777777]">Upcoming show dates saved on the artist profile during the same window.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_320px]">
        <VenueAvailabilityCalendar
          todayIso={todayIso}
          bookingDates={[]}
          bookings={[]}
          defaultBillCap={null}
          title="Artist Calendar"
          intro="Track Backstage activity and your profile's saved shows in one month grid."
          selectedDate={selectedDate}
          onDateSelect={setSelectedDate}
          markersByDate={markersByDate}
          headerActions={
            <>
              <Badge tone="info">Applied</Badge>
              <Badge tone="warning">Invited</Badge>
              <Badge tone="success">Accepted</Badge>
            </>
          }
          monthCount={6}
        />

        <div className="sticky top-6 h-fit rounded-2xl border border-[#E8E8E8] bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#888888]">Selected Date</p>
          <h3 className="mt-2 text-lg font-semibold text-[#252525]">{formatSelectedDate(selectedDate)}</h3>
          <p className="mt-2 text-sm text-[#777777]">
            Open a Backstage or review a saved show from the items scheduled on this day.
          </p>

          <div className="mt-5">
            <p className="mb-2 text-sm font-medium text-[#252525]">Calendar activity</p>
            <CalendarActivityList
              items={selectedActivities}
              emptyMessage="No shows or Backstage activity are attached to this date yet."
            />
          </div>
        </div>
      </div>
    </section>
  )
}
