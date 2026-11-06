'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { LinkifiedText } from '@/components/contact/LinkifiedText'
import { buttonBaseClass } from '@/components/ui/primitives'
import { applyToEvent, updateMembershipStatus } from '@/app/actions/events'
import type { EventArtistMembership } from '@/types/database'

type BandOption = {
  id: string
  name: string
}

type ExistingMembership = Pick<EventArtistMembership, 'id' | 'status' | 'source' | 'invitation_note'>

export function ApplyEventForm({
  eventId,
  bands,
  existingMembership,
  declineHref,
}: {
  eventId: string
  bands: BandOption[]
  existingMembership?: ExistingMembership | null
  declineHref?: string
}) {
  const router = useRouter()
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [isPending, startTransition] = useTransition()
  const bandId = bands[0]?.id ?? ''

  if (existingMembership?.status === 'applied') {
    return (
      <div className="rounded-2xl border border-[#F2D7A6] bg-[#FFF7E8] p-5 text-sm text-[#8A5A12]">
        Your application is waiting for the venue.
      </div>
    )
  }

  if (existingMembership?.status === 'invited') {
    const membershipId = existingMembership.id

    function respond(status: 'accepted' | 'declined') {
      setError(null)
      startTransition(async () => {
        const result = await updateMembershipStatus({ membershipId, status })
        if (result.error) {
          setError(result.error)
          return
        }
        if (status === 'declined' && declineHref) router.replace(declineHref)
        router.refresh()
      })
    }

    return (
      <div className="rounded-2xl border border-[#F2D7A6] bg-[#FFF7E8] p-4">
        <p className="text-sm text-[#755021]">This venue invited you to Backstage. Chat opens once you accept.</p>
        {existingMembership.invitation_note && (
          <LinkifiedText text={existingMembership.invitation_note} className="mt-3 whitespace-pre-wrap break-words text-sm text-[#252525]" />
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={() => respond('accepted')} disabled={isPending} className={buttonBaseClass('primary')}>
            Accept invite
          </button>
          <button type="button" onClick={() => respond('declined')} disabled={isPending} className={buttonBaseClass('secondary')}>
            Decline
          </button>
        </div>
        {error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}
      </div>
    )
  }

  if (existingMembership?.status === 'declined') {
    return (
      <p className="text-sm text-[#666666]">
        {existingMembership.source === 'invitation' ? 'Invitation declined.' : 'Application declined.'}
      </p>
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
