'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createEvent } from '@/app/actions/events'
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
    <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-8">
      <section className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm text-[#777777]">Venue</label>
          <select
            value={venueId}
            onChange={(event) => {
              const nextVenue = venues.find((venue) => venue.id === event.target.value)
              setVenueId(event.target.value)
              setAttendeeCapacity(String(nextVenue?.capacity ?? 100))
            }}
            className="w-full rounded-xl border border-[#E8E8E8] bg-[#F5F5F5] px-4 py-3 text-sm focus:outline-none focus:border-[#FD6A2F]"
          >
            {venues.map((venue) => (
              <option key={venue.id} value={venue.id}>
                {venue.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-sm text-[#777777]">Event title</label>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Friday night indie bill"
            className="w-full rounded-xl border border-[#E8E8E8] bg-[#F5F5F5] px-4 py-3 text-sm focus:outline-none focus:border-[#FD6A2F]"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm text-[#777777]">Event date</label>
            <input
              type="date"
              value={eventDate}
              onChange={(event) => setEventDate(event.target.value)}
              className="w-full rounded-xl border border-[#E8E8E8] bg-[#F5F5F5] px-4 py-3 text-sm focus:outline-none focus:border-[#FD6A2F]"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-[#777777]">Show start time</label>
            <input
              type="time"
              value={startTime}
              onChange={(event) => setStartTime(event.target.value)}
              className="w-full rounded-xl border border-[#E8E8E8] bg-[#F5F5F5] px-4 py-3 text-sm focus:outline-none focus:border-[#FD6A2F]"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm text-[#777777]">Attendee capacity</label>
            <input
              type="number"
              min={1}
              value={attendeeCapacity}
              onChange={(event) => setAttendeeCapacity(event.target.value)}
              className="w-full rounded-xl border border-[#E8E8E8] bg-[#F5F5F5] px-4 py-3 text-sm focus:outline-none focus:border-[#FD6A2F]"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-[#777777]">Needed artists</label>
            <input
              type="number"
              min={1}
              value={neededArtistCount}
              onChange={(event) => setNeededArtistCount(event.target.value)}
              className="w-full rounded-xl border border-[#E8E8E8] bg-[#F5F5F5] px-4 py-3 text-sm focus:outline-none focus:border-[#FD6A2F]"
            />
          </div>
        </div>
      </section>

      <section>
        <p className="mb-3 text-sm text-[#777777]">Event genres</p>
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
                    ? 'border-[#FD6A2F] bg-[#FFF3EE] text-[#252525]'
                    : 'border-[#E8E8E8] bg-white text-[#777777] hover:border-[#CCCCCC]'
                }`}
              >
                {genre.name}
              </button>
            )
          })}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm text-[#777777]">Artists needed</label>
          <textarea
            value={artistNeedDescription}
            onChange={(event) => setArtistNeedDescription(event.target.value)}
            rows={4}
            placeholder="Describe the sound, experience level, and fit you need for this event."
            className="w-full resize-none rounded-xl border border-[#E8E8E8] bg-[#F5F5F5] px-4 py-3 text-sm focus:outline-none focus:border-[#FD6A2F]"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm text-[#777777]">Event description</label>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={4}
            placeholder="Tell artists what this night is, who it is for, and what kind of bill you are building."
            className="w-full resize-none rounded-xl border border-[#E8E8E8] bg-[#F5F5F5] px-4 py-3 text-sm focus:outline-none focus:border-[#FD6A2F]"
          />
        </div>
      </section>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <button
        type="submit"
        disabled={isPending || venues.length === 0}
        className="w-full rounded-xl bg-[#FD6A2F] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#E55A22] disabled:opacity-50"
      >
        {isPending ? 'Creating...' : 'Create Event and Backstage'}
      </button>
    </form>
  )
}
