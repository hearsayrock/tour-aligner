'use client'

import { useState, useTransition } from 'react'
import { sendPrivateChatMessage } from '@/app/actions/private-chat'
import type { ManagedIdentity } from '@/lib/managed-identity'

interface Props {
  threadId: string
  senderIdentity: ManagedIdentity
  onOptimisticSend: (body: string) => string
  onSendError: (tempId: string) => void
}

export function PrivateChatComposer({ threadId, senderIdentity, onOptimisticSend, onSendError }: Props) {
  const [message, setMessage] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    const body = message.trim()
    if (!body) return
    setMessage('')

    const tempId = onOptimisticSend(body)

    startTransition(async () => {
      const result = await sendPrivateChatMessage(
        threadId,
        senderIdentity.kind,
        senderIdentity.id,
        body
      )

      if (result.error) {
        onSendError(tempId)
        setError(result.error)
        setMessage(body)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="rounded-2xl border border-[#E8E8E8] bg-white p-3 shadow-sm">
        <p className="mb-2 px-1 text-xs font-medium text-[#888888]">
          Replying as {senderIdentity.name}
        </p>
        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          rows={3}
          required
          placeholder="Message..."
          className="w-full resize-none border-0 bg-transparent px-1 py-1 text-sm placeholder-[#AAAAAA] focus:outline-none"
        />
        <div className="mt-2 flex justify-end">
          <button
            type="submit"
            disabled={isPending || !message.trim()}
            className="rounded-full bg-[#FD6A2F] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#E55A22] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </form>
  )
}
