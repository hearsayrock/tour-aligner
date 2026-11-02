'use client'

import { useState, useTransition } from 'react'
import { MessageCircle } from 'lucide-react'
import { prepareDockChat } from '@/app/actions/chat-dock'
import { buttonBaseClass, cx } from '@/components/ui/primitives'
import { identityValue, type ManagedIdentity } from '@/lib/managed-identity'
import { openChatDock } from '@/lib/chat-dock-events'

type Props = {
  senderIdentity: ManagedIdentity
  targetKind: 'band' | 'venue'
  targetId: string
  targetName: string
  buttonLabel?: string
  className?: string
  tone?: 'primary' | 'secondary' | 'ghost' | 'dark'
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
  iconOnly = false,
}: Props) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  if (senderIdentity.kind === targetKind && senderIdentity.id === targetId) return null

  function openChat() {
    setError(null)
    startTransition(async () => {
      try {
        const scope = identityValue(senderIdentity)
        const result = await prepareDockChat(scope, targetKind, targetId)
        if (result.error || !result.data) {
          setError(result.error ?? `Could not open a chat with ${targetName}.`)
          return
        }
        openChatDock({ scope, ...result.data })
      } catch {
        setError('Could not open this chat. Try again.')
      }
    })
  }

  return (
    <>
      <button
        type="button"
        disabled={pending}
        onClick={openChat}
        className={cx(buttonBaseClass(tone), className)}
        aria-label={iconOnly ? buttonLabel : undefined}
        aria-busy={pending}
        title={iconOnly ? buttonLabel : undefined}
      >
        {iconOnly ? <MessageCircle className="h-4 w-4" aria-hidden="true" /> : buttonLabel}
      </button>
      {error && (
        <span role="alert" className="block text-xs text-red-700">
          {error}
        </span>
      )}
    </>
  )
}
