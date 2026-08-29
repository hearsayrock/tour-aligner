'use client'

import Link from 'next/link'
import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarClock, Info, Repeat2, SlidersHorizontal } from 'lucide-react'
import { createEvent } from '@/app/actions/events'
import { Card, SectionHeading, buttonBaseClass, inputClass, labelClass } from '@/components/ui/primitives'
import type { Genre } from '@/types/database'

type VenueOption = {
  id: string
  name: string
  capacity: number | null
}

type ExistingEventSummary = {
  event_date: string
  title: string
}

type CreateMode = 'redirect' | 'inline'
type RecurrenceLimitType = 'count' | 'end_date'

const WEEKDAYS = [
  { value: 0, short: 'Sun', label: 'Sunday' },
  { value: 1, short: 'Mon', label: 'Monday' },
  { value: 2, short: 'Tue', label: 'Tuesday' },
  { value: 3, short: 'Wed', label: 'Wednesday' },
  { value: 4, short: 'Thu', label: 'Thursday' },
  { value: 5, short: 'Fri', label: 'Friday' },
  { value: 6, short: 'Sat', label: 'Saturday' },
]
const DEFAULT_RECURRENCE_COUNT = '12'
const MAX_PREVIEW_DATES = 104

function parseIsoDate(isoDate: string) {
  const [year, month, day] = isoDate.split('-').map(Number)
  if (!year || !month || !day) return null
  const date = new Date(Date.UTC(year, month - 1, day))

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null
  }

  return date
}

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

function addDays(date: Date, days: number) {
  const next = new Date(date.getTime())
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

function weekdayFromIso(isoDate: string) {
  return parseIsoDate(isoDate)?.getUTCDay() ?? null
}

function formatShortDate(isoDate: string) {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

function generatePreviewDates(args: {
  eventDate: string
  selectedEventDates?: string[]
  recurrenceEnabled: boolean
  weekdays: number[]
  limitType: RecurrenceLimitType
  occurrenceCount: string
  endDate: string
}) {
  const startDate = parseIsoDate(args.eventDate)
  if (!startDate) return []
  if (!args.recurrenceEnabled) {
    return Array.from(new Set(args.selectedEventDates?.length ? args.selectedEventDates : [args.eventDate])).sort()
  }

  const weekdays = Array.from(new Set(args.weekdays)).sort((a, b) => a - b)
  if (weekdays.length === 0) return []

  if (args.limitType === 'count') {
    const count = parseInt(args.occurrenceCount, 10)
    if (!Number.isInteger(count) || count < 1) return []

    const dates: string[] = []
    for (let cursor = startDate; dates.length < Math.min(count, MAX_PREVIEW_DATES); cursor = addDays(cursor, 1)) {
      if (weekdays.includes(cursor.getUTCDay())) dates.push(toIsoDate(cursor))
    }
    return dates
  }

  const endDate = parseIsoDate(args.endDate)
  if (!endDate || endDate < startDate) return []

  const dates: string[] = []
  for (let cursor = startDate; cursor <= endDate && dates.length < MAX_PREVIEW_DATES; cursor = addDays(cursor, 1)) {
    if (weekdays.includes(cursor.getUTCDay())) dates.push(toIsoDate(cursor))
  }
  return dates
}

export function EventCreateForm({
  venues,
  genres,
  initialVenueId,
  initialEventDate = '',
  selectedEventDates,
  lockVenue = false,
  mode = 'redirect',
  existingEvents = [],
  onCreated,
}: {
  venues: VenueOption[]
  genres: Genre[]
  initialVenueId?: string
  initialEventDate?: string
  selectedEventDates?: string[]
  lockVenue?: boolean
  mode?: CreateMode
  existingEvents?: ExistingEventSummary[]
  onCreated?: () => void
}) {
  const router = useRouter()
  const initialVenue = venues.find((venue) => venue.id === initialVenueId) ?? venues[0]
  const [venueId, setVenueId] = useState(initialVenue?.id ?? '')
  const [title, setTitle] = useState('')
  const [eventDate, setEventDate] = useState(initialEventDate)
  const [startTime, setStartTime] = useState('20:00')
  const [attendeeCapacity, setAttendeeCapacity] = useState(String(initialVenue?.capacity ?? 100))
  const [neededArtistCount, setNeededArtistCount] = useState('3')
  const [artistNeedDescription, setArtistNeedDescription] = useState('')
  const [description, setDescription] = useState('')
  const [selectedGenres, setSelectedGenres] = useState<Set<string>>(new Set())
  const [recurrenceEnabled, setRecurrenceEnabled] = useState(false)
  const [recurrenceWeekdays, setRecurrenceWeekdays] = useState<Set<number>>(
    () => new Set(initialEventDate ? [weekdayFromIso(initialEventDate)].filter((value): value is number => value !== null) : [])
  )
  const [recurrenceLimitType, setRecurrenceLimitType] = useState<RecurrenceLimitType>('count')
  const [recurrenceCount, setRecurrenceCount] = useState(DEFAULT_RECURRENCE_COUNT)
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('')
  const [createdResult, setCreatedResult] = useState<{ eventId: string; createdCount: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const controlledEventDates = selectedEventDates?.length ? selectedEventDates : null
  const effectiveEventDate = controlledEventDates?.[0] ?? eventDate

  const previewDates = useMemo(
    () =>
      generatePreviewDates({
        eventDate: effectiveEventDate,
        selectedEventDates: controlledEventDates ?? undefined,
        recurrenceEnabled,
        weekdays: Array.from(recurrenceWeekdays),
        limitType: recurrenceLimitType,
        occurrenceCount: recurrenceCount,
        endDate: recurrenceEndDate,
      }),
    [effectiveEventDate, controlledEventDates, recurrenceEnabled, recurrenceWeekdays, recurrenceLimitType, recurrenceCount, recurrenceEndDate]
  )
  const existingEventsByDate = useMemo(() => {
    const grouped = new Map<string, ExistingEventSummary[]>()
    for (const event of existingEvents) {
      grouped.set(event.event_date, [...(grouped.get(event.event_date) ?? []), event])
    }
    return grouped
  }, [existingEvents])
  const overlappingEvents = previewDates.flatMap((date) => existingEventsByDate.get(date) ?? [])

  function updateEventDate(value: string) {
    setEventDate(value)
    const weekday = weekdayFromIso(value)
    if (weekday !== null) setRecurrenceWeekdays(new Set([weekday]))
  }

  function toggleGenre(id: string) {
    setSelectedGenres((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleWeekday(id: number) {
    setRecurrenceWeekdays((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setCreatedResult(null)

    startTransition(async () => {
      const result = await createEvent({
        venueId,
        title,
        eventDate: effectiveEventDate,
        eventDates: recurrenceEnabled ? undefined : previewDates,
        startTime,
        genreIds: Array.from(selectedGenres),
        artistNeedDescription,
        description,
        attendeeCapacity: parseInt(attendeeCapacity, 10),
        neededArtistCount: parseInt(neededArtistCount, 10),
        recurrence: recurrenceEnabled
          ? {
              weekdays: Array.from(recurrenceWeekdays),
              limitType: recurrenceLimitType,
              occurrenceCount: recurrenceLimitType === 'count' ? parseInt(recurrenceCount, 10) : null,
              endDate: recurrenceLimitType === 'end_date' ? recurrenceEndDate : null,
            }
          : null,
      })

      if (result.error || !result.eventId) {
        setError(result.error ?? 'Unable to create event.')
        return
      }

      const createdCount = result.createdCount ?? result.eventIds?.length ?? 1
      if (mode === 'redirect' && createdCount === 1) {
        router.push(`/dashboard/backstage/${result.eventId}`)
        router.refresh()
        return
      }

      setCreatedResult({ eventId: result.eventId, createdCount })
      onCreated?.()
      router.refresh()
    })
  }

  return (
    <form onSubmit={handleSubmit} className={mode === 'inline' ? 'space-y-5' : 'mx-auto max-w-3xl space-y-6'}>
      <Card className="p-5 sm:p-6">
        <SectionHeading
          title="Core Event Details"
          description="Set the venue, date, and lineup need. TourAligner creates the Backstage automatically."
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
              disabled={lockVenue}
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
              <label className={labelClass}>{controlledEventDates ? 'Primary date' : 'Event date'}</label>
              <input
                type="date"
                value={effectiveEventDate}
                onChange={(event) => updateEventDate(event.target.value)}
                disabled={!!controlledEventDates}
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
              <label className={labelClass}>Artist cap</label>
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
          title="Recurring Schedule"
          description="Create linked weekly Event occurrences with one Backstage per date."
        />
        <label className="mb-4 flex items-center gap-3 rounded-2xl border border-[#E8E8E8] bg-[#FAFAFA] px-4 py-3 text-sm font-semibold text-[#252525]">
          <input
            type="checkbox"
            checked={recurrenceEnabled}
            onChange={(event) => setRecurrenceEnabled(event.target.checked)}
          />
          <Repeat2 className="h-4 w-4 text-[#FD6A2F]" />
          Repeat weekly
        </label>
        {controlledEventDates && !recurrenceEnabled && (
          <p className="-mt-2 mb-4 rounded-2xl border border-[#EAE1D7] bg-[#FAFAFA] px-3 py-2 text-xs leading-5 text-[#666666]">
            Calendar selection controls these dates. Use Ctrl/Cmd-click to add individual dates or Shift-click to add a range.
          </p>
        )}

        {recurrenceEnabled && (
          <div className="space-y-4">
            <div>
              <p className={labelClass}>Weekdays</p>
              <div className="flex flex-wrap gap-2">
                {WEEKDAYS.map((weekday) => {
                  const selected = recurrenceWeekdays.has(weekday.value)
                  return (
                    <button
                      key={weekday.value}
                      type="button"
                      onClick={() => toggleWeekday(weekday.value)}
                      title={weekday.label}
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                        selected
                          ? 'border-[#FD6A2F] bg-[#FFF3EE] text-[#A84216]'
                          : 'border-[#E8E8E8] bg-white text-[#777777] hover:border-[#CCCCCC]'
                      }`}
                    >
                      {weekday.short}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)]">
              <label className="block">
                <span className={labelClass}>Limit by</span>
                <select
                  value={recurrenceLimitType}
                  onChange={(event) => setRecurrenceLimitType(event.target.value as RecurrenceLimitType)}
                  className={inputClass}
                >
                  <option value="count">Occurrence count</option>
                  <option value="end_date">End date</option>
                </select>
              </label>
              {recurrenceLimitType === 'count' ? (
                <label className="block">
                  <span className={labelClass}>Occurrences</span>
                  <input
                    type="number"
                    min={1}
                    max={MAX_PREVIEW_DATES}
                    value={recurrenceCount}
                    onChange={(event) => setRecurrenceCount(event.target.value)}
                    className={inputClass}
                  />
                </label>
              ) : (
                <label className="block">
                  <span className={labelClass}>End date</span>
                  <input
                    type="date"
                    value={recurrenceEndDate}
                    onChange={(event) => setRecurrenceEndDate(event.target.value)}
                    className={inputClass}
                  />
                </label>
              )}
            </div>
          </div>
        )}

        {previewDates.length > 0 && (
          <div className="mt-4 rounded-2xl border border-[#EAE1D7] bg-white/80 p-3 text-xs text-[#666666]">
            <p className="font-semibold text-[#252525]">
              {previewDates.length} Event{previewDates.length === 1 ? '' : 's'}: {previewDates.slice(0, 8).map(formatShortDate).join(', ')}
              {previewDates.length > 8 ? `, +${previewDates.length - 8} more` : ''}
            </p>
            {overlappingEvents.length > 0 && (
              <p className="mt-2 text-[#A84216]">
                {overlappingEvents.length} selected date{overlappingEvents.length === 1 ? '' : 's'} already have Events.
              </p>
            )}
          </div>
        )}
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
        <details open={mode !== 'inline'}>
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
      {createdResult && (
        <div className="rounded-2xl border border-[#CBEAE2] bg-[#F3FBF8] px-4 py-3 text-sm text-[#14584E]">
          <p className="font-semibold">
            Created {createdResult.createdCount} Event{createdResult.createdCount === 1 ? '' : 's'}.
          </p>
          <Link href={`/dashboard/backstage/${createdResult.eventId}`} className="mt-1 inline-flex font-semibold underline">
            Open first Backstage
          </Link>
        </div>
      )}

      <button
        type="submit"
        disabled={isPending || venues.length === 0}
        className={`${buttonBaseClass('primary')} w-full`}
      >
        <CalendarClock className="h-4 w-4" />
        {isPending ? 'Creating...' : recurrenceEnabled ? 'Create Event series' : 'Create Event and Backstage'}
      </button>
    </form>
  )
}
