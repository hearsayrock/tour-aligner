'use client'

import { useMemo, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import type { CalendarDayMarker, CalendarMarkerTone } from '@/lib/calendar-activity'
import { buildVenueCalendarMonths, type VenueCalendarMonth } from '@/lib/venue-calendar'
import { getVenueShowTypeLabel } from '@/lib/venue-booking-date'
import type { Booking, VenueBookingDate } from '@/types/database'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const STATUS_STYLES = {
  open: {
    cell: 'border-[#E9E0D6] bg-[linear-gradient(180deg,#FFFDFB_0%,#FFFFFF_100%)] text-[#231F1B]',
    label: 'border-[#EADFD3] bg-[#FFF6EF] text-[#7A5C48]',
    dot: 'bg-[#F5B995]',
  },
  partial: {
    cell: 'border-[#CDE8DF] bg-[linear-gradient(180deg,#F7FCFA_0%,#ECF8F3_100%)] text-[#134E44]',
    label: 'border-[#BFE1D6] bg-white/80 text-[#0F6C5F]',
    dot: 'bg-[#0C7C71]',
  },
  full: {
    cell: 'border-[#F1C9BA] bg-[linear-gradient(180deg,#FFF9F6_0%,#FFF0E8_100%)] text-[#8F452A]',
    label: 'border-[#EAB9A4] bg-white/75 text-[#9F4E29]',
    dot: 'bg-[#D96B37]',
  },
  unavailable: {
    cell: 'border-[#DCDCDC] bg-[linear-gradient(180deg,#F8F8F8_0%,#F1F1F1_100%)] text-[#666666]',
    label: 'border-[#D2D2D2] bg-white/70 text-[#666666]',
    dot: 'bg-[#9A9A9A]',
  },
} as const

const MARKER_STYLES: Record<CalendarMarkerTone, string> = {
  default: 'border-[#E2DDD6] bg-white/90 text-[#2A2A2A]',
  muted: 'border-[#E8E8E8] bg-[#F6F6F6]/90 text-[#666666]',
  brand: 'border-[#FFD5C4] bg-[#FFF3EE]/95 text-[#A84216]',
  success: 'border-[#CBEAE2] bg-[#F3FBF8]/95 text-[#14584E]',
  warning: 'border-[#F2D7A6] bg-[#FFF7E8]/95 text-[#8A5A12]',
  danger: 'border-[#F3C6C6] bg-[#FFF1F1]/95 text-[#9D2020]',
  info: 'border-[#BFE7EF] bg-[#F1FBFD]/95 text-[#0E6275]',
}

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
  const statusStyles = STATUS_STYLES[day.status]
  const selectionStyles = isActiveSelection
    ? 'border-[#252525] ring-2 ring-[#252525]/70 shadow-[0_22px_38px_rgba(17,17,17,0.14)]'
    : day.isToday
      ? 'border-[#252525]/65 ring-1 ring-[#252525]/45 shadow-[0_18px_30px_rgba(17,17,17,0.08)]'
      : 'shadow-[0_14px_28px_rgba(17,17,17,0.05)]'
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
      className={`relative w-full overflow-hidden rounded-[24px] border p-3 text-left transition-all duration-200 sm:min-h-[136px] sm:p-3.5 ${
        statusStyles.cell
      } ${day.inCurrentMonth ? '' : 'opacity-45'} ${selectionStyles} ${
        isInteractive ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-[0_24px_40px_rgba(17,17,17,0.1)]' : 'cursor-default'
      }`}
      aria-pressed={isSelected}
      disabled={!isInteractive}
    >
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-x-0 top-0 h-16 bg-[linear-gradient(180deg,rgba(255,255,255,0.85),rgba(255,255,255,0))] ${
          day.inCurrentMonth ? 'opacity-100' : 'opacity-70'
        }`}
      />

      <div className="relative flex h-full flex-col">
        <div className="flex flex-col gap-2 2xl:flex-row 2xl:items-start 2xl:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className={`text-base font-semibold leading-none sm:text-lg ${day.isToday ? 'text-[#A24A22]' : ''}`}>
                {day.dayOfMonth}
              </span>
            </div>
          </div>

          <div className="flex flex-row flex-wrap items-center gap-2 2xl:flex-col 2xl:items-end">
            {statusLabel && (
              <span
                className={`inline-flex max-w-full items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] sm:tracking-[0.12em] ${statusStyles.label}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${statusStyles.dot}`} />
                {statusLabel}
              </span>
            )}
            {countLabel && (
              <span
                className="rounded-full border border-black/8 bg-white/75 px-2 py-1 text-[10px] font-semibold text-current/80"
                title={capacityTitle}
              >
                {countLabel}
              </span>
            )}
          </div>
        </div>

        <div className="mt-3">
          {markers.length > 0 ? (
            <div className="space-y-1.5">
              <div className="flex flex-wrap gap-1 sm:hidden">
                <span
                  className={`inline-flex min-h-5 items-center rounded-full border px-1.5 text-[10px] font-semibold ${MARKER_STYLES[markers[0].tone]}`}
                  title={markers[0].label}
                >
                  {markers[0].shortLabel}
                </span>
                {markers.length > 1 && (
                  <span className="inline-flex min-h-5 items-center rounded-full border border-[#E2E2E2] bg-white px-1.5 text-[10px] font-semibold text-[#666666]">
                    +{markers.length - 1}
                  </span>
                )}
              </div>
              <div className="hidden sm:flex sm:flex-col sm:gap-1.5">
                {markers.slice(0, 2).map((marker) => (
                  <span
                    key={marker.id}
                    className={`truncate rounded-full border px-2 py-1 text-[10px] font-semibold shadow-[0_8px_16px_rgba(17,17,17,0.04)] ${MARKER_STYLES[marker.tone]}`}
                    title={marker.label}
                  >
                    {marker.shortLabel}
                  </span>
                ))}
                {markers.length > 2 && (
                  <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-current/55">
                    +{markers.length - 2} more
                  </span>
                )}
              </div>
            </div>
          ) : null}
        </div>

        {(availabilityLabel || day.showType || day.genreFocus) && (
          <div className="mt-auto space-y-1.5 pt-3 text-[11px] leading-relaxed">
            {availabilityLabel && <p className="font-medium text-current/72">{availabilityLabel}</p>}
            {(day.showType || day.genreFocus) && (
              <p className="truncate text-current/72">
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
    <section className="rounded-[32px] border border-[#E6DED3] bg-[linear-gradient(180deg,#FFF8F2_0%,#FAFAF8_38%,#FFFFFF_100%)] p-4 shadow-[0_24px_60px_rgba(17,17,17,0.06)] sm:p-5">
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#A24A22] shadow-[0_10px_22px_rgba(17,17,17,0.04)]">
            <CalendarDays className="h-3.5 w-3.5" />
            {title}
          </div>
          {intro && <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6E655D]">{intro}</p>}
        </div>
        {headerActions && <div className="flex flex-wrap items-center gap-2 text-xs">{headerActions}</div>}
      </div>

      {visibleMonth && (
        <div className="rounded-[28px] border border-white/80 bg-white/82 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_18px_44px_rgba(17,17,17,0.05)] backdrop-blur-sm sm:p-4">
          <div className="mb-4 flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={jumpToToday}
                className="rounded-full border border-[#E6DED3] bg-white px-3 py-1.5 text-xs font-semibold text-[#252525] shadow-[0_10px_20px_rgba(17,17,17,0.04)] transition-all hover:-translate-y-0.5 hover:border-[#D8CCBD] hover:bg-[#FFF8F2]"
              >
                Today
              </button>
              <div className="flex items-center gap-1 rounded-full border border-[#ECE4DA] bg-[#FBF7F2] p-1">
                <button
                  type="button"
                  onClick={() => setVisibleMonthIndex((current) => Math.max(0, current - 1))}
                  disabled={visibleMonthIndex === 0}
                  aria-label="Previous month"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[#666666] transition-colors hover:bg-white hover:text-[#252525] disabled:cursor-not-allowed disabled:opacity-35"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <div className="min-w-[10rem] px-3 text-center">
                  <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[#9B8F82]">Showing</p>
                  <h3 className="mt-1 text-base font-semibold tracking-tight text-[#252525]">{visibleMonth.label}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setVisibleMonthIndex((current) => Math.min(months.length - 1, current + 1))}
                  disabled={visibleMonthIndex === months.length - 1}
                  aria-label="Next month"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[#666666] transition-colors hover:bg-white hover:text-[#252525] disabled:cursor-not-allowed disabled:opacity-35"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="mb-3 grid grid-cols-7 gap-2 sm:gap-3">
            {WEEKDAYS.map((weekday) => (
              <div key={weekday} className="px-1 text-center text-[10px] font-semibold uppercase tracking-[0.22em] text-[#AA9D90] sm:px-2 sm:text-[11px]">
                {weekday}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2 sm:gap-3">
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
