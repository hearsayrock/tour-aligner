'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { saveVenueBookingDate } from '@/app/actions/venues'
import { VenueAvailabilityCalendar } from '@/components/venues/VenueAvailabilityCalendar'
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
}: {
  venueId: string
  venueSlug: string
  defaultBillCap: number
  todayIso: string
  bookingDates: Array<Pick<VenueBookingDate, 'id' | 'show_date' | 'bill_cap' | 'is_closed_to_more_bands'>>
  bookings: Array<Pick<Booking, 'venue_booking_date_id' | 'status'>>
}) {
  const router = useRouter()
  const [selectedDate, setSelectedDate] = useState(todayIso)
  const [billCap, setBillCap] = useState(String(defaultBillCap))
  const [closeBill, setCloseBill] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [isPending, startTransition] = useTransition()

  const bookingDateMap = useMemo(
    () => new Map(bookingDates.map((entry) => [entry.show_date, entry])),
    [bookingDates]
  )
  const bookingCountMap = useMemo(() => {
    const counts = new Map<string, number>()

    for (const booking of bookings) {
      if (booking.status !== 'confirmed') continue
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

  function syncSelectedDate(nextDate: string) {
    setSelectedDate(nextDate)
    const entry = bookingDateMap.get(nextDate)
    setBillCap(String(entry?.bill_cap ?? defaultBillCap))
    setCloseBill(entry?.is_closed_to_more_bands ?? false)
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
        showDate: selectedDate,
        billCap: parseInt(billCap, 10),
        closeBill,
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
      <div>
        <h2 className="text-xs font-semibold text-[#888888] uppercase tracking-widest mb-2">
          Availability Calendar
        </h2>
        <p className="text-sm text-[#777777]">
          Click any date to set a custom bill cap or close the bill before it fills up.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-8">
        <VenueAvailabilityCalendar
          todayIso={todayIso}
          bookingDates={bookingDates}
          bookings={bookings}
          selectedDate={selectedDate}
          onDateSelect={syncSelectedDate}
          monthCount={6}
        />

        <div className="rounded-2xl border border-[#E8E8E8] bg-white p-5 h-fit sticky top-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#888888]">Selected Date</p>
          <h3 className="text-lg font-semibold text-[#252525] mt-2">
            {formatShowDate(selectedDate)}
          </h3>
          <p className="text-sm text-[#777777] mt-2">
            {selectedEntry
              ? 'This date already has calendar settings saved.'
              : 'This date is currently using your venue defaults.'}
          </p>

          <div className="mt-5 space-y-4">
            <div>
              <label className="block text-sm text-[#777777] mb-1.5">Bill cap</label>
              <input
                type="number"
                min={1}
                value={billCap}
                onChange={(event) => setBillCap(event.target.value)}
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
                  {closeBill || selectedConfirmedCount >= parseInt(billCap || '0', 10)
                    ? 'Full'
                    : selectedConfirmedCount > 0
                      ? 'Partially filled'
                      : 'Open'}
                </span>
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
              {isPending ? 'Saving…' : selectedEntry ? 'Update date' : 'Save date settings'}
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
