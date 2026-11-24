'use client'
import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { buildVenueCalendarMonths } from '@/lib/venue-calendar'

export function ShowCalendar({ today, select }: { today: string; select?: (date: string) => void }) {
  const months = useMemo(
    () => buildVenueCalendarMonths({ todayIso: today, bookingDates: [], bookings: [], monthCount: 12 }),
    [today]
  )
  const [index, setIndex] = useState(0)
  const month = months[index]
  return (
    <section className="show-calendar" aria-label="Show calendar">
      <header>
        <h3 aria-live="polite">{month.label}</h3>
        {select && <small>Ask about a date</small>}
        <button disabled={!index} aria-label="Previous month" onClick={() => setIndex(index - 1)}>
          <ChevronLeft />
        </button>
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
          if (!day.inCurrentMonth) return <span key={day.date} aria-hidden="true" />
          return (
            <button
              key={day.date}
              aria-current={day.isToday ? 'date' : undefined}
              aria-label={day.date}
              disabled={!select || day.date < today}
              onClick={() => select?.(day.date)}
            >
              {day.dayOfMonth}
            </button>
          )
        })}
      </div>
      {select && <p>Choose a date to ask about a show.</p>}
    </section>
  )
}
