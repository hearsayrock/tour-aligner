'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { requestContact } from '@/app/actions/contact'
import type { ContactThreadStatus, ConversationSide } from '@/types/database'

type ContactOption = {
  id: string
  name: string
}

type ExistingThread = {
  id: string
  band_id: string
  venue_id: string
  status: ContactThreadStatus
  requested_by_side: ConversationSide | null
  blocked_by_side: ConversationSide | null
}

interface Props {
  initiatorSide: ConversationSide
  options: ContactOption[]
  targetBandId?: string
  targetVenueId?: string
  existingThreads: ExistingThread[]
}

export function RequestContactForm({
  initiatorSide,
  options,
  targetBandId,
  targetVenueId,
  existingThreads,
}: Props) {
  const router = useRouter()
  const [selectedId, setSelectedId] = useState(options[0]?.id ?? '')
  const [message, setMessage] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const currentPair = useMemo(() => {
    const bandId = initiatorSide === 'band' ? selectedId : targetBandId ?? ''
    const venueId = initiatorSide === 'venue' ? selectedId : targetVenueId ?? ''
    return { bandId, venueId }
  }, [initiatorSide, selectedId, targetBandId, targetVenueId])

  const activeThread = useMemo(
    () =>
      existingThreads.find(
        (thread) =>
          thread.band_id === currentPair.bandId &&
          thread.venue_id === currentPair.venueId
      ) ?? null,
    [currentPair.bandId, currentPair.venueId, existingThreads]
  )

  const inboxHref = activeThread ? `/dashboard/inbox/${activeThread.id}` : '/dashboard/inbox'

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

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
      })

      if (result.error) {
        setError(result.error)
        return
      }

      router.push(`/dashboard/inbox/${result.threadId}`)
      router.refresh()
    })
  }

  const helperMessage = (() => {
    if (!activeThread) return null

    if (activeThread.status === 'accepted') {
      return {
        tone: 'success',
        text: 'You already have an active conversation here.',
      }
    }

    if (activeThread.status === 'pending') {
      return {
        tone: 'muted',
        text:
          activeThread.requested_by_side === initiatorSide
            ? 'Your contact request is pending.'
            : 'You already have an incoming contact request from this profile.',
      }
    }

    if (activeThread.status === 'blocked') {
      return {
        tone: 'danger',
        text:
          activeThread.blocked_by_side === initiatorSide
            ? 'You blocked this contact. Manage it from your inbox.'
            : 'This contact is currently blocked.',
      }
    }

    return {
      tone: 'muted',
      text: 'This conversation was previously declined. You can send a new request.',
    }
  })()

  const disableComposer =
    activeThread?.status === 'accepted' ||
    activeThread?.status === 'pending' ||
    activeThread?.status === 'blocked'

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {options.length > 1 && (
        <div>
          <label className="block text-sm text-[#888888] mb-1.5">
            {initiatorSide === 'band' ? 'Requesting as' : 'Contacting from'}
          </label>
          <select
            value={selectedId}
            onChange={(event) => setSelectedId(event.target.value)}
            className="w-full bg-[#F5F5F5] border border-[#E8E8E8] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#FD6A2F] transition-colors"
          >
            {options.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {helperMessage && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            helperMessage.tone === 'success'
              ? 'border-[#00bba5]/20 bg-[#00bba5]/5 text-[#0c7c71]'
              : helperMessage.tone === 'danger'
                ? 'border-red-200 bg-red-50 text-red-700'
                : 'border-[#E8E8E8] bg-[#F9F9F9] text-[#666666]'
          }`}
        >
          <p>{helperMessage.text}</p>
          {activeThread && (
            <a href={inboxHref} className="inline-block mt-2 text-[#252525] hover:underline">
              Open inbox thread
            </a>
          )}
        </div>
      )}

      {!disableComposer && (
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
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}

      {disableComposer ? (
        <a
          href={inboxHref}
          className="inline-flex items-center justify-center w-full bg-[#252525] text-white font-semibold rounded-lg py-2.5 text-sm hover:bg-[#111111] transition-colors"
        >
          Open inbox
        </a>
      ) : (
        <button
          type="submit"
          disabled={isPending}
          className="w-full bg-[#FD6A2F] text-white font-semibold rounded-lg py-2.5 text-sm hover:bg-[#E55A22] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? 'Sending...' : 'Request contact'}
        </button>
      )}
    </form>
  )
}
