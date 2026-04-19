'use client'

import { useState } from 'react'
import { VenueAvailabilityManager } from '@/components/venues/VenueAvailabilityManager'
import { VenueEditForm } from '@/components/venues/VenueEditForm'
import type { Booking, Genre, Venue, VenueBookingDate } from '@/types/database'

type VenueEditTab = 'calendar' | 'info'

export function VenueEditTabs({
  venue,
  genres,
  selectedGenreIds,
  todayIso,
  bookingDates,
  bookings,
  automatedGenreFocusByBookingDateId,
}: {
  venue: Venue
  genres: Genre[]
  selectedGenreIds: string[]
  todayIso: string
  bookingDates: Array<Pick<VenueBookingDate, 'id' | 'show_date' | 'bill_cap' | 'is_closed_to_more_bands' | 'is_unavailable' | 'show_type' | 'genre_focus'>>
  bookings: Array<Pick<Booking, 'venue_booking_date_id' | 'status'>>
  automatedGenreFocusByBookingDateId: Record<string, string | null>
}) {
  const [activeTab, setActiveTab] = useState<VenueEditTab>('calendar')

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#252525]">Edit {venue.name}</h1>
      </div>

      <div className="mb-8 flex gap-1 border-b border-[#E8E8E8]">
        {([
          { id: 'calendar', label: 'Calendar' },
          { id: 'info', label: 'Venue Info' },
        ] as { id: VenueEditTab; label: string }[]).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'border-[#FD6A2F] text-[#252525]'
                : 'border-transparent text-[#888888] hover:text-[#252525]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'calendar' && (
        <VenueAvailabilityManager
          venueId={venue.id}
          venueSlug={venue.slug}
          defaultBillCap={venue.default_bill_cap}
          todayIso={todayIso}
          bookingDates={bookingDates}
          bookings={bookings}
          automatedGenreFocusByBookingDateId={automatedGenreFocusByBookingDateId}
          showHeader={false}
        />
      )}

      {activeTab === 'info' && (
        <div className="flex justify-center">
          <VenueEditForm
            venue={venue}
            genres={genres}
            selectedGenreIds={selectedGenreIds}
            showHeader={false}
            className="w-full max-w-2xl px-0 py-0 space-y-12"
          />
        </div>
      )}
    </div>
  )
}
