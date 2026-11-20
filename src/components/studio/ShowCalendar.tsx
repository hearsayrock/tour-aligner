'use client'
import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { buildVenueCalendarMonths } from '@/lib/venue-calendar'
import type { Show } from '@/lib/studio/model'

export function ShowCalendar({
  today,
  dates,
  select,
}: {
  today: string
  dates: Show[]
  select?: (date: string) => void
}) {
  const months = useMemo(
    () => buildVenueCalendarMonths({ todayIso: today, bookingDates: [], bookings: [], monthCount: 12 }),
    [today]
  )
  const [index, setIndex] = useState(0)
  const month = months[index]
  const shows = new Map<string, string[]>()
  for (const show of dates) shows.set(show.date, [...(shows.get(show.date) ?? []), show.venue])
  return (
    <section className="show-calendar" aria-label="Show calendar">
      <header>
        <button disabled={!index} aria-label="Previous month" onClick={() => setIndex(index - 1)}>
          <ChevronLeft />
        </button>
        <strong aria-live="polite">{month.label}</strong>
        <button
          disabled={index === months.length - 1}
          aria-label="Next month"
          onClick={() => setIndex(index + 1)}
        >
          <ChevronRight />
        </button>
      </header>
      <div className="show-calendar-grid">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <small key={day}>{day}</small>
        ))}
        {month.cells.map((day) => {
          const booked = shows.get(day.date)
          return (
            <button
              key={day.date}
              data-outside={!day.inCurrentMonth}
              data-show={!!booked}
              aria-current={day.isToday ? 'date' : undefined}
              aria-label={day.date + (booked ? ', ' + booked.join(', ') : '')}
              disabled={!select || day.date < today}
              onClick={() => select?.(day.date)}
            >
              {day.dayOfMonth}
              {booked && <span aria-hidden="true">•</span>}
            </button>
          )
        })}
      </div>
      {select && <p>Choose a date to ask about a show.</p>}
    </section>
  )
}
