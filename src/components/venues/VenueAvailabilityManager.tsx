'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Layers3, WandSparkles } from 'lucide-react'
import { saveVenueBookingDate } from '@/app/actions/venues'
import { CalendarActivityList } from '@/components/calendar/CalendarActivityList'
import { VenueAvailabilityCalendar } from '@/components/venues/VenueAvailabilityCalendar'
import type { CalendarActivity, CalendarDayMarker } from '@/lib/calendar-activity'
import {
  VENUE_SHOW_TYPE_OPTIONS,
  getEffectiveVenueDateGenreFocus,
  getVenueShowTypeLabel,
} from '@/lib/venue-booking-date'
import type { Booking, VenueBookingDate } from '@/types/database'

// Legacy venue-date availability editor. The dashboard calendar is Event-centered;
// keep this for existing public booking/date-management surfaces until that model is retired.
function formatShowDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export function VenueAvailabilityManager({
  venueId,
  venueSlug,
  defaultBillCap,
  todayIso,
  bookingDates,
  bookings,
  automatedGenreFocusByBookingDateId,
  showHeader = true,
  markersByDate = {},
  activitiesByDate = {},
}: {
  venueId: string
  venueSlug: string
  defaultBillCap: number
  todayIso: string
  bookingDates: Array<Pick<VenueBookingDate, 'id' | 'show_date' | 'bill_cap' | 'is_closed_to_more_bands' | 'is_unavailable' | 'show_type' | 'genre_focus'>>
  bookings: Array<Pick<Booking, 'venue_booking_date_id' | 'status'>>
  automatedGenreFocusByBookingDateId: Record<string, string | null>
  showHeader?: boolean
  markersByDate?: Record<string, CalendarDayMarker[]>
  activitiesByDate?: Record<string, CalendarActivity[]>
}) {
  const router = useRouter()
  const [selectedDates, setSelectedDates] = useState<string[]>([todayIso])
  const [isBulkMode, setIsBulkMode] = useState(false)
  const [billCap, setBillCap] = useState(String(defaultBillCap))
  const [closeBill, setCloseBill] = useState(false)
  const [unavailable, setUnavailable] = useState(false)
  const [showType, setShowType] = useState<VenueBookingDate['show_type']>(null)
  const [genreFocus, setGenreFocus] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [isPending, startTransition] = useTransition()
  const selectedDate = selectedDates[0] ?? todayIso

  const bookingDateMap = useMemo(
    () => new Map(bookingDates.map((entry) => [entry.show_date, entry])),
    [bookingDates]
  )
  const bookingCountMap = useMemo(() => {
    const counts = new Map<string, number>()

    for (const booking of bookings) {
      if (booking.status !== 'confirmed' && booking.status !== 'cancellation_requested') continue
      counts.set(
        booking.venue_booking_date_id,
        (counts.get(booking.venue_booking_date_id) ?? 0) + 1
      )
    }

    return counts
  }, [bookings])

  const selectedEntry = bookingDateMap.get(selectedDate) ?? null
  const selectedConfirmedCount = selectedEntry ? (bookingCountMap.get(selectedEntry.id) ?? 0) : 0
  const selectedUnavailableCount = selectedDates.filter(
    (date) => bookingDateMap.get(date)?.is_unavailable
  ).length
  const automatedGenreFocus = selectedEntry ? automatedGenreFocusByBookingDateId[selectedEntry.id] ?? null : null
  const effectiveGenreFocus = getEffectiveVenueDateGenreFocus(genreFocus, automatedGenreFocus)
  const selectedActivities = activitiesByDate[selectedDate] ?? []

  function syncSelectedDate(nextDate: string) {
    if (isBulkMode) {
      setSelectedDates((current) =>
        current.includes(nextDate) ? current.filter((date) => date !== nextDate) : [...current, nextDate]
      )
    } else {
      setSelectedDates([nextDate])
      const entry = bookingDateMap.get(nextDate)
      setBillCap(String(entry?.bill_cap ?? defaultBillCap))
      setCloseBill(entry?.is_closed_to_more_bands ?? false)
      setUnavailable(entry?.is_unavailable ?? false)
      setShowType(entry?.show_type ?? null)
      setGenreFocus(entry?.genre_focus ?? '')
    }
    setError(null)
    setSaved(false)
  }

  function save() {
    setError(null)
    setSaved(false)

    startTransition(async () => {
      const result = await saveVenueBookingDate({
        venueId,
        venueSlug,
        showDates: selectedDates,
        billCap: parseInt(billCap, 10),
        closeBill,
        unavailable,
        showType,
        genreFocus: genreFocus.trim() || null,
      })

      if (result.error) {
        setError(result.error)
        return
      }

      setSaved(true)
      router.refresh()
    })
  }

  return (
    <section className="space-y-6">
      {showHeader && (
        <div className="rounded-[28px] border border-[#E8DED2] bg-[linear-gradient(180deg,#FFF8F2_0%,#FFFFFF_100%)] p-5 shadow-[0_18px_42px_rgba(17,17,17,0.05)]">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#A24A22]">Availability calendar</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-[#181818]">Shape the next six months</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#777777]">
            Click any date to set a custom bill cap, close the bill, or mark dates unavailable. Turn on bulk mode to update multiple dates at once.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_340px]">
        <VenueAvailabilityCalendar
          todayIso={todayIso}
          bookingDates={bookingDates}
          bookings={bookings}
          defaultBillCap={defaultBillCap}
          automatedGenreFocusByBookingDateId={automatedGenreFocusByBookingDateId}
          selectedDate={selectedDate}
          selectedDates={selectedDates}
          onDateSelect={syncSelectedDate}
          markersByDate={markersByDate}
          headerActions={
            <>
              {selectedDates.length > 1 && (
                <button
                  type="button"
                  onClick={() => setSelectedDates([selectedDate])}
                  className="rounded-full border border-[#E6DED3] bg-white px-3 py-1.5 text-xs font-semibold text-[#666666] transition-all hover:-translate-y-0.5 hover:text-[#252525]"
                >
                  Clear selections
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setIsBulkMode((current) => !current)
                  setSelectedDates([selectedDate])
                  setError(null)
                  setSaved(false)
                }}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${
                  isBulkMode
                    ? 'border-[#0C7C71]/20 bg-[#EAF7F2] text-[#0C7C71] shadow-[0_10px_24px_rgba(12,124,113,0.12)]'
                    : 'border-[#E6DED3] bg-white text-[#555555] hover:-translate-y-0.5 hover:border-[#D8CCBD]'
                }`}
              >
                {isBulkMode ? 'Bulk mode on' : 'Bulk edit dates'}
              </button>
            </>
          }
          monthCount={6}
        />

        <div className="sticky top-6 h-fit rounded-[30px] border border-[#E8DED2] bg-[linear-gradient(180deg,#FFFDFB_0%,#F8F7F4_100%)] p-5 shadow-[0_18px_42px_rgba(17,17,17,0.06)]">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/85 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8C7D6F]">
            <Layers3 className="h-3.5 w-3.5" />
            {selectedDates.length > 1 ? 'Selected dates' : 'Selected date'}
          </div>
          <h3 className="mt-4 text-xl font-semibold tracking-tight text-[#252525]">
            {selectedDates.length > 1 ? `${selectedDates.length} dates selected` : formatShowDate(selectedDate)}
          </h3>
          <p className="mt-2 text-sm leading-6 text-[#777777]">
            {selectedDates.length > 1
              ? 'Changes below will be applied to every selected date.'
              : selectedEntry
                ? 'This date already has calendar settings saved.'
                : 'This date is currently using your venue defaults.'}
          </p>

          <div className="mt-6 rounded-[24px] border border-[#EAE1D7] bg-white/80 p-4 text-sm text-[#666666] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
            <div className="flex items-start gap-3">
              <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#FFF1E7] text-[#C85A28]">
                <WandSparkles className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p>
                  Confirmed bands: <span className="font-semibold text-[#252525]">{selectedConfirmedCount}</span>
                </p>
                <p className="mt-1">
                  Current status:{' '}
                  <span className="font-semibold text-[#252525]">
                    {unavailable
                      ? 'Unavailable'
                      : closeBill || selectedConfirmedCount >= parseInt(billCap || '0', 10)
                        ? 'Full'
                        : selectedConfirmedCount > 0
                          ? 'Partially filled'
                          : 'Open'}
                  </span>
                </p>
                {selectedDates.length > 1 && (
                  <p className="mt-1">
                    Unavailable dates in selection:{' '}
                    <span className="font-semibold text-[#252525]">{selectedUnavailableCount}</span>
                  </p>
                )}
                {selectedDates.length === 1 && (showType || genreFocus) && (
                  <p className="mt-1">
                    Show context:{' '}
                    <span className="font-semibold text-[#252525]">
                      {[getVenueShowTypeLabel(showType), genreFocus.trim() || null].filter(Boolean).join(' / ')}
                    </span>
                  </p>
                )}
                {selectedDates.length === 1 && effectiveGenreFocus && (
                  <p className="mt-1">
                    Date vibe: <span className="font-semibold text-[#252525]">{effectiveGenreFocus}</span>{' '}
                    <span className="text-[#888888]">({genreFocus.trim() ? 'manual override' : 'auto-detected'})</span>
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            <label className="flex items-start gap-3 rounded-[22px] border border-[#EAE1D7] bg-white/78 px-4 py-3.5 shadow-[0_10px_22px_rgba(17,17,17,0.04)]">
              <input
                type="checkbox"
                checked={unavailable}
                onChange={(event) => {
                  setUnavailable(event.target.checked)
                  if (event.target.checked) setCloseBill(false)
                }}
                className="mt-0.5 h-4 w-4 rounded border-[#CCCCCC] text-[#252525] focus:ring-[#252525]"
              />
              <span>
                <span className="block text-sm font-medium text-[#252525]">Mark as unavailable</span>
                <span className="mt-0.5 block text-xs leading-5 text-[#888888]">
                  Use this for nights your venue never books shows or events.
                </span>
              </span>
            </label>

            <div className="rounded-[22px] border border-[#EAE1D7] bg-white/78 px-4 py-3.5 shadow-[0_10px_22px_rgba(17,17,17,0.04)]">
              <label className="mb-1.5 block text-sm text-[#777777]">Bill cap</label>
              <input
                type="number"
                min={1}
                value={billCap}
                onChange={(event) => setBillCap(event.target.value)}
                disabled={unavailable}
                className="w-full rounded-2xl border border-[#E8E0D7] bg-[#F8F5F1] px-3 py-2.5 text-sm transition-colors focus:border-[#FD6A2F] focus:bg-white focus:outline-none"
              />
              <p className="mt-1.5 text-xs text-[#888888]">Default venue cap: {defaultBillCap}</p>
            </div>

            <label className="flex items-start gap-3 rounded-[22px] border border-[#EAE1D7] bg-white/78 px-4 py-3.5 shadow-[0_10px_22px_rgba(17,17,17,0.04)]">
              <input
                type="checkbox"
                checked={closeBill}
                onChange={(event) => setCloseBill(event.target.checked)}
                disabled={unavailable}
                className="mt-0.5 h-4 w-4 rounded border-[#CCCCCC] text-[#FD6A2F] focus:ring-[#FD6A2F]"
              />
              <span>
                <span className="block text-sm font-medium text-[#252525]">Close this date to more bands</span>
                <span className="mt-0.5 block text-xs leading-5 text-[#888888]">
                  Use this to mark the date full even if the bill cap has not been reached yet.
                </span>
              </span>
            </label>

            <div className="rounded-[22px] border border-[#EAE1D7] bg-white/78 px-4 py-3.5 shadow-[0_10px_22px_rgba(17,17,17,0.04)]">
              <p className="mb-3 text-sm font-semibold text-[#252525]">Backstages on this date</p>
              <CalendarActivityList
                items={selectedActivities}
                emptyMessage="No event workspace is tied to this date yet."
              />
            </div>

            <div className="rounded-[22px] border border-[#EAE1D7] bg-white/78 px-4 py-3.5 shadow-[0_10px_22px_rgba(17,17,17,0.04)]">
              <label className="mb-1.5 block text-sm text-[#777777]">Show type</label>
              <select
                value={showType ?? ''}
                onChange={(event) => setShowType((event.target.value || null) as VenueBookingDate['show_type'])}
                className="w-full rounded-2xl border border-[#E8E0D7] bg-[#F8F5F1] px-3 py-2.5 text-sm transition-colors focus:border-[#FD6A2F] focus:bg-white focus:outline-none"
              >
                <option value="">No specific type</option>
                {VENUE_SHOW_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="mt-1.5 text-xs leading-5 text-[#888888]">
                Give bands a quick read on what kind of night this is shaping into.
              </p>
            </div>

            <div className="rounded-[22px] border border-[#EAE1D7] bg-white/78 px-4 py-3.5 shadow-[0_10px_22px_rgba(17,17,17,0.04)]">
              <label className="mb-1.5 block text-sm text-[#777777]">Genre vibe override</label>
              <input
                type="text"
                value={genreFocus}
                onChange={(event) => setGenreFocus(event.target.value)}
                placeholder={automatedGenreFocus ?? 'Indie / psych leaning'}
                className="w-full rounded-2xl border border-[#E8E0D7] bg-[#F8F5F1] px-3 py-2.5 text-sm transition-colors focus:border-[#FD6A2F] focus:bg-white focus:outline-none"
              />
              <p className="mt-1.5 text-xs leading-5 text-[#888888]">
                Leave this blank and TourAligner will infer the vibe from the genres of the bands already booked on this date.
              </p>
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}
            {saved && <p className="text-sm text-[#0C7C71]">Calendar saved.</p>}

            <button
              type="button"
              onClick={save}
              disabled={isPending}
              className="w-full rounded-full bg-[#FD6A2F] px-4 py-3 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(253,106,47,0.28)] transition-all hover:-translate-y-0.5 hover:bg-[#E55A22] disabled:opacity-50"
            >
              {isPending
                ? 'Saving...'
                : selectedDates.length > 1
                  ? 'Apply to selected dates'
                  : selectedEntry
                    ? 'Update date'
                    : 'Save date settings'}
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
