'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { ArrowRight, CalendarDays, CheckCircle2 } from 'lucide-react'
import { PrivateChatRequestButton } from '@/components/private-chat/PrivateChatRequestButton'
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
  venueName,
  userBands,
  isSignedIn,
  initialSelectedDate,
  identityNotice,
  existingBooking,
  activeBandName,
}: {
  todayIso: string
  bookingDates: Array<Pick<VenueBookingDate, 'id' | 'show_date' | 'bill_cap' | 'is_closed_to_more_bands' | 'is_unavailable' | 'show_type' | 'genre_focus'>>
  bookings: Array<Pick<Booking, 'venue_booking_date_id' | 'status'>>
  automatedGenreFocusByBookingDateId: Record<string, string | null>
  defaultBillCap: number
  venueId: string
  venueSlug: string
  venueName: string
  userBands: ContactOption[]
  isSignedIn: boolean
  initialSelectedDate?: string
  identityNotice?: { title: string; body: string } | null
  existingBooking?: { eventId: string; showDate: string } | null
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
      <section className="rounded-[28px] border border-border bg-white p-6 shadow-[0_18px_42px_rgba(17,17,17,0.05)] sm:p-8">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-text">Availability</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-ink-black">Booking calendar</h2>
          </div>
          <div className="inline-flex min-h-10 items-center gap-2 rounded-full border border-border bg-page px-3 text-xs font-semibold text-text-secondary">
            <CalendarDays className="h-4 w-4 text-brand-text" />
            Next six months
          </div>
        </div>

        <VenueAvailabilityCalendar
          todayIso={todayIso}
          bookingDates={bookingDates}
          bookings={bookings}
          defaultBillCap={defaultBillCap}
          automatedGenreFocusByBookingDateId={automatedGenreFocusByBookingDateId}
          title="Calendar"
          intro="Open dates can still take bookings, partially filled dates still have room on the bill, and full dates are capped."
          selectedDate={selectedDate}
          onDateSelect={setSelectedDate}
          monthCount={6}
        />

        <div className="mt-6 border-t border-border pt-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted">
            Selected date
          </p>
          <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-ink">
                {new Date(`${selectedDate}T00:00:00`).toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })}
              </h3>
              <p className="mt-1 text-sm text-text-secondary">{selectedHeadline}</p>
            </div>
            {selectedStatus !== 'unavailable' && (
              <div className="rounded-xl border border-border bg-page px-4 py-3 text-sm text-ink">
                <p>
                  {selectedCount}/{selectedBillCap} filled
                </p>
              </div>
            )}
          </div>
          <p className="mt-3 text-sm text-text-secondary">{selectedDescription}</p>

          {(selectedShowType || selectedGenreFocus) && (
            <div className="mt-4 flex flex-wrap gap-2">
              {selectedShowType && (
                <span className="rounded-full border border-border bg-page px-3 py-1 text-xs font-medium text-text-secondary">
                  {selectedShowType}
                </span>
              )}
              {selectedGenreFocus && (
                <span className="rounded-full border border-border bg-page px-3 py-1 text-xs font-medium text-text-secondary">
                  {selectedGenreFocus}
                </span>
              )}
            </div>
          )}

          {selectedStatus !== 'full' && selectedStatus !== 'unavailable' && (
            <p className="mt-4 text-sm text-text-secondary">
              Message the venue below and mention the date you have in mind.
            </p>
          )}
        </div>
      </section>

      <section className="rounded-[28px] border border-border bg-white p-6 shadow-[0_18px_42px_rgba(17,17,17,0.05)] sm:p-8">
        <div className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-text">
            Private chat
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-ink-black">Start the booking conversation</h2>
        </div>

        {isSignedIn && existingBooking && (
          <div className="mb-4 rounded-xl border border-success-border bg-success-tint px-4 py-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-success-text">
              <CheckCircle2 className="h-4 w-4" />
              {activeBandName} is playing here on {formatDateShort(existingBooking.showDate)}
            </p>
            <Link href={`/dashboard/backstage/${existingBooking.eventId}`} className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-success hover:underline">
              Open backstage<ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        )}
        {isSignedIn && identityNotice ? (
          <div className="rounded-xl border border-warning-border bg-warning-tint px-4 py-3 text-sm">
            <p className="font-semibold text-warning-text">{identityNotice.title}</p>
            <p className="mt-1 text-warning-text/85">{identityNotice.body}</p>
          </div>
        ) : isSignedIn && userBands.length > 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-text-secondary">Discuss dates in a private chat. Confirmed show details and lineup changes are managed in Backstage.</p>
            <PrivateChatRequestButton
              senderIdentity={{ kind: 'band', id: userBands[0].id, name: userBands[0].name, href: `/dashboard/bands/${userBands[0].id}/edit` }}
              targetKind="venue" targetId={venueId} targetName={venueName} buttonLabel="Message venue"
            />
          </div>
        ) : isSignedIn && userBands.length === 0 ? (
          <p className="text-sm text-muted">
            You need an artist profile to message this venue.{' '}
            <Link href="/dashboard/bands/new" className="text-brand-text hover:underline">
              Create one
            </Link>
            .
          </p>
        ) : (
          <p className="text-sm text-muted">
            <Link href={`/login?redirectTo=/venues/${venueSlug}`} className="text-brand-text hover:underline">
              Sign in
            </Link>{' '}
            to message this venue.
          </p>
        )}
      </section>
    </>
  )
}
