'use client'

import Link from 'next/link'
import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { requestContact } from '@/app/actions/contact'
import { getVenueDateGenreFit } from '@/lib/venue-booking-date'
import type { ConversationSide } from '@/types/database'

type ContactOption = {
  id: string
  name: string
  genres?: string[]
}

type DateFitContext = {
  effectiveGenreFocus: string | null
  showTypeLabel?: string | null
}

interface Props {
  initiatorSide: ConversationSide
  options: ContactOption[]
  targetBandId?: string
  targetVenueId?: string
  initialShowDate?: string
  showDate?: string
  onShowDateChange?: (showDate: string) => void
  dateFitContextByIso?: Record<string, DateFitContext | undefined>
}

export function RequestContactForm({
  initiatorSide,
  options,
  targetBandId,
  targetVenueId,
  initialShowDate = '',
  showDate: controlledShowDate,
  onShowDateChange,
  dateFitContextByIso,
}: Props) {
  const router = useRouter()
  const [message, setMessage] = useState('')
  const [localShowDate, setLocalShowDate] = useState(initialShowDate)
  const [error, setError] = useState<string | null>(null)
  const [threadIdHint, setThreadIdHint] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const showDate = controlledShowDate ?? localShowDate

  const selectedOption = useMemo(
    () => options[0] ?? null,
    [options]
  )
  const currentPair = useMemo(() => {
    const bandId = initiatorSide === 'band' ? selectedOption?.id ?? '' : targetBandId ?? ''
    const venueId = initiatorSide === 'venue' ? selectedOption?.id ?? '' : targetVenueId ?? ''
    return { bandId, venueId }
  }, [initiatorSide, selectedOption?.id, targetBandId, targetVenueId])
  const dateFitContext = showDate ? dateFitContextByIso?.[showDate] : undefined
  const genreFit = useMemo(
    () =>
      initiatorSide === 'band' && selectedOption
        ? getVenueDateGenreFit({
            bandGenres: selectedOption.genres ?? [],
            effectiveGenreFocus: dateFitContext?.effectiveGenreFocus,
          })
        : null,
    [dateFitContext?.effectiveGenreFocus, initiatorSide, selectedOption]
  )

  function handleShowDateChange(nextShowDate: string) {
    if (onShowDateChange) {
      onShowDateChange(nextShowDate)
      return
    }
    setLocalShowDate(nextShowDate)
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setThreadIdHint(null)

    if (!currentPair.bandId || !currentPair.venueId) {
      setError('Please choose a valid artist or venue first.')
      return
    }

    startTransition(async () => {
      const result = await requestContact({
        bandId: currentPair.bandId,
        venueId: currentPair.venueId,
        initiatorSide,
        message,
        showDate: showDate || null,
      })

      if (result.error) {
        setError(result.error)
        setThreadIdHint(result.threadId ?? null)
        return
      }

      router.push(`/dashboard/inbox/${result.threadId}`)
      router.refresh()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {selectedOption && (
        <div className="rounded-xl border border-[#E8E8E8] bg-[#FAFAFA] px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#888888]">
            {initiatorSide === 'band' ? 'Requesting as' : 'Contacting from'}
          </p>
          <p className="mt-1 text-sm font-medium text-[#252525]">{selectedOption.name}</p>
        </div>
      )}

      <div>
        <label className="block text-sm text-[#888888] mb-1.5">Suggested date</label>
        <input
          type="date"
          value={showDate}
          onChange={(event) => handleShowDateChange(event.target.value)}
          className="w-full bg-[#F5F5F5] border border-[#E8E8E8] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#FD6A2F] transition-colors"
        />
      </div>

      {initiatorSide === 'band' && showDate && dateFitContext && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            genreFit?.tone === 'positive'
              ? 'border-[#CBEAE2] bg-[#F3FBF8] text-[#14584E]'
              : 'border-[#E8E8E8] bg-[#FAFAFA] text-[#555555]'
          }`}
        >
          <p className="font-medium">{genreFit?.title ?? 'Date context'}</p>
          <p className="mt-1 text-sm opacity-90">
            {genreFit?.body ??
              (dateFitContext.showTypeLabel
                ? `This date is currently shaping into a ${dateFitContext.showTypeLabel.toLowerCase()} kind of night.`
                : 'This date is open, but there is not much genre context on it yet.')}
          </p>
        </div>
      )}

      <div>
        <label className="block text-sm text-[#888888] mb-1.5">Intro note</label>
        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          rows={4}
          required
          placeholder="Say hello, share why you think this is a good fit, and start the conversation."
          className="w-full bg-[#F5F5F5] border border-[#E8E8E8] rounded-lg px-3 py-2.5 text-sm placeholder-[#AAAAAA] focus:outline-none focus:border-[#FD6A2F] transition-colors resize-none"
        />
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <p>{error}</p>
          {threadIdHint && (
            <Link href={`/dashboard/inbox/${threadIdHint}`} className="inline-block mt-2 text-red-800 hover:underline">
              Open inbox thread
            </Link>
          )}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full bg-[#FD6A2F] text-white font-semibold rounded-lg py-2.5 text-sm hover:bg-[#E55A22] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? 'Sending...' : 'Request contact'}
      </button>
    </form>
  )
}
