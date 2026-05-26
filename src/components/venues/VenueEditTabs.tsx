'use client'

import { useState } from 'react'
import { CalendarRange, Info } from 'lucide-react'
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
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <div className="mb-6">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#A24A22]">Venue workspace</p>
        <h1 className="text-3xl font-bold tracking-tight text-[#181818]">Edit {venue.name}</h1>
      </div>

      <div className="mb-8 inline-flex rounded-2xl border border-[#E6E6E6] bg-white p-1 shadow-[0_12px_28px_rgba(20,20,20,0.035)]">
        {([
          { id: 'calendar', label: 'Calendar', icon: CalendarRange },
          { id: 'info', label: 'Venue Info', icon: Info },
        ] as { id: VenueEditTab; label: string; icon: typeof CalendarRange }[]).map((tab) => {
          const Icon = tab.icon
          return (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`inline-flex min-h-10 items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
              activeTab === tab.id
                ? 'bg-[#252525] text-white'
                : 'text-[#777777] hover:bg-[#F5F5F5] hover:text-[#252525]'
            }`}
          >
            <Icon className="h-4 w-4" />
            {tab.label}
          </button>
          )
        })}
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
            className="w-full max-w-3xl px-0 py-0 space-y-6"
          />
        </div>
      )}
    </div>
  )
}
