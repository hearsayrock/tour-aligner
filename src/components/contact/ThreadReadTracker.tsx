'use client'

import { useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { markThreadRead } from '@/app/actions/contact'

interface Props {
  threadId: string
  shouldMark: boolean
}

export function ThreadReadTracker({ threadId, shouldMark }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  useEffect(() => {
    if (!shouldMark) return

    let cancelled = false

    markThreadRead(threadId).then((result) => {
      if (cancelled || result.error) return

      startTransition(() => {
        router.refresh()
      })
    })

    return () => {
      cancelled = true
    }
  }, [router, shouldMark, startTransition, threadId])

  return null
}
