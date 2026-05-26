'use client'

import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { buildVenueCalendarMonths, type VenueCalendarMonth } from '@/lib/venue-calendar'
import { getVenueShowTypeLabel } from '@/lib/venue-booking-date'
import type { Booking, VenueBookingDate } from '@/types/database'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const STATUS_STYLES = {
  open: 'border-[#CBEAE2] bg-[#F3FBF8] text-[#14584E]',
  partial: 'border-[#CBEAE2] bg-[#F3FBF8] text-[#14584E]',
  full: 'border-[#F1CABD] bg-[#FFF5F1] text-[#9A4A2C]',
  unavailable: 'border-[#D8D8D8] bg-[#F4F4F4] text-[#666666]',
} as const

function DayCell({
  day,
  isSelected,
  onSelect,
  selectedDates,
}: {
  day: VenueCalendarMonth['cells'][number]
  isSelected?: boolean
  onSelect?: (date: string) => void
  selectedDates?: string[]
}) {
  const isInteractive = !!onSelect
  const isMultiSelected = selectedDates?.includes(day.date) ?? false
  const showsMobileCount = !day.isUnavailable && day.status !== 'full' && !!day.billCap
  const todayStyles = day.isToday ? `bg-[#F0F0F0] ${isInteractive ? 'hover:bg-[#F0F0F0]' : ''}` : ''
  const selectionRing = (isSelected || isMultiSelected)
    ? day.isToday
      ? 'ring-2 ring-[#252525]'
      : 'ring-2 ring-[rgb(80,128,190)]'
    : day.isToday
      ? 'ring-1 ring-[#252525]'
      : ''

  return (
    <button
      type="button"
      onClick={() => onSelect?.(day.date)}
      style={day.isToday ? { backgroundColor: '#F0F0F0' } : undefined}
      className={`min-h-[68px] sm:min-h-[86px] w-full rounded-xl border p-2 text-left transition-colors ${STATUS_STYLES[day.status]} ${
        day.inCurrentMonth ? '' : 'opacity-45'
      } ${selectionRing} ${todayStyles} ${isInteractive ? 'cursor-pointer hover:border-[#252525]' : 'cursor-default'}`}
      aria-pressed={isSelected}
      disabled={!isInteractive}
    >
      <div className="grid min-h-[40px] grid-rows-[auto_1fr_auto] px-[1px] pt-[3px] pb-[2px] sm:min-h-[38px] sm:block sm:px-0 sm:pt-0 sm:pb-0">
        <span className="self-start text-sm font-semibold leading-none">{day.dayOfMonth}</span>
        <div aria-hidden className="sm:hidden" />
        <div className="self-end text-[11px] leading-none sm:hidden">
          {showsMobileCount ? (
            <p className="block">
              {day.confirmedCount}/{day.billCap}
            </p>
          ) : (
            <p className="invisible block">0/0</p>
          )}
        </div>
      </div>
      <div className="mt-3 text-[11px] leading-relaxed">
        <div className="hidden sm:block">
          {day.isUnavailable ? (
            <p>Unavailable</p>
          ) : day.status === 'full' ? (
            <p>All booked up</p>
          ) : day.billCap ? (
            <>
              <p>
                {day.confirmedCount}/{day.billCap} filled
              </p>
              {(day.showType || day.genreFocus) && (
                <p className="mt-1 truncate opacity-80">
                  {[getVenueShowTypeLabel(day.showType), day.genreFocus].filter(Boolean).join(' / ')}
                </p>
              )}
            </>
          ) : (
            <>
              <p>No bill cap</p>
              {(day.showType || day.genreFocus) && (
                <p className="mt-1 truncate opacity-80">
                  {[getVenueShowTypeLabel(day.showType), day.genreFocus].filter(Boolean).join(' / ')}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </button>
  )
}

export function VenueAvailabilityCalendar({
  todayIso,
  bookingDates,
  bookings,
  defaultBillCap,
  automatedGenreFocusByBookingDateId,
  title = 'Availability Calendar',
  intro,
  selectedDate,
  onDateSelect,
  selectedDates,
  headerActions,
  monthCount = 6,
}: {
  todayIso: string
  bookingDates: Array<Pick<VenueBookingDate, 'id' | 'show_date' | 'bill_cap' | 'is_closed_to_more_bands' | 'is_unavailable' | 'show_type' | 'genre_focus'>>
  bookings: Array<Pick<Booking, 'venue_booking_date_id' | 'status'>>
  defaultBillCap?: number | null
  automatedGenreFocusByBookingDateId?: Record<string, string | null>
  title?: string
  intro?: string
  selectedDate?: string
  onDateSelect?: (date: string) => void
  selectedDates?: string[]
  headerActions?: React.ReactNode
  monthCount?: number
}) {
  const months = useMemo(
    () =>
      buildVenueCalendarMonths({
        todayIso,
        bookingDates,
        bookings,
        monthCount,
        defaultBillCap,
        automatedGenreFocusByBookingDateId,
      }),
    [todayIso, bookingDates, bookings, monthCount, defaultBillCap, automatedGenreFocusByBookingDateId]
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
                className="rounded-lg border border-[#D8D8D8] px-2.5 py-1.5 text-xs font-medium text-[#252525] transition-colors hover:bg-[#F0F0F0]"
              >
                Today
              </button>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setVisibleMonthIndex((current) => Math.max(0, current - 1))}
                  disabled={visibleMonthIndex === 0}
                  aria-label="Previous month"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[#666666] transition-colors hover:bg-[#F0F0F0] hover:text-[#252525] disabled:cursor-not-allowed disabled:opacity-35"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setVisibleMonthIndex((current) => Math.min(months.length - 1, current + 1))}
                  disabled={visibleMonthIndex === months.length - 1}
                  aria-label="Next month"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[#666666] transition-colors hover:bg-[#F0F0F0] hover:text-[#252525] disabled:cursor-not-allowed disabled:opacity-35"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              <h3 className="text-base font-semibold text-[#252525]">{visibleMonth.label}</h3>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3 text-xs">
              {headerActions}
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
                  selectedDates={selectedDates}
                />
              ))}
          </div>
        </div>
      )}
    </section>
  )
}
