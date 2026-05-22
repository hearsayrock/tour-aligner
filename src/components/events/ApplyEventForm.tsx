'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { applyToEvent, updateMembershipStatus } from '@/app/actions/events'

type BandOption = {
  id: string
  name: string
}

type ExistingMembership = {
  id: string
  status: 'applied' | 'invited' | 'accepted' | 'declined' | 'removed' | 'removal_requested'
}

export function ApplyEventForm({
  eventId,
  bands,
  existingMembership,
  backstageHref,
}: {
  eventId: string
  bands: BandOption[]
  existingMembership?: ExistingMembership | null
  backstageHref?: string | null
}) {
  const router = useRouter()
  const [bandId, setBandId] = useState(bands[0]?.id ?? '')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [isPending, startTransition] = useTransition()

  if (existingMembership?.status === 'accepted' || existingMembership?.status === 'removal_requested') {
    return (
      <div className="rounded-2xl border border-[#CBEAE2] bg-[#F3FBF8] p-5">
        <p className="text-sm font-semibold text-[#14584E]">You are in Backstage for this event.</p>
        {backstageHref && (
          <Link href={backstageHref} className="mt-3 inline-block text-sm font-medium text-[#0C7C71] hover:underline">
            Open Backstage
          </Link>
        )}
      </div>
    )
  }

  if (existingMembership?.status === 'applied') {
    return (
      <div className="rounded-2xl border border-[#F2D7A6] bg-[#FFF7E8] p-5 text-sm text-[#8A5A12]">
        Your application is waiting for the venue.
      </div>
    )
  }

  if (existingMembership?.status === 'invited') {
    return (
      <div className="rounded-2xl border border-[#F2D7A6] bg-[#FFF7E8] p-5">
        <p className="text-sm font-semibold text-[#8A5A12]">This venue invited you to Backstage.</p>
        <button
          type="button"
          onClick={() => {
            setError(null)
            startTransition(async () => {
              const result = await updateMembershipStatus({ membershipId: existingMembership.id, status: 'accepted' })
              if (result.error) {
                setError(result.error)
                return
              }
              router.push(backstageHref ?? '/dashboard/backstage')
              router.refresh()
            })
          }}
          disabled={isPending}
          className="mt-3 rounded-xl bg-[#FD6A2F] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {isPending ? 'Accepting...' : 'Accept invite'}
        </button>
        {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
      </div>
    )
  }

  if (bands.length === 0) {
    return (
      <p className="text-sm text-[#888888]">
        Create an artist profile before applying.{' '}
        <Link href="/dashboard/bands/new" className="text-[#FD6A2F] hover:underline">
          Add artist
        </Link>
      </p>
    )
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSent(false)

    startTransition(async () => {
      const result = await applyToEvent({ eventId, bandId, note })
      if (result.error) {
        setError(result.error)
        return
      }
      setSent(true)
      setNote('')
      router.refresh()
    })
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="mb-1.5 block text-sm text-[#777777]">Applying as</label>
        <select value={bandId} onChange={(event) => setBandId(event.target.value)} className="w-full rounded-xl border border-[#E8E8E8] bg-[#F5F5F5] px-3 py-2.5 text-sm focus:outline-none focus:border-[#FD6A2F]">
          {bands.map((band) => (
            <option key={band.id} value={band.id}>{band.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1.5 block text-sm text-[#777777]">Application note</label>
        <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={4} required placeholder="Tell the venue why this artist fits the event." className="w-full resize-none rounded-xl border border-[#E8E8E8] bg-[#F5F5F5] px-3 py-2.5 text-sm focus:outline-none focus:border-[#FD6A2F]" />
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      {sent && <p className="text-sm text-[#0C7C71]">Application sent.</p>}
      <button type="submit" disabled={isPending || !bandId} className="w-full rounded-xl bg-[#FD6A2F] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
        {isPending ? 'Applying...' : 'Apply to Event'}
      </button>
    </form>
  )
}
