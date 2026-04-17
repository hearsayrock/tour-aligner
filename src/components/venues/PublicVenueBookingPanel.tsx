'use client'

import Link from 'next/link'
import { useState } from 'react'
import { RequestContactForm } from '@/components/contact/RequestContactForm'
import { VenueAvailabilityCalendar } from '@/components/venues/VenueAvailabilityCalendar'
import type { Booking, VenueBookingDate } from '@/types/database'

type ContactOption = {
  id: string
  name: string
}

export function PublicVenueBookingPanel({
  todayIso,
  bookingDates,
  bookings,
  venueId,
  venueSlug,
  userBands,
  isSignedIn,
}: {
  todayIso: string
  bookingDates: Array<Pick<VenueBookingDate, 'id' | 'show_date' | 'bill_cap' | 'is_closed_to_more_bands'>>
  bookings: Array<Pick<Booking, 'venue_booking_date_id' | 'status'>>
  venueId: string
  venueSlug: string
  userBands: ContactOption[]
  isSignedIn: boolean
}) {
  const [selectedDate, setSelectedDate] = useState(todayIso)

  return (
    <>
      <div className="border-t border-[#E8E8E8] pt-8 mb-10">
        <VenueAvailabilityCalendar
          todayIso={todayIso}
          bookingDates={bookingDates}
          bookings={bookings}
          title="Calendar"
          intro="Here’s this venue’s current availability for the next six months. Open dates can still take bookings, partially filled dates still have room on the bill, and full dates are capped."
          selectedDate={selectedDate}
          onDateSelect={setSelectedDate}
          monthCount={6}
        />
      </div>

      <section className="border-t border-[#E8E8E8] pt-8 mb-8">
        <h2 className="text-xs font-semibold text-[#888888] uppercase tracking-widest mb-4">
          Request contact
        </h2>

        {isSignedIn && userBands.length > 0 ? (
          <RequestContactForm
            initiatorSide="band"
            targetVenueId={venueId}
            options={userBands}
            initialShowDate={selectedDate}
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
