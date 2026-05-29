'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  archivePrivateChatThread,
  blockPrivateChatThread,
  respondToPrivateChatRequest,
  unarchivePrivateChatThread,
  unblockPrivateChatThread,
} from '@/app/actions/private-chat'
import { buttonBaseClass } from '@/components/ui/primitives'
import {
  getPrivateChatPrompt,
  isIncomingPrivateChatRequest,
  isOutgoingPrivateChatRequest,
  type InboxPrivateChatThread,
} from '@/lib/private-chat'
import type { ManagedIdentity } from '@/lib/managed-identity'

type Props = {
  thread: InboxPrivateChatThread
  actorIdentity: ManagedIdentity
  archived: boolean
}

export function PrivateChatThreadActions({ thread, actorIdentity, archived }: Props) {
  const router = useRouter()
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [blockNote, setBlockNote] = useState('')
  const [isBlockOpen, setIsBlockOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const incomingPending = isIncomingPrivateChatRequest(thread, actorIdentity)
  const outgoingPending = isOutgoingPrivateChatRequest(thread, actorIdentity)
  const canBlock = thread.status === 'accepted'
  const canUnblock =
    thread.status === 'blocked' &&
    thread.blocked_by_kind === actorIdentity.kind &&
    thread.blocked_by_id === actorIdentity.id

  function runAction(task: () => Promise<{ error?: string }>, onSuccess?: () => void) {
    setError(null)

    startTransition(async () => {
      const result = await task()

      if (result.error) {
        setError(result.error)
        return
      }

      setNote('')
      setBlockNote('')
      onSuccess?.()
      router.refresh()
    })
  }

  return (
    <div className="space-y-4">
      {incomingPending && (
        <div className="rounded-2xl border border-[#E8E8E8] bg-[#FCFCFC] p-4">
          <p className="text-sm font-medium text-[#252525]">{getPrivateChatPrompt(thread)}</p>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={3}
            placeholder="Optional note"
            className="mt-3 w-full resize-none rounded-xl border border-[#E8E8E8] bg-[#F5F5F5] px-4 py-3 text-sm placeholder-[#AAAAAA] transition-colors focus:outline-none focus:border-[#FD6A2F]"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => runAction(() => respondToPrivateChatRequest(thread.id, actorIdentity.kind, actorIdentity.id, 'accept', note))}
              disabled={isPending}
              className={buttonBaseClass('primary')}
            >
              Allow
            </button>
            <button
              type="button"
              onClick={() => runAction(() => respondToPrivateChatRequest(thread.id, actorIdentity.kind, actorIdentity.id, 'deny', note))}
              disabled={isPending}
              className={buttonBaseClass('secondary')}
            >
              Deny
            </button>
            <button
              type="button"
              onClick={() => runAction(() => respondToPrivateChatRequest(thread.id, actorIdentity.kind, actorIdentity.id, 'deny_and_block', note))}
              disabled={isPending}
              className={buttonBaseClass('danger')}
            >
              Deny and block
            </button>
          </div>
        </div>
      )}

      {outgoingPending && (
        <div className="rounded-xl border border-[#E8E8E8] bg-[#FAFAFA] px-4 py-3 text-sm text-[#666666]">
          Your private chat request is pending.
        </div>
      )}

      {thread.status === 'declined' && (
        <div className="rounded-xl border border-[#E8E8E8] bg-[#FAFAFA] px-4 py-3 text-sm text-[#666666]">
          This private chat request was denied. You can try again later.
        </div>
      )}

      {thread.status === 'blocked' && (
        <div className="rounded-xl border border-[#F3C6C6] bg-[#FFF1F1] px-4 py-3 text-sm text-[#9D2020]">
          {canUnblock
            ? 'You blocked this private chat. Unblock it to allow future contact.'
            : 'This private chat is blocked.'}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() =>
            runAction(() =>
              archived
                ? unarchivePrivateChatThread(thread.id, actorIdentity.kind, actorIdentity.id)
                : archivePrivateChatThread(thread.id, actorIdentity.kind, actorIdentity.id)
            )
          }
          disabled={isPending}
          className={buttonBaseClass('secondary')}
        >
          {archived ? 'Unarchive' : 'Archive'}
        </button>

        {canBlock && (
          <button
            type="button"
            onClick={() => setIsBlockOpen(true)}
            className={buttonBaseClass('danger')}
          >
            Block chat
          </button>
        )}

        {canUnblock && (
          <button
            type="button"
            onClick={() => runAction(() => unblockPrivateChatThread(thread.id, actorIdentity.kind, actorIdentity.id))}
            disabled={isPending}
            className={buttonBaseClass('secondary')}
          >
            Unblock chat
          </button>
        )}
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {isBlockOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <button
            type="button"
            aria-label="Close block dialog"
            onClick={() => {
              setIsBlockOpen(false)
              setError(null)
            }}
            className="absolute inset-0 bg-black/40"
          />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-[#E8E8E8] bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-semibold text-[#252525]">Block this private chat?</h2>
            <p className="mt-2 text-sm text-[#777777]">
              This will stop future messages and requests until you unblock it.
            </p>
            <textarea
              value={blockNote}
              onChange={(event) => setBlockNote(event.target.value)}
              rows={4}
              placeholder="Optional note"
              className="mt-4 w-full resize-none rounded-xl border border-[#E8E8E8] bg-[#F5F5F5] px-4 py-3 text-sm placeholder-[#AAAAAA] transition-colors focus:outline-none focus:border-[#FD6A2F]"
            />
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsBlockOpen(false)
                  setError(null)
                }}
                className="rounded-lg px-3 py-2 text-sm text-[#777777] transition-colors hover:text-[#252525]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() =>
                  runAction(
                    () => blockPrivateChatThread(thread.id, actorIdentity.kind, actorIdentity.id, blockNote),
                    () => setIsBlockOpen(false)
                  )
                }
                disabled={isPending}
                className={buttonBaseClass('danger')}
              >
                {isPending ? 'Blocking...' : 'Block chat'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
