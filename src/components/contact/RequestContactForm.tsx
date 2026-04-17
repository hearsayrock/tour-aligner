'use client'

import Link from 'next/link'
import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { requestContact } from '@/app/actions/contact'
import type { ConversationSide } from '@/types/database'

type ContactOption = {
  id: string
  name: string
}

interface Props {
  initiatorSide: ConversationSide
  options: ContactOption[]
  targetBandId?: string
  targetVenueId?: string
}

export function RequestContactForm({
  initiatorSide,
  options,
  targetBandId,
  targetVenueId,
}: Props) {
  const router = useRouter()
  const [selectedId, setSelectedId] = useState(options[0]?.id ?? '')
  const [message, setMessage] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [threadIdHint, setThreadIdHint] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const currentPair = useMemo(() => {
    const bandId = initiatorSide === 'band' ? selectedId : targetBandId ?? ''
    const venueId = initiatorSide === 'venue' ? selectedId : targetVenueId ?? ''
    return { bandId, venueId }
  }, [initiatorSide, selectedId, targetBandId, targetVenueId])

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
