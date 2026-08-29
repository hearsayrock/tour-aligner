'use client'

import { useMemo, useState } from 'react'
import { CalendarClock, Sparkles } from 'lucide-react'
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
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="rounded-[28px] border border-[#E8DED2] bg-[linear-gradient(180deg,#FFF8F2_0%,#FFFFFF_100%)] p-5 shadow-[0_18px_42px_rgba(17,17,17,0.05)]">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[#FFF0E6] text-[#C85A28]">
            <Sparkles className="h-5 w-5" />
          </div>
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-[#A24A22]">Backstages</p>
          <p className="mt-3 text-3xl font-bold tracking-tight text-[#202020]">{activityCounts.backstages}</p>
          <p className="mt-2 text-sm leading-6 text-[#777777]">
            Applied, invited, accepted, and removal-requested rooms in this six-month view.
          </p>
        </div>

        <div className="rounded-[28px] border border-[#D9EADF] bg-[linear-gradient(180deg,#F7FCFA_0%,#FFFFFF_100%)] p-5 shadow-[0_18px_42px_rgba(17,17,17,0.05)]">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[#EAF7F2] text-[#0C7C71]">
            <CalendarClock className="h-5 w-5" />
          </div>
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-[#0C7C71]">Shows</p>
          <p className="mt-3 text-3xl font-bold tracking-tight text-[#202020]">{activityCounts.shows}</p>
          <p className="mt-2 text-sm leading-6 text-[#777777]">
            Upcoming show dates saved on the artist profile during the same window.
          </p>
        </div>

        <div className="rounded-[28px] border border-[#E8DED2] bg-[radial-gradient(circle_at_top_left,#FFF2E7_0%,#FFFFFF_52%,#F7F8FA_100%)] p-5 shadow-[0_18px_42px_rgba(17,17,17,0.05)]">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8B7B6A]">How to read it</p>
          <h3 className="mt-3 text-xl font-semibold tracking-tight text-[#202020]">One place for saved shows and active rooms</h3>
          <p className="mt-2 text-sm leading-6 text-[#6F6F6F]">
            Pick a day to see every show date and Backstage thread connected to it, with status markers carried directly into the month grid.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_340px]">
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

        <div className="sticky top-6 h-fit rounded-[30px] border border-[#E8DED2] bg-[linear-gradient(180deg,#FFFDFB_0%,#F8F7F4_100%)] p-5 shadow-[0_18px_42px_rgba(17,17,17,0.06)]">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/85 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8C7D6F]">
            Selected date
          </div>
          <h3 className="mt-4 text-xl font-semibold tracking-tight text-[#252525]">{formatSelectedDate(selectedDate)}</h3>
          <p className="mt-2 text-sm leading-6 text-[#777777]">
            Open a Backstage or review a saved show from the items scheduled on this day.
          </p>

          <div className="mt-6 rounded-[24px] border border-[#EAE1D7] bg-white/80 p-4">
            <p className="mb-3 text-sm font-semibold text-[#252525]">Calendar activity</p>
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
