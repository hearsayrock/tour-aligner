'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Props {
  bookingThreadId?: string
  privateThreadId?: string
}

export function InboxRealtime({ bookingThreadId, privateThreadId }: Props) {
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

    const mode = bookingThreadId
      ? `booking-${bookingThreadId}`
      : privateThreadId
        ? `private-${privateThreadId}`
        : 'all'
    const channel = supabase.channel(`inbox-${mode}`)

    if (bookingThreadId) {
      channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'contact_threads',
          filter: `id=eq.${bookingThreadId}`,
        },
        queueRefresh
      )

      channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'contact_messages',
          filter: `thread_id=eq.${bookingThreadId}`,
        },
        queueRefresh
      )
    } else if (privateThreadId) {
      channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'private_chat_threads',
          filter: `id=eq.${privateThreadId}`,
        },
        queueRefresh
      )

      channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'private_chat_messages',
          filter: `thread_id=eq.${privateThreadId}`,
        },
        queueRefresh
      )
    } else {
      channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'contact_threads',
        },
        queueRefresh
      )

      channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'contact_messages',
        },
        queueRefresh
      )

      channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'private_chat_threads',
        },
        queueRefresh
      )

      channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'private_chat_messages',
        },
        queueRefresh
      )
    }

    channel.subscribe()

    return () => {
      if (refreshTimer) clearTimeout(refreshTimer)
      supabase.removeChannel(channel)
    }
  }, [bookingThreadId, privateThreadId, router])

  return null
}
