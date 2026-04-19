import type { Booking, VenueBookingDate } from '@/types/database'

export type VenueCalendarStatus = 'open' | 'partial' | 'full' | 'unavailable'

export type VenueCalendarCell = {
  date: string
  dayOfMonth: number
  inCurrentMonth: boolean
  isToday: boolean
  status: VenueCalendarStatus
  confirmedCount: number
  billCap: number | null
  isClosedToMoreBands: boolean
  isUnavailable: boolean
  showType: VenueBookingDate['show_type']
  genreFocus: string | null
}

export type VenueCalendarMonth = {
  key: string
  label: string
  cells: VenueCalendarCell[]
}

type BookingDateSummary = Pick<VenueBookingDate, 'id' | 'show_date' | 'bill_cap' | 'is_closed_to_more_bands' | 'is_unavailable' | 'show_type' | 'genre_focus'>
type BookingSummary = Pick<Booking, 'venue_booking_date_id' | 'status'>

function dateFromParts(year: number, monthIndex: number, day: number) {
  return new Date(Date.UTC(year, monthIndex, day))
}

function parseIsoDate(isoDate: string) {
  const [year, month, day] = isoDate.split('-').map(Number)
  return dateFromParts(year, month - 1, day)
}

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

function addDays(date: Date, days: number) {
  const next = new Date(date.getTime())
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

function monthLabel(date: Date) {
  return date.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

function startOfMonth(date: Date) {
  return dateFromParts(date.getUTCFullYear(), date.getUTCMonth(), 1)
}

function endOfMonth(date: Date) {
  return dateFromParts(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)
}

function startOfWeek(date: Date) {
  return addDays(date, -date.getUTCDay())
}

function endOfWeek(date: Date) {
  return addDays(date, 6 - date.getUTCDay())
}

export function getVenueCalendarRange(todayIso: string, monthCount = 6) {
  const today = parseIsoDate(todayIso)
  const firstMonth = startOfMonth(today)
  const lastMonth = startOfMonth(dateFromParts(today.getUTCFullYear(), today.getUTCMonth() + monthCount - 1, 1))

  return {
    todayIso,
    rangeStart: toIsoDate(startOfWeek(firstMonth)),
    rangeEnd: toIsoDate(endOfWeek(endOfMonth(lastMonth))),
  }
}

export function buildVenueCalendarMonths(args: {
  todayIso: string
  monthCount?: number
  bookingDates: BookingDateSummary[]
  bookings: BookingSummary[]
  defaultBillCap?: number | null
  automatedGenreFocusByBookingDateId?: Record<string, string | null>
}) {
  const {
    todayIso,
    bookingDates,
    bookings,
    monthCount = 6,
    defaultBillCap = null,
    automatedGenreFocusByBookingDateId = {},
  } = args
  const today = parseIsoDate(todayIso)
  const months: VenueCalendarMonth[] = []

  const bookingDateMap = new Map(bookingDates.map((entry) => [entry.show_date, entry]))
  const bookingCountMap = new Map<string, number>()

  for (const booking of bookings) {
    if (booking.status !== 'confirmed' && booking.status !== 'cancellation_requested') continue
    bookingCountMap.set(
      booking.venue_booking_date_id,
      (bookingCountMap.get(booking.venue_booking_date_id) ?? 0) + 1
    )
  }

  for (let monthOffset = 0; monthOffset < monthCount; monthOffset += 1) {
    const monthDate = dateFromParts(today.getUTCFullYear(), today.getUTCMonth() + monthOffset, 1)
    const gridStart = startOfWeek(startOfMonth(monthDate))
    const gridEnd = endOfWeek(endOfMonth(monthDate))
    const cells: VenueCalendarCell[] = []

    for (let cursor = gridStart; cursor <= gridEnd; cursor = addDays(cursor, 1)) {
      const iso = toIsoDate(cursor)
      const bookingDate = bookingDateMap.get(iso)
      const confirmedCount = bookingDate ? (bookingCountMap.get(bookingDate.id) ?? 0) : 0
      const isClosedToMoreBands = bookingDate?.is_closed_to_more_bands ?? false
      const isUnavailable = bookingDate?.is_unavailable ?? false
      const billCap = bookingDate?.bill_cap ?? defaultBillCap

      let status: VenueCalendarStatus = 'open'
      if (isUnavailable) {
        status = 'unavailable'
      } else if (isClosedToMoreBands || (billCap !== null && confirmedCount >= billCap)) {
        status = 'full'
      } else if (confirmedCount > 0) {
        status = 'partial'
      }

      cells.push({
        date: iso,
        dayOfMonth: cursor.getUTCDate(),
        inCurrentMonth: cursor.getUTCMonth() === monthDate.getUTCMonth(),
        isToday: iso === todayIso,
        status,
        confirmedCount,
        billCap,
        isClosedToMoreBands,
        isUnavailable,
        showType: bookingDate?.show_type ?? null,
        genreFocus: bookingDate
          ? bookingDate.genre_focus ?? automatedGenreFocusByBookingDateId[bookingDate.id] ?? null
          : null,
      })
    }

    months.push({
      key: `${monthDate.getUTCFullYear()}-${monthDate.getUTCMonth()}`,
      label: monthLabel(monthDate),
      cells,
    })
  }

  return months
}
