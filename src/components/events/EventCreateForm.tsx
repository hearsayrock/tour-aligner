'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarClock, Info, SlidersHorizontal } from 'lucide-react'
import { createEvent } from '@/app/actions/events'
import { Card, SectionHeading, buttonBaseClass, inputClass, labelClass } from '@/components/ui/primitives'
import type { Genre } from '@/types/database'

type VenueOption = {
  id: string
  name: string
  capacity: number | null
}

export function EventCreateForm({
  venues,
  genres,
}: {
  venues: VenueOption[]
  genres: Genre[]
}) {
  const router = useRouter()
  const [venueId, setVenueId] = useState(venues[0]?.id ?? '')
  const [title, setTitle] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [startTime, setStartTime] = useState('20:00')
  const [attendeeCapacity, setAttendeeCapacity] = useState(String(venues[0]?.capacity ?? 100))
  const [neededArtistCount, setNeededArtistCount] = useState('3')
  const [artistNeedDescription, setArtistNeedDescription] = useState('')
  const [description, setDescription] = useState('')
  const [selectedGenres, setSelectedGenres] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function toggleGenre(id: string) {
    setSelectedGenres((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    startTransition(async () => {
      const result = await createEvent({
        venueId,
        title,
        eventDate,
        startTime,
        genreIds: Array.from(selectedGenres),
        artistNeedDescription,
        description,
        attendeeCapacity: parseInt(attendeeCapacity, 10),
        neededArtistCount: parseInt(neededArtistCount, 10),
      })

      if (result.error || !result.eventId) {
        setError(result.error ?? 'Unable to create event.')
        return
      }

      router.push(`/dashboard/backstage/${result.eventId}`)
      router.refresh()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-3xl space-y-6">
      <Card className="p-5 sm:p-6">
        <SectionHeading
          title="Core Event Details"
          description="Set the venue, date, and lineup need. You can refine the public description after the Backstage is created."
        />
        <div className="space-y-4">
          <div>
            <label className={labelClass}>Venue</label>
          <select
            value={venueId}
            onChange={(event) => {
              const nextVenue = venues.find((venue) => venue.id === event.target.value)
              setVenueId(event.target.value)
              setAttendeeCapacity(String(nextVenue?.capacity ?? 100))
            }}
            className={inputClass}
          >
            {venues.map((venue) => (
              <option key={venue.id} value={venue.id}>
                {venue.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass}>Event title</label>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Friday night indie bill"
            className={inputClass}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Event date</label>
            <input
              type="date"
              value={eventDate}
              onChange={(event) => setEventDate(event.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Show start time</label>
            <input
              type="time"
              value={startTime}
              onChange={(event) => setStartTime(event.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Attendee capacity</label>
            <input
              type="number"
              min={1}
              value={attendeeCapacity}
              onChange={(event) => setAttendeeCapacity(event.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Needed artists</label>
            <input
              type="number"
              min={1}
              value={neededArtistCount}
              onChange={(event) => setNeededArtistCount(event.target.value)}
              className={inputClass}
            />
          </div>
        </div>
        </div>
      </Card>

      <Card className="p-5 sm:p-6">
        <SectionHeading
          title="Event Fit"
          description="Genres help artists decide whether this is the right bill to apply for."
        />
        <div className="flex flex-wrap gap-2">
          {genres.map((genre) => {
            const selected = selectedGenres.has(genre.id)
            return (
              <button
                key={genre.id}
                type="button"
                onClick={() => toggleGenre(genre.id)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  selected
                    ? 'border-[#FD6A2F] bg-[#FFF3EE] text-[#A84216]'
                    : 'border-[#E8E8E8] bg-white text-[#777777] hover:border-[#CCCCCC]'
                }`}
              >
                {genre.name}
              </button>
            )
          })}
        </div>
      </Card>

      <Card className="overflow-hidden">
        <details open>
          <summary className="flex min-h-14 cursor-pointer items-center justify-between gap-3 px-5 text-sm font-semibold text-[#252525] sm:px-6">
            <span className="flex items-center gap-2">
              <Info className="h-4 w-4 text-[#FD6A2F]" />
              Artist-facing notes
            </span>
            <SlidersHorizontal className="h-4 w-4 text-[#888888]" />
          </summary>
          <div className="space-y-4 border-t border-[#EEEEEE] p-5 sm:p-6">
            <div>
              <label className={labelClass}>Artists needed</label>
              <textarea
                value={artistNeedDescription}
                onChange={(event) => setArtistNeedDescription(event.target.value)}
                rows={4}
                placeholder="Describe the sound, experience level, and fit you need for this event."
                className={`${inputClass} resize-y`}
              />
            </div>

            <div>
              <label className={labelClass}>Event description</label>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={4}
                placeholder="Tell artists what this night is, who it is for, and what kind of bill you are building."
                className={`${inputClass} resize-y`}
              />
            </div>
          </div>
        </details>
      </Card>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <button
        type="submit"
        disabled={isPending || venues.length === 0}
        className={`${buttonBaseClass('primary')} w-full`}
      >
        <CalendarClock className="h-4 w-4" />
        {isPending ? 'Creating...' : 'Create Event and Backstage'}
      </button>
    </form>
  )
}
