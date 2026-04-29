'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { RequestContactForm } from '@/components/contact/RequestContactForm'
import { VenueAvailabilityCalendar } from '@/components/venues/VenueAvailabilityCalendar'
import { getEffectiveVenueDateGenreFocus, getVenueShowTypeLabel } from '@/lib/venue-booking-date'
import type { Booking, VenueBookingDate } from '@/types/database'

type ContactOption = {
  id: string
  name: string
  genres?: string[]
}

function formatDateShort(isoDate: string) {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

export function PublicVenueBookingPanel({
  todayIso,
  bookingDates,
  bookings,
  automatedGenreFocusByBookingDateId,
  defaultBillCap,
  venueId,
  venueSlug,
  userBands,
  isSignedIn,
  initialSelectedDate,
  identityNotice,
  existingThread,
  activeBandName,
}: {
  todayIso: string
  bookingDates: Array<Pick<VenueBookingDate, 'id' | 'show_date' | 'bill_cap' | 'is_closed_to_more_bands' | 'is_unavailable' | 'show_type' | 'genre_focus'>>
  bookings: Array<Pick<Booking, 'venue_booking_date_id' | 'status'>>
  automatedGenreFocusByBookingDateId: Record<string, string | null>
  defaultBillCap: number
  venueId: string
  venueSlug: string
  userBands: ContactOption[]
  isSignedIn: boolean
  initialSelectedDate?: string
  identityNotice?: { title: string; body: string } | null
  existingThread?: { threadId: string; confirmedUpcomingDate: string | null } | null
  activeBandName?: string | null
}) {
  const [selectedDate, setSelectedDate] = useState(initialSelectedDate ?? todayIso)
  const selectedEntry = useMemo(
    () => bookingDates.find((entry) => entry.show_date === selectedDate) ?? null,
    [bookingDates, selectedDate]
  )
  const bookingCountByDateId = useMemo(() => {
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
  const selectedCount = selectedEntry ? bookingCountByDateId.get(selectedEntry.id) ?? 0 : 0
  const selectedBillCap = selectedEntry?.bill_cap ?? defaultBillCap
  const selectedShowType = getVenueShowTypeLabel(selectedEntry?.show_type ?? null)
  const selectedGenreFocus = getEffectiveVenueDateGenreFocus(
    selectedEntry?.genre_focus,
    selectedEntry ? automatedGenreFocusByBookingDateId[selectedEntry.id] : null
  )
  const dateFitContextByIso = useMemo(
    () =>
      Object.fromEntries(
        bookingDates.map((entry) => [
          entry.show_date,
          {
            effectiveGenreFocus: getEffectiveVenueDateGenreFocus(
              entry.genre_focus,
              automatedGenreFocusByBookingDateId[entry.id]
            ),
            showTypeLabel: getVenueShowTypeLabel(entry.show_type),
          },
        ])
      ),
    [automatedGenreFocusByBookingDateId, bookingDates]
  )
  const selectedStatus = selectedEntry?.is_unavailable
    ? 'unavailable'
    : selectedEntry && (selectedEntry.is_closed_to_more_bands || selectedCount >= selectedBillCap)
      ? 'full'
      : selectedCount > 0
        ? 'open_with_context'
        : 'open'
  const selectedHeadline =
    selectedStatus === 'unavailable'
      ? 'This date is unavailable'
      : selectedStatus === 'full'
        ? 'This date is all booked up'
        : selectedStatus === 'open_with_context'
          ? 'This date still has room on the bill'
          : 'This date looks open for the right fit'
  const selectedDescription =
    selectedStatus === 'unavailable'
      ? 'This is a night the venue is not booking for shows or events.'
      : selectedStatus === 'full'
        ? 'The bill is capped or full, so this date is not currently taking more acts.'
        : selectedStatus === 'open_with_context'
          ? 'There are already acts attached, but the venue is still open to adding more if the fit is right.'
          : 'Nothing is locked yet, so this is a good date to make a strong case for your band.'

  return (
    <>
      <div className="border-t border-[#E8E8E8] pt-8 mb-10">
        <VenueAvailabilityCalendar
          todayIso={todayIso}
          bookingDates={bookingDates}
          bookings={bookings}
          defaultBillCap={defaultBillCap}
          automatedGenreFocusByBookingDateId={automatedGenreFocusByBookingDateId}
          title="Calendar"
          intro="Here’s this venue’s current availability for the next six months. Open dates can still take bookings, partially filled dates still have room on the bill, and full dates are capped."
          selectedDate={selectedDate}
          onDateSelect={setSelectedDate}
          monthCount={6}
        />
        <div className="mt-5 rounded-2xl border border-[#E8E8E8] bg-[#FCFCFC] px-5 py-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#888888]">
            Selected date
          </p>
          <div className="mt-2 flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h3 className="text-lg font-semibold text-[#252525]">
                {new Date(`${selectedDate}T00:00:00`).toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })}
              </h3>
              <p className="mt-1 text-sm text-[#666666]">{selectedHeadline}</p>
            </div>
            {selectedStatus !== 'unavailable' && (
              <div className="rounded-xl border border-[#E8E8E8] bg-white px-4 py-3 text-sm text-[#252525]">
                <p>
                  {selectedCount}/{selectedBillCap} filled
                </p>
              </div>
            )}
          </div>
          <p className="mt-3 text-sm text-[#777777]">{selectedDescription}</p>

          {(selectedShowType || selectedGenreFocus) && (
            <div className="mt-4 flex flex-wrap gap-2">
              {selectedShowType && (
                <span className="rounded-full border border-[#E8E8E8] bg-white px-3 py-1 text-xs font-medium text-[#555555]">
                  {selectedShowType}
                </span>
              )}
              {selectedGenreFocus && (
                <span className="rounded-full border border-[#E8E8E8] bg-white px-3 py-1 text-xs font-medium text-[#555555]">
                  {selectedGenreFocus}
                </span>
              )}
            </div>
          )}

          {selectedStatus !== 'full' && selectedStatus !== 'unavailable' && (
            <p className="mt-4 text-sm text-[#666666]">
              If this feels like a fit, select your band below and the suggested date will carry into the request automatically.
            </p>
          )}
        </div>
      </div>

      <section className="border-t border-[#E8E8E8] pt-8 mb-8">
        <h2 className="text-xs font-semibold text-[#888888] uppercase tracking-widest mb-4">
          Request contact
        </h2>

        {isSignedIn && existingThread ? (
          existingThread.confirmedUpcomingDate ? (
            <div className="rounded-xl border border-[#CBEAE2] bg-[#F3FBF8] px-4 py-4">
              <p className="text-sm font-semibold text-[#14584E]">
                ✓ {activeBandName} is playing here on {formatDateShort(existingThread.confirmedUpcomingDate)}
              </p>
              <p className="mt-1 text-sm text-[#14584E]/80">
                You already have a confirmed booking with this venue.
              </p>
              <Link
                href={`/dashboard/inbox/${existingThread.threadId}`}
                className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-[#0C7C71] hover:underline"
              >
                View booking in inbox →
              </Link>
            </div>
          ) : (
            <div className="rounded-xl border border-[#E8E8E8] bg-[#FAFAFA] px-4 py-4">
              <p className="text-sm font-semibold text-[#252525]">
                You're already in a conversation with this venue
              </p>
              <p className="mt-1 text-sm text-[#777777]">
                {activeBandName} has an open thread here. Head to your inbox to continue it.
              </p>
              <Link
                href={`/dashboard/inbox/${existingThread.threadId}`}
                className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-[#FD6A2F] hover:underline"
              >
                Continue conversation →
              </Link>
            </div>
          )
        ) : isSignedIn && identityNotice ? (
          <div className="rounded-xl border border-[#F2D7A6] bg-[#FFF7E8] px-4 py-3 text-sm">
            <p className="font-semibold text-[#8A5A12]">{identityNotice.title}</p>
            <p className="mt-1 text-[#8A5A12]/85">{identityNotice.body}</p>
          </div>
        ) : isSignedIn && userBands.length > 0 ? (
          <RequestContactForm
            initiatorSide="band"
            targetVenueId={venueId}
            options={userBands}
            initialShowDate={selectedDate}
            dateFitContextByIso={dateFitContextByIso}
          />
        ) : isSignedIn && userBands.length === 0 ? (
          <p className="text-sm text-[#888888]">
            You need an artist profile to request contact.{' '}
            <Link href="/dashboard/bands/new" className="text-[#FD6A2F] hover:underline">
              Create one
            </Link>
            .
          </p>
        ) : (
          <p className="text-sm text-[#888888]">
            <Link href={`/login?redirectTo=/venues/${venueSlug}`} className="text-[#FD6A2F] hover:underline">
              Sign in
            </Link>{' '}
            to request contact.
          </p>
        )}
      </section>
    </>
  )
}
