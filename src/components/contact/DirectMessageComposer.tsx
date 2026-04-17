'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { sendDirectMessage } from '@/app/actions/contact'

interface Props {
  threadId: string
}

export function DirectMessageComposer({ threadId }: Props) {
  const router = useRouter()
  const [message, setMessage] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    startTransition(async () => {
      const result = await sendDirectMessage(threadId, message)

      if (result.error) {
        setError(result.error)
        return
      }

      setMessage('')
      router.refresh()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <textarea
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        rows={4}
        required
        placeholder="Write a message..."
        className="w-full bg-[#F5F5F5] border border-[#E8E8E8] rounded-xl px-4 py-3 text-sm placeholder-[#AAAAAA] focus:outline-none focus:border-[#FD6A2F] transition-colors resize-none"
      />
      {error && <p className="text-sm text-red-500">{error}</p>}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isPending || !message.trim()}
          className="bg-[#FD6A2F] text-white font-semibold rounded-lg px-5 py-2.5 text-sm hover:bg-[#E55A22] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? 'Sending...' : 'Send message'}
        </button>
      </div>
    </form>
  )
}
