'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Props {
  threadId?: string
}

export function InboxRealtime({ threadId }: Props) {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    let refreshTimer: ReturnType<typeof setTimeout> | null = null

    function queueRefresh() {
      if (refreshTimer) clearTimeout(refreshTimer)
      refreshTimer = setTimeout(() => {
        router.refresh()
      }, 150)
    }

    const channel = supabase.channel(threadId ? `inbox-thread-${threadId}` : 'inbox-list')

    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'contact_threads',
        ...(threadId ? { filter: `id=eq.${threadId}` } : {}),
      },
      queueRefresh
    )

    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'contact_messages',
        ...(threadId ? { filter: `thread_id=eq.${threadId}` } : {}),
      },
      queueRefresh
    )

    channel.subscribe()

    return () => {
      if (refreshTimer) clearTimeout(refreshTimer)
      supabase.removeChannel(channel)
    }
  }, [router, threadId])

  return null
}
