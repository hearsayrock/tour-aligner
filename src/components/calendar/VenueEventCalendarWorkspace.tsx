'use client'

import { useMemo, useState, type MouseEvent } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { createVenueUnavailableDates, deleteVenueUnavailableDate } from '@/app/actions/events'
import { CalendarActivityList } from '@/components/calendar/CalendarActivityList'
import { EventCreateForm } from '@/components/events/EventCreateForm'
import { Badge, buttonBaseClass, inputClass, labelClass } from '@/components/ui/primitives'
import {
  buildVenueEventActivity,
  eventStatusTone,
  type CalendarEventRecord,
} from '@/lib/calendar-activity'
import { getAcceptedMemberships } from '@/lib/events'
import type { Genre, VenueUnavailableDate } from '@/types/database'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const WEEKDAY_OPTIONS = [
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

const EVENT_PILL_STYLES = {
  default: 'border-[#E2DDD6] bg-white/90 text-[#2A2A2A]',
  muted: 'border-[#E8E8E8] bg-[#F6F6F6]/90 text-[#666666]',
  brand: 'border-[#FFD5C4] bg-[#FFF3EE]/95 text-[#A84216]',
  success: 'border-[#CBEAE2] bg-[#F3FBF8]/95 text-[#14584E]',
  warning: 'border-[#F2D7A6] bg-[#FFF7E8]/95 text-[#8A5A12]',
  danger: 'border-[#F3C6C6] bg-[#FFF1F1]/95 text-[#9D2020]',
  info: 'border-[#BFE7EF] bg-[#F1FBFD]/95 text-[#0E6275]',
}

type CalendarCell = {
  date: string
  dayOfMonth: number
  inCurrentMonth: boolean
  isToday: boolean
}

type VenueOption = {
  id: string
  name: string
  capacity: number | null
}

type RecurrenceLimitType = 'count' | 'end_date'
type CalendarAction = 'event' | 'unavailable' | null

function parseIsoDate(isoDate: string) {
  const [year, month, day] = isoDate.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

function dateFromParts(year: number, monthIndex: number, day: number) {
  return new Date(Date.UTC(year, monthIndex, day))
}

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

function addDays(date: Date, days: number) {
  const next = new Date(date.getTime())
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

function startOfWeek(date: Date) {
  return addDays(date, -date.getUTCDay())
}

function endOfWeek(date: Date) {
  return addDays(date, 6 - date.getUTCDay())
}

function monthLabel(date: Date) {
  return date.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

function buildMonths(todayIso: string, monthCount = 6) {
  const today = parseIsoDate(todayIso)
  const months: Array<{ key: string; label: string; cells: CalendarCell[] }> = []

  for (let monthOffset = 0; monthOffset < monthCount; monthOffset += 1) {
    const monthDate = dateFromParts(today.getUTCFullYear(), today.getUTCMonth() + monthOffset, 1)
    const gridStart = startOfWeek(dateFromParts(monthDate.getUTCFullYear(), monthDate.getUTCMonth(), 1))
    const gridEnd = endOfWeek(dateFromParts(monthDate.getUTCFullYear(), monthDate.getUTCMonth() + 1, 0))
    const cells: CalendarCell[] = []

    for (let cursor = gridStart; cursor <= gridEnd; cursor = addDays(cursor, 1)) {
      const iso = toIsoDate(cursor)
      cells.push({
        date: iso,
        dayOfMonth: cursor.getUTCDate(),
        inCurrentMonth: cursor.getUTCMonth() === monthDate.getUTCMonth(),
        isToday: iso === todayIso,
      })
    }

    months.push({
      key: `${monthDate.getUTCFullYear()}-${monthDate.getUTCMonth()}`,
      label: monthLabel(monthDate),
      cells,
    })
  }

  return months
}

function formatSelectedDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function weekdayFromIso(isoDate: string) {
  return parseIsoDate(isoDate).getUTCDay()
}

function formatShortDate(isoDate: string) {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

function buildDateRange(startIso: string, endIso: string) {
  const startDate = parseIsoDate(startIso)
  const endDate = parseIsoDate(endIso)
  const [first, last] = startDate <= endDate ? [startDate, endDate] : [endDate, startDate]
  const dates: string[] = []

  for (let cursor = first; cursor <= last; cursor = addDays(cursor, 1)) {
    dates.push(toIsoDate(cursor))
  }

  return dates
}

function generatePreviewDates(args: {
  startDate: string
  recurrenceEnabled: boolean
  weekdays: number[]
  limitType: RecurrenceLimitType
  occurrenceCount: string
  endDate: string
}) {
  if (!args.startDate) return []
  const startDate = parseIsoDate(args.startDate)
  if (!args.recurrenceEnabled) return [args.startDate]

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

  if (!args.endDate) return []
  const endDate = parseIsoDate(args.endDate)
  if (endDate < startDate) return []

  const dates: string[] = []
  for (let cursor = startDate; cursor <= endDate && dates.length < MAX_PREVIEW_DATES; cursor = addDays(cursor, 1)) {
    if (weekdays.includes(cursor.getUTCDay())) dates.push(toIsoDate(cursor))
  }
  return dates
}

function EventSummaryPill({ event }: { event: CalendarEventRecord }) {
  const memberships = event.event_artist_memberships ?? []
  const acceptedCount = getAcceptedMemberships(memberships).length
  const tone = eventStatusTone(event.status)

  return (
    <span
      className={`flex min-h-6 w-full min-w-0 items-center justify-between gap-1 rounded-md border px-1 py-0.5 text-[9px] font-semibold shadow-[0_8px_16px_rgba(17,17,17,0.04)] sm:text-[10px] ${EVENT_PILL_STYLES[tone]}`}
      title={event.title}
    >
      <span className="truncate">{event.title}</span>
      <span className="shrink-0 rounded-sm bg-white/65 px-1 text-[8px] text-current/75 sm:text-[9px]">
        {acceptedCount}/{event.needed_artist_count}
      </span>
    </span>
  )
}

function DayCell({
  day,
  events,
  unavailableDate,
  isSelected,
  isEventDraftSelected,
  onSelect,
}: {
  day: CalendarCell
  events: CalendarEventRecord[]
  unavailableDate?: VenueUnavailableDate
  isSelected: boolean
  isEventDraftSelected: boolean
  onSelect: (date: string, event: MouseEvent<HTMLButtonElement>) => void
}) {
  const isUnavailable = !!unavailableDate
  const selectionStyles = isSelected
    ? 'border-[#252525] ring-2 ring-[#252525]/70 shadow-[0_22px_38px_rgba(17,17,17,0.14)]'
    : isEventDraftSelected
      ? 'border-[#FD6A2F] ring-2 ring-[#FD6A2F]/35 shadow-[0_18px_30px_rgba(253,106,47,0.1)]'
    : day.isToday
      ? 'border-[#252525]/65 ring-1 ring-[#252525]/45 shadow-[0_18px_30px_rgba(17,17,17,0.08)]'
      : 'shadow-[0_14px_28px_rgba(17,17,17,0.05)]'

  return (
    <button
      type="button"
      onClick={(event) => onSelect(day.date, event)}
      className={`relative w-full overflow-hidden rounded-[24px] border p-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_24px_40px_rgba(17,17,17,0.1)] sm:min-h-[136px] sm:p-3.5 ${
        isUnavailable
          ? 'border-[#DCDCDC] bg-[linear-gradient(180deg,#F8F8F8_0%,#F1F1F1_100%)] text-[#666666]'
          : 'border-[#E9E0D6] bg-[linear-gradient(180deg,#FFFDFB_0%,#FFFFFF_100%)] text-[#231F1B]'
      } ${
        day.inCurrentMonth ? '' : 'opacity-45'
      } ${selectionStyles}`}
      aria-pressed={isSelected}
    >
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-x-0 top-0 h-16 bg-[linear-gradient(180deg,rgba(255,255,255,0.85),rgba(255,255,255,0))] ${
          day.inCurrentMonth ? 'opacity-100' : 'opacity-70'
        }`}
      />

      <div className="relative flex h-full flex-col">
        <div className="flex items-start justify-between gap-2">
          <span className={`text-base font-semibold leading-none sm:text-lg ${day.isToday ? 'text-[#A24A22]' : ''}`}>
            {day.dayOfMonth}
          </span>
        </div>

        {isUnavailable && (
          <div className="mt-3">
            <span className="inline-flex min-h-7 rounded-full border border-[#D2D2D2] bg-white/75 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#666666]">
              Unavailable
            </span>
          </div>
        )}

        {events.length > 0 && (
          <div className="-mx-2 mt-3 space-y-1.5 sm:-mx-2.5">
            {events.slice(0, 2).map((event) => (
              <EventSummaryPill key={event.id} event={event} />
            ))}
            {events.length > 2 && (
              <span className="flex w-full rounded-md border border-[#E8E0D7] bg-white/80 px-1 py-0.5 text-[9px] font-semibold text-[#6E655D] sm:text-[10px]">
                +{events.length - 2} more
              </span>
            )}
          </div>
        )}
      </div>
    </button>
  )
}

function MarkUnavailableForm({
  venueId,
  selectedDate,
  selectedUnavailableDate,
  existingEvents,
  unavailableDates,
}: {
  venueId: string
  selectedDate: string
  selectedUnavailableDate?: VenueUnavailableDate
  existingEvents: Array<{ event_date: string; title: string }>
  unavailableDates: VenueUnavailableDate[]
}) {
  const router = useRouter()
  const [reason, setReason] = useState('')
  const [recurrenceEnabled, setRecurrenceEnabled] = useState(false)
  const [recurrenceWeekdays, setRecurrenceWeekdays] = useState<Set<number>>(() => new Set([weekdayFromIso(selectedDate)]))
  const [recurrenceLimitType, setRecurrenceLimitType] = useState<RecurrenceLimitType>('count')
  const [recurrenceCount, setRecurrenceCount] = useState(DEFAULT_RECURRENCE_COUNT)
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useState(false)
  const eventDates = useMemo(() => new Map(existingEvents.map((event) => [event.event_date, event.title])), [existingEvents])
  const unavailableDateSet = useMemo(
    () => new Set(unavailableDates.map((date) => date.unavailable_date)),
    [unavailableDates]
  )
  const previewDates = useMemo(
    () =>
      generatePreviewDates({
        startDate: selectedDate,
        recurrenceEnabled,
        weekdays: Array.from(recurrenceWeekdays),
        limitType: recurrenceLimitType,
        occurrenceCount: recurrenceCount,
        endDate: recurrenceEndDate,
      }),
    [selectedDate, recurrenceEnabled, recurrenceWeekdays, recurrenceLimitType, recurrenceCount, recurrenceEndDate]
  )
  const eventConflicts = previewDates.filter((date) => eventDates.has(date))
  const alreadyUnavailableCount = previewDates.filter((date) => unavailableDateSet.has(date) && date !== selectedDate).length

  function toggleWeekday(id: number) {
    setRecurrenceWeekdays((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  if (selectedUnavailableDate) {
    return (
      <div className="rounded-[24px] border border-[#DCDCDC] bg-[#F7F7F7] p-4">
        <p className="text-sm font-semibold text-[#252525]">This date is unavailable.</p>
        {selectedUnavailableDate.reason && (
          <p className="mt-2 text-sm leading-6 text-[#666666]">{selectedUnavailableDate.reason}</p>
        )}
        <button
          type="button"
          disabled={isPending}
          onClick={() => {
            setError(null)
            setMessage(null)
            startTransition(true)
            deleteVenueUnavailableDate({ unavailableDateId: selectedUnavailableDate.id })
              .then((result) => {
                if (result.error) {
                  setError(result.error)
                  return
                }
                setMessage('Date is available again.')
                router.refresh()
              })
              .finally(() => startTransition(false))
          }}
          className={`${buttonBaseClass('secondary')} mt-4 w-full`}
        >
          {isPending ? 'Updating...' : 'Mark this date available'}
        </button>
        {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
        {message && <p className="mt-2 text-sm text-[#0C7C71]">{message}</p>}
      </div>
    )
  }

  return (
    <div className="rounded-[24px] border border-[#E8E0D7] bg-white/85 p-4">
      <div className="space-y-4">
        <label className="block">
          <span className={labelClass}>Reason</span>
          <input
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Private event, dark night, maintenance..."
            className={inputClass}
          />
        </label>

        <label className="flex items-center gap-3 rounded-2xl border border-[#E8E8E8] bg-[#FAFAFA] px-4 py-3 text-sm font-semibold text-[#252525]">
          <input
            type="checkbox"
            checked={recurrenceEnabled}
            onChange={(event) => setRecurrenceEnabled(event.target.checked)}
          />
          Repeat weekly
        </label>

        {recurrenceEnabled && (
          <>
            <div>
              <p className={labelClass}>Weekdays</p>
              <div className="flex flex-wrap gap-2">
                {WEEKDAY_OPTIONS.map((weekday) => {
                  const selected = recurrenceWeekdays.has(weekday.value)
                  return (
                    <button
                      key={weekday.value}
                      type="button"
                      onClick={() => toggleWeekday(weekday.value)}
                      title={weekday.label}
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                        selected
                          ? 'border-[#666666] bg-[#F1F1F1] text-[#252525]'
                          : 'border-[#E8E8E8] bg-white text-[#777777] hover:border-[#CCCCCC]'
                      }`}
                    >
                      {weekday.short}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
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
          </>
        )}

        {previewDates.length > 0 && (
          <div className="rounded-2xl border border-[#EAE1D7] bg-[#FAFAFA] p-3 text-xs text-[#666666]">
            <p className="font-semibold text-[#252525]">
              {previewDates.length} date{previewDates.length === 1 ? '' : 's'}: {previewDates.slice(0, 8).map(formatShortDate).join(', ')}
              {previewDates.length > 8 ? `, +${previewDates.length - 8} more` : ''}
            </p>
            {eventConflicts.length > 0 && (
              <p className="mt-2 text-[#A84216]">
                {eventConflicts.length} selected date{eventConflicts.length === 1 ? '' : 's'} already have Events.
              </p>
            )}
            {alreadyUnavailableCount > 0 && (
              <p className="mt-2 text-[#666666]">
                {alreadyUnavailableCount} selected date{alreadyUnavailableCount === 1 ? ' is' : 's are'} already unavailable.
              </p>
            )}
          </div>
        )}

        <button
          type="button"
          disabled={isPending || eventConflicts.length > 0}
          onClick={() => {
            setError(null)
            setMessage(null)
            startTransition(true)
            createVenueUnavailableDates({
              venueId,
              startDate: selectedDate,
              reason,
              recurrence: recurrenceEnabled
                ? {
                    weekdays: Array.from(recurrenceWeekdays),
                    limitType: recurrenceLimitType,
                    occurrenceCount: recurrenceLimitType === 'count' ? parseInt(recurrenceCount, 10) : null,
                    endDate: recurrenceLimitType === 'end_date' ? recurrenceEndDate : null,
                  }
                : null,
            })
              .then((result) => {
                if (result.error) {
                  setError(result.error)
                  return
                }
                setMessage(`Marked ${result.createdCount ?? 1} date${result.createdCount === 1 ? '' : 's'} unavailable.`)
                router.refresh()
              })
              .finally(() => startTransition(false))
          }}
          className={`${buttonBaseClass('secondary')} w-full`}
        >
          {isPending ? 'Marking...' : recurrenceEnabled ? 'Mark dates unavailable' : 'Mark date unavailable'}
        </button>
        {error && <p className="text-sm text-red-500">{error}</p>}
        {message && <p className="text-sm text-[#0C7C71]">{message}</p>}
      </div>
    </div>
  )
}

export function VenueEventCalendarWorkspace({
  todayIso,
  venue,
  genres,
  events,
  unavailableDates,
  monthCount = 6,
}: {
  todayIso: string
  venue: VenueOption
  genres: Genre[]
  events: CalendarEventRecord[]
  unavailableDates: VenueUnavailableDate[]
  monthCount?: number
}) {
  const [selectedDate, setSelectedDate] = useState(todayIso)
  const [activeAction, setActiveAction] = useState<CalendarAction>(null)
  const [eventDraftDates, setEventDraftDates] = useState<string[]>([todayIso])
  const [eventSelectionAnchor, setEventSelectionAnchor] = useState(todayIso)
  const months = useMemo(() => buildMonths(todayIso, monthCount), [todayIso, monthCount])
  const [visibleMonthIndex, setVisibleMonthIndex] = useState(0)
  const visibleMonth = months[visibleMonthIndex]
  const eventsByDate = useMemo(() => {
    const grouped: Record<string, CalendarEventRecord[]> = {}
    for (const event of events) {
      grouped[event.event_date] = [...(grouped[event.event_date] ?? []), event]
    }
    return grouped
  }, [events])
  const selectedEvents = eventsByDate[selectedDate] ?? []
  const selectedActivities = selectedEvents.map((event) => buildVenueEventActivity(event))
  const existingEvents = events.map((event) => ({ event_date: event.event_date, title: event.title }))
  const unavailableDatesByDate = useMemo(
    () => new Map(unavailableDates.map((date) => [date.unavailable_date, date])),
    [unavailableDates]
  )
  const selectedUnavailableDate = unavailableDatesByDate.get(selectedDate)

  function jumpToToday() {
    setVisibleMonthIndex(0)
    setSelectedDate(todayIso)
    setActiveAction(null)
    setEventDraftDates([todayIso])
    setEventSelectionAnchor(todayIso)
  }

  function selectDate(date: string, event?: MouseEvent<HTMLButtonElement>) {
    setSelectedDate(date)

    if (activeAction !== 'event') {
      setActiveAction(null)
      setEventDraftDates([date])
      setEventSelectionAnchor(date)
      return
    }

    if (event?.shiftKey) {
      const range = buildDateRange(eventSelectionAnchor, date)
      setEventDraftDates((current) => Array.from(new Set([...current, ...range])).sort())
      return
    }

    if (event?.ctrlKey || event?.metaKey) {
      setEventDraftDates((current) => {
        if (current.includes(date) && current.length > 1) {
          return current.filter((eventDate) => eventDate !== date)
        }

        return Array.from(new Set([...current, date])).sort()
      })
      setEventSelectionAnchor(date)
      return
    }

    setEventDraftDates([date])
    setEventSelectionAnchor(date)
  }

  function toggleEventAction() {
    if (activeAction === 'event') {
      setActiveAction(null)
      return
    }

    setEventDraftDates((currentDates) => (
      currentDates.includes(selectedDate) ? currentDates : [selectedDate]
    ))
    setEventSelectionAnchor(selectedDate)
    setActiveAction('event')
  }

  return (
    <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_340px] 2xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="rounded-[28px] border border-[#E6DED3] bg-[linear-gradient(180deg,#FFF8F2_0%,#FAFAF8_38%,#FFFFFF_100%)] p-3 shadow-[0_24px_60px_rgba(17,17,17,0.06)] sm:p-4">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#A24A22] shadow-[0_10px_22px_rgba(17,17,17,0.04)]">
              <CalendarDays className="h-3.5 w-3.5" />
              Event Calendar
            </div>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6E655D]">
              Events and Backstages drive this calendar. Artist cap, genres, status, and application settings live on each Event.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Badge tone="warning">Draft</Badge>
            <Badge tone="success">Active</Badge>
            <Badge tone="danger">Cancelled</Badge>
          </div>
        </div>

        {visibleMonth && (
          <div className="rounded-[24px] border border-white/80 bg-white/82 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_18px_44px_rgba(17,17,17,0.05)] backdrop-blur-sm sm:p-4">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={jumpToToday}
                className="rounded-full border border-[#E6DED3] bg-white px-3 py-1.5 text-xs font-semibold text-[#252525] shadow-[0_10px_20px_rgba(17,17,17,0.04)] transition-all hover:-translate-y-0.5 hover:border-[#D8CCBD] hover:bg-[#FFF8F2]"
              >
                Today
              </button>
              <div className="flex items-center gap-1 rounded-full border border-[#ECE4DA] bg-[#FBF7F2] p-1">
                <button
                  type="button"
                  onClick={() => setVisibleMonthIndex((current) => Math.max(0, current - 1))}
                  disabled={visibleMonthIndex === 0}
                  aria-label="Previous month"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[#666666] transition-colors hover:bg-white hover:text-[#252525] disabled:cursor-not-allowed disabled:opacity-35"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <div className="min-w-[10rem] px-3 text-center">
                  <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[#9B8F82]">Showing</p>
                  <h3 className="mt-1 text-base font-semibold tracking-tight text-[#252525]">{visibleMonth.label}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setVisibleMonthIndex((current) => Math.min(months.length - 1, current + 1))}
                  disabled={visibleMonthIndex === months.length - 1}
                  aria-label="Next month"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[#666666] transition-colors hover:bg-white hover:text-[#252525] disabled:cursor-not-allowed disabled:opacity-35"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="mb-3 grid grid-cols-7 gap-2 sm:gap-3">
              {WEEKDAYS.map((weekday) => (
                <div key={weekday} className="px-1 text-center text-[10px] font-semibold uppercase tracking-[0.22em] text-[#AA9D90] sm:px-2 sm:text-[11px]">
                  {weekday}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-2 sm:gap-3">
              {visibleMonth.cells.map((day) => (
                <DayCell
                  key={day.date}
                  day={day}
                  events={eventsByDate[day.date] ?? []}
                  unavailableDate={unavailableDatesByDate.get(day.date)}
                  isSelected={selectedDate === day.date}
                  isEventDraftSelected={activeAction === 'event' && eventDraftDates.includes(day.date)}
                  onSelect={selectDate}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <aside className="space-y-4 xl:sticky xl:top-8 xl:self-start">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#E8DED2] bg-white/85 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8C7D6F]">
            Selected date
          </div>
          <h3 className="mt-4 text-xl font-semibold tracking-tight text-[#252525]">{formatSelectedDate(selectedDate)}</h3>
        </div>

        <div>
          <p className="mb-3 text-sm font-semibold text-[#252525]">Events</p>
          <CalendarActivityList
            items={selectedActivities}
            emptyMessage="No Events are attached to this date yet."
          />
        </div>

        <div>
          <p className="mb-3 text-sm font-semibold text-[#252525]">Actions</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              disabled={!!selectedUnavailableDate}
              onClick={toggleEventAction}
              className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition-colors ${
                activeAction === 'event'
                  ? 'border-[#FD6A2F] bg-[#FFF3EE] text-[#A84216]'
                  : 'border-[#E8E0D7] bg-white text-[#252525] hover:border-[#D8CCBD]'
              } disabled:cursor-not-allowed disabled:bg-[#F4F4F4] disabled:text-[#999999]`}
            >
              Create Event
            </button>
            <button
              type="button"
              onClick={() => setActiveAction((current) => (current === 'unavailable' ? null : 'unavailable'))}
              className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition-colors ${
                activeAction === 'unavailable'
                  ? 'border-[#D2D2D2] bg-[#F1F1F1] text-[#252525]'
                  : 'border-[#E8E0D7] bg-white text-[#252525] hover:border-[#D8CCBD]'
              }`}
            >
              {selectedUnavailableDate ? 'Edit Availability' : 'Mark Unavailable'}
            </button>
          </div>
          {selectedUnavailableDate && (
            <p className="mt-2 rounded-2xl border border-[#DCDCDC] bg-[#F7F7F7] px-3 py-2 text-xs font-medium text-[#666666]">
              This date is unavailable. Events cannot be created until it is marked available.
            </p>
          )}
        </div>

        {activeAction === 'unavailable' && (
          <MarkUnavailableForm
            key={`unavailable-${venue.id}-${selectedDate}-${selectedUnavailableDate?.id ?? 'open'}`}
            venueId={venue.id}
            selectedDate={selectedDate}
            selectedUnavailableDate={selectedUnavailableDate}
            existingEvents={existingEvents}
            unavailableDates={unavailableDates}
          />
        )}

        {activeAction === 'event' && !selectedUnavailableDate && (
          <EventCreateForm
            key={`event-${venue.id}`}
            venues={[venue]}
            genres={genres}
            initialVenueId={venue.id}
            initialEventDate={eventDraftDates[0] ?? selectedDate}
            selectedEventDates={eventDraftDates}
            lockVenue
            mode="inline"
            existingEvents={existingEvents}
          />
        )}
      </aside>
    </section>
  )
}
