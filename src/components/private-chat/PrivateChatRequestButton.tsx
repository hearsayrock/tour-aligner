'use client'

import { useState, useTransition } from 'react'
import { MessageCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { requestPrivateChat } from '@/app/actions/private-chat'
import { buttonBaseClass, cx } from '@/components/ui/primitives'
import type { ManagedIdentity } from '@/lib/managed-identity'

type Props = {
  senderIdentity: ManagedIdentity
  targetKind: 'band' | 'venue'
  targetId: string
  targetName: string
  buttonLabel?: string
  className?: string
  tone?: 'primary' | 'secondary' | 'ghost' | 'dark'
  placeholder?: string
  iconOnly?: boolean
}

export function PrivateChatRequestButton({
  senderIdentity,
  targetKind,
  targetId,
  targetName,
  buttonLabel = 'Private chat',
  className,
  tone = 'secondary',
  placeholder = 'Say hello and let them know why you want to connect.',
  iconOnly = false,
}: Props) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  if (senderIdentity.kind === targetKind && senderIdentity.id === targetId) {
    return null
  }

  function closeModal() {
    setIsOpen(false)
    setError(null)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={cx(buttonBaseClass(tone), className)}
        aria-label={iconOnly ? buttonLabel : undefined}
        title={iconOnly ? buttonLabel : undefined}
      >
        {iconOnly ? <MessageCircle className="h-4 w-4" aria-hidden="true" /> : buttonLabel}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <button
            type="button"
            aria-label="Close private chat dialog"
            onClick={closeModal}
            className="absolute inset-0 bg-black/40"
          />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-[#E8E8E8] bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-semibold text-[#252525]">Start private chat</h2>
            <p className="mt-2 text-sm text-[#777777]">
              This will send a request to {targetName}. They will need to allow the chat before messages can continue.
            </p>

            <div className="mt-4 rounded-xl border border-[#E8E8E8] bg-[#FAFAFA] px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#888888]">Sending as</p>
              <p className="mt-1 text-sm font-medium text-[#252525]">{senderIdentity.name}</p>
            </div>

            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              rows={4}
              placeholder={placeholder}
              className="mt-4 w-full resize-none rounded-xl border border-[#E2E2E2] bg-[#F7F7F7] px-4 py-3 text-sm text-[#252525] placeholder-[#A3A3A3] transition-colors focus:border-[#FD6A2F] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FD6A2F]/15"
            />

            {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg px-3 py-2 text-sm text-[#777777] transition-colors hover:text-[#252525]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setError(null)

                  startTransition(async () => {
                    const result = await requestPrivateChat({
                      senderKind: senderIdentity.kind,
                      senderId: senderIdentity.id,
                      recipientKind: targetKind,
                      recipientId: targetId,
                      message,
                    })

                    if (result.error) {
                      setError(result.error)
                      return
                    }

                    closeModal()
                    setMessage('')
                    router.push(`/dashboard/inbox/private/${result.threadId}`)
                    router.refresh()
                  })
                }}
                disabled={isPending || !message.trim()}
                className={buttonBaseClass('primary')}
              >
                {isPending ? 'Sending...' : 'Send request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
