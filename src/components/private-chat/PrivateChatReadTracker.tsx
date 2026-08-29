'use client'

import { useEffect } from 'react'
import { markPrivateChatRead } from '@/app/actions/private-chat'
import type { ManagedIdentity } from '@/lib/managed-identity'

interface Props {
  threadId: string
  actorIdentity: ManagedIdentity
  shouldMark: boolean
}

export function PrivateChatReadTracker({ threadId, actorIdentity, shouldMark }: Props) {
  useEffect(() => {
    if (!shouldMark) return

    let cancelled = false

    markPrivateChatRead(threadId, actorIdentity.kind, actorIdentity.id).then((result) => {
      if (cancelled || result.error) return
    })

    return () => {
      cancelled = true
    }
  }, [actorIdentity.id, actorIdentity.kind, shouldMark, threadId])

  return null
}
