'use client'

import { useEffect } from 'react'
import { markThreadRead } from '@/app/actions/contact'

interface Props {
  threadId: string
  shouldMark: boolean
}

export function ThreadReadTracker({ threadId, shouldMark }: Props) {
  useEffect(() => {
    if (!shouldMark) return

    let cancelled = false

    markThreadRead(threadId).then((result) => {
      if (cancelled || result.error) return
    })

    return () => {
      cancelled = true
    }
  }, [shouldMark, threadId])

  return null
}
