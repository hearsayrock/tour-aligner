'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { buttonBaseClass, inputClass, labelClass } from '@/components/ui/primitives'
import {
  inviteArtistToEvent,
  sendBackstageMessage,
  updateEventLogistics,
  updateEventSettings,
  updateMembershipStatus,
} from '@/app/actions/events'
import type { Event, EventArtistMembership, Genre } from '@/types/database'

type BandOption = {
  id: string
  name: string
}

export function BackstageComposer({
  eventId,
  bandId,
  replyingAs,
}: {
  eventId: string
  bandId?: string | null
  replyingAs: string
}) {
  const router = useRouter()
  const [message, setMessage] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    startTransition(async () => {
      const result = await sendBackstageMessage({ eventId, bandId, body: message })
      if (result.error) {
        setError(result.error)
        return
      }
      setMessage('')
      router.refresh()
    })
  }

  return (
    <form onSubmit={submit} className="space-y-2">
      <div className="rounded-2xl border border-[#E8E8E8] bg-white p-3 shadow-[0_12px_28px_rgba(20,20,20,0.035)]">
        <p className="mb-2 px-1 text-xs font-medium text-[#888888]">Posting as {replyingAs}</p>
        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          rows={3}
          placeholder="Message Backstage..."
          className="w-full resize-none border-0 bg-transparent px-1 py-1 text-sm placeholder-[#AAAAAA] focus:outline-none"
        />
        <div className="mt-2 flex justify-end">
          <button
            type="submit"
            disabled={isPending || !message.trim()}
            className={`${buttonBaseClass('primary')} min-h-9 rounded-full px-4 py-1.5`}
          >
            {isPending ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </form>
  )
}

export function BackstageSettingsForm({
  event,
  genres,
  selectedGenreIds,
}: {
  event: Event
  genres: Genre[]
  selectedGenreIds: string[]
}) {
  const router = useRouter()
  const [title, setTitle] = useState(event.title)
  const [eventDate, setEventDate] = useState(event.event_date)
  const [startTime, setStartTime] = useState(event.start_time.slice(0, 5))
  const [artistNeedDescription, setArtistNeedDescription] = useState(event.artist_need_description)
  const [description, setDescription] = useState(event.description)
  const [attendeeCapacity, setAttendeeCapacity] = useState(String(event.attendee_capacity))
  const [neededArtistCount, setNeededArtistCount] = useState(String(event.needed_artist_count))
  const [isPublic, setIsPublic] = useState(event.is_public)
  const [isAcceptingArtists, setIsAcceptingArtists] = useState(event.is_accepting_artists)
  const [lineupPublished, setLineupPublished] = useState(event.lineup_published)
  const [status, setStatus] = useState<Event['status']>(event.status)
  const [selectedGenres, setSelectedGenres] = useState<Set<string>>(new Set(selectedGenreIds))
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [isPending, startTransition] = useTransition()

  function toggleGenre(id: string) {
    setSelectedGenres((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function submit(formEvent: React.FormEvent<HTMLFormElement>) {
    formEvent.preventDefault()
    setError(null)
    setSaved(false)

    startTransition(async () => {
      const result = await updateEventSettings({
        eventId: event.id,
        title,
        eventDate,
        startTime,
        artistNeedDescription,
        description,
        attendeeCapacity: parseInt(attendeeCapacity, 10),
        neededArtistCount: parseInt(neededArtistCount, 10),
        isPublic,
        isAcceptingArtists,
        status,
        lineupPublished,
        genreIds: Array.from(selectedGenres),
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
    <form onSubmit={submit} className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className={labelClass}>Title</span>
          <input value={title} onChange={(event) => setTitle(event.target.value)} className={inputClass} />
        </label>
        <label className="block">
          <span className={labelClass}>Status</span>
          <select value={status} onChange={(event) => setStatus(event.target.value as Event['status'])} className={inputClass}>
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className={labelClass}>Date</span>
          <input type="date" value={eventDate} onChange={(event) => setEventDate(event.target.value)} className={inputClass} />
        </label>
        <label className="block">
          <span className={labelClass}>Show start</span>
          <input type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} className={inputClass} />
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className={labelClass}>Capacity</span>
          <input type="number" min={1} value={attendeeCapacity} onChange={(event) => setAttendeeCapacity(event.target.value)} className={inputClass} />
        </label>
        <label className="block">
          <span className={labelClass}>Needed artists</span>
          <input type="number" min={1} value={neededArtistCount} onChange={(event) => setNeededArtistCount(event.target.value)} className={inputClass} />
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        {genres.map((genre) => {
          const selected = selectedGenres.has(genre.id)
          return (
            <button
              key={genre.id}
              type="button"
              onClick={() => toggleGenre(genre.id)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium ${selected ? 'border-[#FD6A2F] bg-[#FFF3EE]' : 'border-[#E8E8E8] bg-white text-[#777777]'}`}
            >
              {genre.name}
            </button>
          )
        })}
      </div>

      <label className="block">
        <span className={labelClass}>Artists needed</span>
        <textarea value={artistNeedDescription} onChange={(event) => setArtistNeedDescription(event.target.value)} rows={3} className={`${inputClass} resize-y`} />
      </label>
      <label className="block">
        <span className={labelClass}>Event description</span>
        <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} className={`${inputClass} resize-y`} />
      </label>

      <div className="grid gap-2 sm:grid-cols-3">
        <label className="flex items-center gap-2 rounded-xl border border-[#E8E8E8] bg-[#FAFAFA] px-3 py-2.5 text-sm">
          <input type="checkbox" checked={isPublic} onChange={(event) => setIsPublic(event.target.checked)} />
          Public
        </label>
        <label className="flex items-center gap-2 rounded-xl border border-[#E8E8E8] bg-[#FAFAFA] px-3 py-2.5 text-sm">
          <input type="checkbox" checked={isAcceptingArtists} onChange={(event) => setIsAcceptingArtists(event.target.checked)} />
          Accepting artists
        </label>
        <label className="flex items-center gap-2 rounded-xl border border-[#E8E8E8] bg-[#FAFAFA] px-3 py-2.5 text-sm">
          <input type="checkbox" checked={lineupPublished} onChange={(event) => setLineupPublished(event.target.checked)} />
          Publish lineup
        </label>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}
      {saved && <p className="text-sm text-[#0C7C71]">Event saved.</p>}
      <button type="submit" disabled={isPending} className={buttonBaseClass('primary')}>
        {isPending ? 'Saving...' : 'Save event'}
      </button>
    </form>
  )
}

export function BackstageLogisticsForm({ event }: { event: Event }) {
  const router = useRouter()
  const [loadIn, setLoadIn] = useState(event.logistics_load_in ?? '')
  const [soundcheck, setSoundcheck] = useState(event.logistics_soundcheck ?? '')
  const [setTimes, setSetTimes] = useState(event.logistics_set_times ?? '')
  const [backline, setBackline] = useState(event.logistics_backline ?? '')
  const [artistShouldBring, setArtistShouldBring] = useState(event.logistics_artist_should_bring ?? '')
  const [parkingAccess, setParkingAccess] = useState(event.logistics_parking_access ?? '')
  const [notes, setNotes] = useState(event.logistics_notes ?? '')
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [isPending, startTransition] = useTransition()

  function submit(formEvent: React.FormEvent<HTMLFormElement>) {
    formEvent.preventDefault()
    setError(null)
    setSaved(false)

    startTransition(async () => {
      const result = await updateEventLogistics({
        eventId: event.id,
        loadIn,
        soundcheck,
        setTimes,
        backline,
        artistShouldBring,
        parkingAccess,
        notes,
      })

      if (result.error) {
        setError(result.error)
        return
      }
      setSaved(true)
      router.refresh()
    })
  }

  const fields = [
    ['Load-in', loadIn, setLoadIn],
    ['Soundcheck', soundcheck, setSoundcheck],
    ['Set times', setTimes, setSetTimes],
    ['Backline / gear', backline, setBackline],
    ['Artists should bring', artistShouldBring, setArtistShouldBring],
    ['Parking / access', parkingAccess, setParkingAccess],
    ['General notes', notes, setNotes],
  ] as const

  return (
    <form onSubmit={submit} className="space-y-4">
      {fields.map(([label, value, setter]) => (
        <label key={label} className="block">
          <span className={labelClass}>{label}</span>
          <textarea
            value={value}
            onChange={(event) => setter(event.target.value)}
            rows={2}
            className={`${inputClass} resize-y`}
          />
        </label>
      ))}
      {error && <p className="text-sm text-red-500">{error}</p>}
      {saved && <p className="text-sm text-[#0C7C71]">Logistics saved.</p>}
      <button type="submit" disabled={isPending} className={buttonBaseClass('dark')}>
        {isPending ? 'Saving...' : 'Save logistics'}
      </button>
    </form>
  )
}

export function MembershipActionButton({
  membershipId,
  status,
  label,
  note,
}: {
  membershipId: string
  status: EventArtistMembership['status']
  label: string
  note?: string
}) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  return (
    <div>
      <button
        type="button"
        onClick={() => {
          setError(null)
          startTransition(async () => {
            const result = await updateMembershipStatus({ membershipId, status, note })
            if (result.error) {
              setError(result.error)
              return
            }
            router.refresh()
          })
        }}
        disabled={isPending}
        className={`${buttonBaseClass('secondary')} min-h-9 rounded-lg px-3 py-1.5`}
      >
        {isPending ? 'Working...' : label}
      </button>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  )
}

export function InviteArtistForm({
  eventId,
  bands,
}: {
  eventId: string
  bands: BandOption[]
}) {
  const router = useRouter()
  const [bandId, setBandId] = useState(bands[0]?.id ?? '')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [isPending, startTransition] = useTransition()

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSent(false)

    startTransition(async () => {
      const result = await inviteArtistToEvent({ eventId, bandId, note })
      if (result.error) {
        setError(result.error)
        return
      }
      setSent(true)
      setNote('')
      router.refresh()
    })
  }

  if (bands.length === 0) {
    return <p className="text-sm text-[#888888]">No artists are available to invite.</p>
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <select value={bandId} onChange={(event) => setBandId(event.target.value)} className={inputClass}>
        {bands.map((band) => (
          <option key={band.id} value={band.id}>{band.name}</option>
        ))}
      </select>
      <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} placeholder="Optional invite note" className={`${inputClass} resize-y`} />
      {error && <p className="text-sm text-red-500">{error}</p>}
      {sent && <p className="text-sm text-[#0C7C71]">Invite sent.</p>}
      <button type="submit" disabled={isPending || !bandId} className={buttonBaseClass('primary')}>
        {isPending ? 'Sending...' : 'Invite artist'}
      </button>
    </form>
  )
}
