'use client'

import { useMemo, useState } from 'react'
import { buildVenueCalendarMonths, type VenueCalendarMonth } from '@/lib/venue-calendar'
import type { Booking, VenueBookingDate } from '@/types/database'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const STATUS_STYLES = {
  open: 'border-[#E8E8E8] bg-white text-[#666666]',
  partial: 'border-[#F1CABD] bg-[#FFF5F1] text-[#9A4A2C]',
  full: 'border-[#CBEAE2] bg-[#F3FBF8] text-[#14584E]',
} as const

function DayCell({
  day,
  isSelected,
  onSelect,
}: {
  day: VenueCalendarMonth['cells'][number]
  isSelected?: boolean
  onSelect?: (date: string) => void
}) {
  const isInteractive = !!onSelect

  return (
    <button
      type="button"
      onClick={() => onSelect?.(day.date)}
      className={`min-h-[86px] w-full rounded-xl border p-2 text-left transition-colors ${STATUS_STYLES[day.status]} ${
        day.inCurrentMonth ? '' : 'opacity-45'
      } ${day.isToday ? 'ring-1 ring-[#FD6A2F]' : ''} ${isSelected ? 'ring-2 ring-[#252525]' : ''} ${
        isInteractive ? 'cursor-pointer hover:border-[#252525]' : 'cursor-default'
      }`}
      aria-pressed={isSelected}
      disabled={!isInteractive}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-semibold">{day.dayOfMonth}</span>
        <span className="text-[10px] font-semibold uppercase tracking-widest">
          {day.status === 'open' ? 'Open' : day.status === 'partial' ? 'Partial' : 'Full'}
        </span>
      </div>
      <div className="mt-3 text-[11px] leading-relaxed">
        {day.billCap ? (
          <p>
            {day.confirmedCount}/{day.billCap} billed
          </p>
        ) : (
          <p>No bill cap</p>
        )}
        {day.isClosedToMoreBands && (
          <p className="mt-1">Closed to more bands</p>
        )}
      </div>
    </button>
  )
}

export function VenueAvailabilityCalendar({
  todayIso,
  bookingDates,
  bookings,
  title = 'Availability Calendar',
  intro,
  selectedDate,
  onDateSelect,
  monthCount = 6,
}: {
  todayIso: string
  bookingDates: Array<Pick<VenueBookingDate, 'id' | 'show_date' | 'bill_cap' | 'is_closed_to_more_bands'>>
  bookings: Array<Pick<Booking, 'venue_booking_date_id' | 'status'>>
  title?: string
  intro?: string
  selectedDate?: string
  onDateSelect?: (date: string) => void
  monthCount?: number
}) {
  const months = useMemo(
    () =>
      buildVenueCalendarMonths({
        todayIso,
        bookingDates,
        bookings,
        monthCount,
      }),
    [todayIso, bookingDates, bookings, monthCount]
  )
  const initialMonthIndex = useMemo(() => {
    if (!selectedDate) return 0
    const index = months.findIndex((month) =>
      month.cells.some((day) => day.inCurrentMonth && day.date === selectedDate)
    )
    return index >= 0 ? index : 0
  }, [months, selectedDate])
  const [visibleMonthIndex, setVisibleMonthIndex] = useState(initialMonthIndex)
  const visibleMonth = months[visibleMonthIndex]
  const todayMonthIndex = useMemo(() => {
    const index = months.findIndex((month) =>
      month.cells.some((day) => day.inCurrentMonth && day.date === todayIso)
    )
    return index >= 0 ? index : 0
  }, [months, todayIso])

  function jumpToToday() {
    setVisibleMonthIndex(todayMonthIndex)
    onDateSelect?.(todayIso)
  }

  return (
    <section>
      <div className="mb-4">
        <h2 className="text-xs font-semibold text-[#888888] uppercase tracking-widest mb-2">
          {title}
        </h2>
        {intro && <p className="text-sm text-[#777777]">{intro}</p>}
      </div>

      {visibleMonth && (
        <div>
          <div className="mb-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={jumpToToday}
                className="rounded-md border border-[#E8E8E8] px-2.5 py-1.5 text-xs font-medium text-[#555555] transition-colors hover:border-[#252525] hover:text-[#252525]"
              >
                Today
              </button>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setVisibleMonthIndex((current) => Math.max(0, current - 1))}
                  disabled={visibleMonthIndex === 0}
                  aria-label="Previous month"
                  className="px-2 py-2 text-2xl leading-none text-[#666666] transition-colors hover:text-[#252525] disabled:cursor-not-allowed disabled:opacity-35"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={() => setVisibleMonthIndex((current) => Math.min(months.length - 1, current + 1))}
                  disabled={visibleMonthIndex === months.length - 1}
                  aria-label="Next month"
                  className="px-2 py-2 text-2xl leading-none text-[#666666] transition-colors hover:text-[#252525] disabled:cursor-not-allowed disabled:opacity-35"
                >
                  ›
                </button>
              </div>
              <h3 className="text-base font-semibold text-[#252525]">{visibleMonth.label}</h3>
            </div>

            <div className="flex flex-wrap justify-end gap-2 text-xs">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#E8E8E8] bg-white px-3 py-1 text-[#666666]">
                <span className="w-2 h-2 rounded-full bg-white border border-[#D7D7D7]" />
                Open
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-[#F1CABD] bg-[#FFF5F1] px-3 py-1 text-[#9A4A2C]">
                <span className="w-2 h-2 rounded-full bg-[#FD6A2F]" />
                Partially filled
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-[#CBEAE2] bg-[#F3FBF8] px-3 py-1 text-[#14584E]">
                <span className="w-2 h-2 rounded-full bg-[#0C7C71]" />
                Full
              </span>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-2 mb-2">
            {WEEKDAYS.map((weekday) => (
              <div key={weekday} className="px-2 text-[11px] font-semibold uppercase tracking-widest text-[#AAAAAA]">
                {weekday}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {visibleMonth.cells.map((day) => (
              <DayCell
                key={day.date}
                day={day}
                isSelected={selectedDate === day.date}
                onSelect={onDateSelect}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
