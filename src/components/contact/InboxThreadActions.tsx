'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  blockContactThread,
  requestContact,
  respondToContactRequest,
  unblockContactThread,
} from '@/app/actions/contact'
import type { ContactThreadStatus, ConversationSide } from '@/types/database'

interface Props {
  threadId: string
  bandId: string
  venueId: string
  status: ContactThreadStatus
  viewerSide: ConversationSide
  requestedBySide: ConversationSide | null
  blockedBySide: ConversationSide | null
}

export function InboxThreadActions({
  threadId,
  bandId,
  venueId,
  status,
  viewerSide,
  requestedBySide,
  blockedBySide,
}: Props) {
  const router = useRouter()
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [confirmBlock, setConfirmBlock] = useState(false)
  const [isPending, startTransition] = useTransition()

  const isIncomingPending = status === 'pending' && requestedBySide !== viewerSide
  const isOutgoingPending = status === 'pending' && requestedBySide === viewerSide
  const canUnblock = status === 'blocked' && blockedBySide === viewerSide

  const bannerText = useMemo(() => {
    if (status === 'accepted') return 'This conversation is active.'
    if (isIncomingPending) return 'This contact request is waiting for your response.'
    if (isOutgoingPending) return 'Your contact request is pending.'
    if (status === 'declined') return 'This request was declined. You can send a new request when you are ready.'
    if (canUnblock) return 'You blocked this contact. Unblock to allow future requests or messages.'
    if (status === 'blocked') return 'This conversation is blocked.'
    return ''
  }, [canUnblock, isIncomingPending, isOutgoingPending, status])

  function runAction(task: () => Promise<{ error?: string }>) {
    setError(null)

    startTransition(async () => {
      const result = await task()

      if (result.error) {
        setError(result.error)
        return
      }

      setNote('')
      setConfirmBlock(false)
      router.refresh()
    })
  }

  return (
    <div className="space-y-4">
      {bannerText && (
        <div className="rounded-xl border border-[#E8E8E8] bg-[#FAFAFA] px-4 py-3 text-sm text-[#666666]">
          {bannerText}
        </div>
      )}

      {isIncomingPending && (
        <div className="space-y-3">
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={3}
            placeholder="Optional note"
            className="w-full bg-[#F5F5F5] border border-[#E8E8E8] rounded-xl px-4 py-3 text-sm placeholder-[#AAAAAA] focus:outline-none focus:border-[#FD6A2F] transition-colors resize-none"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => runAction(() => respondToContactRequest(threadId, 'accept', note))}
              disabled={isPending}
              className="bg-[#FD6A2F] text-white font-semibold rounded-lg px-4 py-2 text-sm hover:bg-[#E55A22] transition-colors disabled:opacity-50"
            >
              Accept
            </button>
            <button
              type="button"
              onClick={() => runAction(() => respondToContactRequest(threadId, 'decline_retry_later', note))}
              disabled={isPending}
              className="bg-[#F5F5F5] border border-[#E8E8E8] text-[#555555] font-medium rounded-lg px-4 py-2 text-sm hover:border-[#CCCCCC] transition-colors disabled:opacity-50"
            >
              Decline for now
            </button>
            <button
              type="button"
              onClick={() => runAction(() => respondToContactRequest(threadId, 'decline_and_block', note))}
              disabled={isPending}
              className="bg-red-50 border border-red-200 text-red-600 font-medium rounded-lg px-4 py-2 text-sm hover:bg-red-100 transition-colors disabled:opacity-50"
            >
              Decline and block
            </button>
          </div>
        </div>
      )}

      {status === 'declined' && (
        <div className="space-y-3">
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={3}
            placeholder="Send a new intro note to reopen this conversation"
            className="w-full bg-[#F5F5F5] border border-[#E8E8E8] rounded-xl px-4 py-3 text-sm placeholder-[#AAAAAA] focus:outline-none focus:border-[#FD6A2F] transition-colors resize-none"
          />
          <button
            type="button"
            onClick={() =>
              runAction(() =>
                requestContact({
                  bandId,
                  venueId,
                  initiatorSide: viewerSide,
                  message: note,
                })
              )
            }
            disabled={isPending || !note.trim()}
            className="bg-[#FD6A2F] text-white font-semibold rounded-lg px-4 py-2 text-sm hover:bg-[#E55A22] transition-colors disabled:opacity-50"
          >
            Send new request
          </button>
        </div>
      )}

      {status === 'accepted' && (
        <div className="space-y-3">
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={3}
            placeholder="Optional note before you block this conversation"
            className="w-full bg-[#F5F5F5] border border-[#E8E8E8] rounded-xl px-4 py-3 text-sm placeholder-[#AAAAAA] focus:outline-none focus:border-[#FD6A2F] transition-colors resize-none"
          />
          {confirmBlock ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => runAction(() => blockContactThread(threadId, note))}
                disabled={isPending}
                className="bg-red-50 border border-red-200 text-red-600 font-medium rounded-lg px-4 py-2 text-sm hover:bg-red-100 transition-colors disabled:opacity-50"
              >
                Confirm block
              </button>
              <button
                type="button"
                onClick={() => setConfirmBlock(false)}
                disabled={isPending}
                className="text-sm text-[#777777] hover:text-[#252525] transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmBlock(true)}
              className="bg-red-50 border border-red-200 text-red-600 font-medium rounded-lg px-4 py-2 text-sm hover:bg-red-100 transition-colors"
            >
              Block contact
            </button>
          )}
        </div>
      )}

      {canUnblock && (
        <button
          type="button"
          onClick={() => runAction(() => unblockContactThread(threadId))}
          disabled={isPending}
          className="bg-[#252525] text-white font-semibold rounded-lg px-4 py-2 text-sm hover:bg-[#111111] transition-colors disabled:opacity-50"
        >
          Unblock contact
        </button>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  )
}
