'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { saveVenueBookingDate } from '@/app/actions/venues'
import { VenueAvailabilityCalendar } from '@/components/venues/VenueAvailabilityCalendar'
import {
  VENUE_SHOW_TYPE_OPTIONS,
  getEffectiveVenueDateGenreFocus,
  getVenueShowTypeLabel,
} from '@/lib/venue-booking-date'
import type { Booking, VenueBookingDate } from '@/types/database'

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
}: {
  venueId: string
  venueSlug: string
  defaultBillCap: number
  todayIso: string
  bookingDates: Array<Pick<VenueBookingDate, 'id' | 'show_date' | 'bill_cap' | 'is_closed_to_more_bands' | 'is_unavailable' | 'show_type' | 'genre_focus'>>
  bookings: Array<Pick<Booking, 'venue_booking_date_id' | 'status'>>
  automatedGenreFocusByBookingDateId: Record<string, string | null>
  showHeader?: boolean
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
  const selectedConfirmedCount =
    selectedEntry ? (bookingCountMap.get(selectedEntry.id) ?? 0) : 0
  const selectedUnavailableCount = selectedDates.filter(
    (date) => bookingDateMap.get(date)?.is_unavailable
  ).length
  const automatedGenreFocus = selectedEntry ? automatedGenreFocusByBookingDateId[selectedEntry.id] ?? null : null
  const effectiveGenreFocus = getEffectiveVenueDateGenreFocus(genreFocus, automatedGenreFocus)

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
        <div>
          <h2 className="text-xs font-semibold text-[#888888] uppercase tracking-widest mb-2">
            Availability Calendar
          </h2>
          <p className="text-sm text-[#777777]">
            Click any date to set a custom bill cap, close the bill, or mark dates unavailable. Turn on bulk mode to update multiple dates at once.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-8">
        <VenueAvailabilityCalendar
          todayIso={todayIso}
          bookingDates={bookingDates}
          bookings={bookings}
          defaultBillCap={defaultBillCap}
          automatedGenreFocusByBookingDateId={automatedGenreFocusByBookingDateId}
          selectedDate={selectedDate}
          selectedDates={selectedDates}
          onDateSelect={syncSelectedDate}
          headerActions={
            <>
              {selectedDates.length > 1 && (
                <button
                  type="button"
                  onClick={() => setSelectedDates([selectedDate])}
                  className="text-sm text-[#666666] transition-colors hover:text-[#252525]"
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
                className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                  isBulkMode
                    ? 'border-[rgb(80,128,190)] bg-blue-50 text-[rgb(80,128,190)]'
                    : 'border-[#E8E8E8] bg-white text-[#555555] hover:border-[#CCCCCC]'
                }`}
              >
                {isBulkMode ? 'Bulk mode on' : 'Bulk edit dates'}
              </button>
            </>
          }
          monthCount={6}
        />

        <div className="rounded-2xl border border-[#E8E8E8] bg-white p-5 h-fit sticky top-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#888888]">
            {selectedDates.length > 1 ? 'Selected Dates' : 'Selected Date'}
          </p>
          <h3 className="text-lg font-semibold text-[#252525] mt-2">
            {selectedDates.length > 1 ? `${selectedDates.length} dates selected` : formatShowDate(selectedDate)}
          </h3>
          <p className="text-sm text-[#777777] mt-2">
            {selectedDates.length > 1
              ? 'Changes below will be applied to every selected date.'
              : selectedEntry
              ? 'This date already has calendar settings saved.'
              : 'This date is currently using your venue defaults.'}
          </p>

          <div className="mt-5 space-y-4">
            <label className="flex items-start gap-3 rounded-xl border border-[#E8E8E8] bg-[#FAFAFA] px-4 py-3">
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
                <span className="block text-sm font-medium text-[#252525]">
                  Mark as unavailable
                </span>
                <span className="mt-0.5 block text-xs text-[#888888]">
                  Use this for nights your venue never books shows or events.
                </span>
              </span>
            </label>

            <div>
              <label className="block text-sm text-[#777777] mb-1.5">Bill cap</label>
              <input
                type="number"
                min={1}
                value={billCap}
                onChange={(event) => setBillCap(event.target.value)}
                disabled={unavailable}
                className="w-full rounded-lg border border-[#E8E8E8] bg-[#F5F5F5] px-3 py-2.5 text-sm transition-colors focus:outline-none focus:border-[#FD6A2F]"
              />
              <p className="mt-1.5 text-xs text-[#888888]">
                Default venue cap: {defaultBillCap}
              </p>
            </div>

            <label className="flex items-start gap-3 rounded-xl border border-[#E8E8E8] bg-[#FAFAFA] px-4 py-3">
              <input
                type="checkbox"
                checked={closeBill}
                onChange={(event) => setCloseBill(event.target.checked)}
                disabled={unavailable}
                className="mt-0.5 h-4 w-4 rounded border-[#CCCCCC] text-[#FD6A2F] focus:ring-[#FD6A2F]"
              />
              <span>
                <span className="block text-sm font-medium text-[#252525]">
                  Close this date to more bands
                </span>
                <span className="mt-0.5 block text-xs text-[#888888]">
                  Use this to mark the date full even if the bill cap has not been reached yet.
                </span>
              </span>
            </label>

            <div className="rounded-xl border border-[#E8E8E8] bg-[#FCFCFC] px-4 py-3 text-sm text-[#666666]">
              <p>
                Confirmed bands: <span className="font-semibold text-[#252525]">{selectedConfirmedCount}</span>
              </p>
              <p className="mt-1">
                Current status: <span className="font-semibold text-[#252525]">
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
                  Unavailable dates in selection: <span className="font-semibold text-[#252525]">{selectedUnavailableCount}</span>
                </p>
              )}
              {!selectedDates.length || selectedDates.length > 1 ? null : (showType || genreFocus) ? (
                <p className="mt-1">
                  Show context:{' '}
                  <span className="font-semibold text-[#252525]">
                    {[getVenueShowTypeLabel(showType), genreFocus.trim() || null].filter(Boolean).join(' · ')}
                  </span>
                </p>
              ) : null}
              {!selectedDates.length || selectedDates.length > 1 || !effectiveGenreFocus ? null : (
                <p className="mt-1">
                  Date vibe:{' '}
                  <span className="font-semibold text-[#252525]">{effectiveGenreFocus}</span>{' '}
                  <span className="text-[#888888]">
                    ({genreFocus.trim() ? 'manual override' : 'auto-detected'})
                  </span>
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm text-[#777777] mb-1.5">Show type</label>
              <select
                value={showType ?? ''}
                onChange={(event) => setShowType((event.target.value || null) as VenueBookingDate['show_type'])}
                className="w-full rounded-lg border border-[#E8E8E8] bg-[#F5F5F5] px-3 py-2.5 text-sm transition-colors focus:outline-none focus:border-[#FD6A2F]"
              >
                <option value="">No specific type</option>
                {VENUE_SHOW_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="mt-1.5 text-xs text-[#888888]">
                Give bands a quick read on what kind of night this is shaping into.
              </p>
            </div>

            <div>
              <label className="block text-sm text-[#777777] mb-1.5">Genre vibe override</label>
              <input
                type="text"
                value={genreFocus}
                onChange={(event) => setGenreFocus(event.target.value)}
                placeholder={automatedGenreFocus ?? 'Indie / psych leaning'}
                className="w-full rounded-lg border border-[#E8E8E8] bg-[#F5F5F5] px-3 py-2.5 text-sm transition-colors focus:outline-none focus:border-[#FD6A2F]"
              />
              <p className="mt-1.5 text-xs text-[#888888]">
                Leave this blank and TourAligner will infer the vibe from the genres of the bands already booked on this date.
              </p>
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}
            {saved && <p className="text-sm text-[#0C7C71]">Calendar saved.</p>}

            <button
              type="button"
              onClick={save}
              disabled={isPending}
              className="w-full rounded-lg bg-[#FD6A2F] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#E55A22] disabled:opacity-50"
            >
              {isPending
                ? 'Saving…'
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
