'use client'

import { useMemo, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { badgeToneClass } from '@/components/ui/primitives'
import type { CalendarDayMarker } from '@/lib/calendar-activity'
import { buildVenueCalendarMonths, type VenueCalendarMonth } from '@/lib/venue-calendar'
import { getVenueShowTypeLabel } from '@/lib/venue-booking-date'
import type { Booking, VenueBookingDate } from '@/types/database'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const STATUS_STYLES = {
  open: 'border-border bg-surface text-ink',
  partial: 'border-success-border bg-success-tint text-success-text',
  full: 'border-brand-tint-border bg-brand-tint text-brand-tint-text',
  unavailable: 'border-border bg-surface-2 text-text-secondary',
} as const

function getStatusLabel(status: VenueCalendarMonth['cells'][number]['status']) {
  switch (status) {
    case 'partial':
      return 'In play'
    case 'full':
      return 'Full'
    case 'unavailable':
      return 'Off'
    default:
      return null
  }
}

function DayCell({
  day,
  isSelected,
  onSelect,
  selectedDates,
  markers = [],
}: {
  day: VenueCalendarMonth['cells'][number]
  isSelected?: boolean
  onSelect?: (date: string) => void
  selectedDates?: string[]
  markers?: CalendarDayMarker[]
}) {
  const isInteractive = !!onSelect
  const isMultiSelected = selectedDates?.includes(day.date) ?? false
  const isActiveSelection = isSelected || isMultiSelected
  const selectionStyles = isActiveSelection ? 'ring-2 ring-inset ring-edge' : day.isToday ? 'ring-1 ring-inset ring-brand-text' : ''
  const countLabel = !day.isUnavailable && day.billCap ? `${day.confirmedCount}/${day.billCap}` : null
  const capacityTitle = day.billCap ? `${day.confirmedCount} of ${day.billCap} filled` : undefined
  const availabilityLabel = day.isUnavailable
    ? 'Unavailable'
    : day.status === 'full'
      ? 'Bill closed'
      : null
  const statusLabel = getStatusLabel(day.status)

  return (
    <button
      type="button"
      onClick={() => onSelect?.(day.date)}
      aria-label={[day.date, statusLabel, capacityTitle, availabilityLabel, day.showType && getVenueShowTypeLabel(day.showType), day.genreFocus, ...markers.map((marker) => marker.label === marker.shortLabel ? marker.label : marker.label + ' (' + marker.shortLabel + ')')].filter(Boolean).join(', ')}
      aria-current={day.isToday ? 'date' : undefined}
      aria-pressed={isInteractive ? Boolean(isActiveSelection) : undefined}
      disabled={!isInteractive}
      className={`relative min-h-14 w-full min-w-0 overflow-hidden rounded-ds-md border p-1 text-left align-top sm:min-h-20 sm:p-2 ${STATUS_STYLES[day.status]} ${selectionStyles} ${day.inCurrentMonth ? '' : 'opacity-60'} ${isInteractive ? 'cursor-pointer hover:border-edge' : 'cursor-default'}`}
    >
      <div className="flex h-full flex-col">
        <div className="flex flex-wrap items-start justify-between gap-1">
          <span className={`font-ds-mono text-sm font-semibold leading-5 ${day.isToday ? 'text-brand-text underline underline-offset-2' : ''}`}>{day.dayOfMonth}</span>
          <div className="flex flex-row flex-wrap items-center gap-1 2xl:flex-col 2xl:items-end">
            {statusLabel && (
              <span
                className={`inline-flex max-w-full items-center gap-1 rounded-full border px-1 text-[9px] font-semibold sm:px-2 sm:text-[10px] ${STATUS_STYLES[day.status]}`}
              >

                {statusLabel}
              </span>
            )}
            {countLabel && (
              <span
                className="rounded-full border border-border bg-surface px-1 text-[10px] font-semibold text-ink"
                title={capacityTitle}
              >
                {countLabel}
              </span>
            )}
          </div>
        </div>

        <div className="mt-1">
          {markers.length > 0 ? (
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-1 sm:hidden" aria-hidden="true">
                {markers.slice(0, 2).map((marker) => <span key={marker.id} className={`rounded-full border px-1 text-[9px] font-bold ${badgeToneClass[marker.tone]}`}>{marker.shortLabel.slice(0, 3)}</span>)}
                {markers.length > 2 && <span className="text-xs">+</span>}
              </div>
              <div className="hidden sm:flex sm:flex-col sm:gap-1.5">
                {markers.slice(0, 2).map((marker) => (
                  <span
                    key={marker.id}
                    className={`truncate rounded-full border px-2 py-1 text-[10px] font-semibold ${badgeToneClass[marker.tone]}`}
                    title={marker.label}
                  >
                    {marker.shortLabel}
                  </span>
                ))}
                {markers.length > 2 && (
                  <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-text-secondary">
                    +{markers.length - 2} more
                  </span>
                )}
              </div>
            </div>
          ) : null}
        </div>

        {(availabilityLabel || day.showType || day.genreFocus) && (
          <div className="mt-auto space-y-1.5 pt-3 text-[11px] leading-relaxed">
            {availabilityLabel && <p className="font-medium text-current">{availabilityLabel}</p>}
            {(day.showType || day.genreFocus) && (
              <p className="truncate text-current">
                {[getVenueShowTypeLabel(day.showType), day.genreFocus].filter(Boolean).join(' / ')}
              </p>
            )}
          </div>
        )}
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
  markersByDate = {},
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
  markersByDate?: Record<string, CalendarDayMarker[]>
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
    <section className="min-w-0 rounded-ds-2xl border border-border bg-surface p-3 text-ink sm:p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
        <div>
          <h2 className="flex items-center gap-2 font-ds-mono text-xs tracking-wider uppercase text-text-secondary">
            <CalendarDays className="size-4" />{title}
          </h2>
          {intro && <p className="mt-2 max-w-prose text-sm text-text-secondary">{intro}</p>}
        </div>
        {headerActions}
      </div>
      {visibleMonth && (
        <div>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
            <h3 aria-live="polite" className="font-ds-display text-3xl leading-none font-extrabold uppercase">{visibleMonth.label}</h3>
            <div className="flex items-center gap-1">
              <button type="button" onClick={jumpToToday} className="min-h-10 rounded-full border border-edge px-3 text-sm font-semibold hover:bg-surface-2">Today</button>
              <button type="button" onClick={() => setVisibleMonthIndex((current) => Math.max(0, current - 1))}
                disabled={visibleMonthIndex === 0} aria-label="Previous month" className="grid size-10 place-items-center rounded-full border border-border hover:bg-surface-2 disabled:opacity-35">
                <ChevronLeft className="size-4" />
              </button>
              <button type="button" onClick={() => setVisibleMonthIndex((current) => Math.min(months.length - 1, current + 1))}
                disabled={visibleMonthIndex === months.length - 1} aria-label="Next month" className="grid size-10 place-items-center rounded-full border border-border hover:bg-surface-2 disabled:opacity-35">
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>

          <div className="mb-3 grid grid-cols-7 gap-1 sm:gap-2">
            {WEEKDAYS.map((weekday) => (
              <div key={weekday} className="px-1 text-center font-ds-mono text-[10px] font-semibold uppercase text-text-secondary sm:px-2 sm:text-[11px]">
                {weekday}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {visibleMonth.cells.map((day) => (
              <DayCell
                key={day.date}
                day={day}
                isSelected={selectedDate === day.date}
                onSelect={onDateSelect}
                selectedDates={selectedDates}
                markers={markersByDate[day.date] ?? []}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
