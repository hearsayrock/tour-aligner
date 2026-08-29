'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type LiveMessage = { id: string; created_at: string; body: string }

interface UseLiveMessagesArgs<TMessage extends LiveMessage> {
  /** Table to subscribe to, e.g. 'contact_messages' or 'private_chat_messages'. */
  table: string
  threadId: string
  initialMessages: TMessage[]
  /** Whether a message (already mapped) was sent by the viewer, used to reconcile optimistic sends. */
  isOwnMessage: (message: TMessage) => boolean
  /** Transform a raw table row (from a realtime payload or a catch-up fetch) into TMessage. */
  mapIncoming?: (raw: Record<string, unknown>) => TMessage
}

function mergeById<TMessage extends LiveMessage>(current: TMessage[], incoming: TMessage[]) {
  const byId = new Map(current.map((message) => [message.id, message]))
  for (const message of incoming) byId.set(message.id, message)
  return Array.from(byId.values()).sort((a, b) => a.created_at.localeCompare(b.created_at))
}

/**
 * Keeps a thread's message list live: appends messages the instant they're inserted
 * (via Supabase Realtime) instead of waiting on a full page refetch, reconciles a
 * sender's own optimistically-added message against the row that comes back over the
 * socket, and re-syncs on tab focus / network reconnect in case the socket silently
 * dropped (the previous implementation had no reconnect path, which is why messages
 * used to require a manual page refresh to show up).
 */
export function useLiveMessages<TMessage extends LiveMessage>({
  table,
  threadId,
  initialMessages,
  isOwnMessage,
  mapIncoming,
}: UseLiveMessagesArgs<TMessage>) {
  // Reset to a fresh initial state when the caller mounts this hook with `key={threadId}`
  // on the component using it (see LiveConversation / LivePrivateConversation) — that's
  // the React-recommended way to reset state on identity change, rather than an effect.
  const [messages, setMessages] = useState<TMessage[]>(initialMessages)
  const [pending, setPending] = useState<TMessage[]>([])

  const mapIncomingRef = useRef(mapIncoming)
  const isOwnMessageRef = useRef(isOwnMessage)
  useEffect(() => {
    mapIncomingRef.current = mapIncoming
    isOwnMessageRef.current = isOwnMessage
  })

  useEffect(() => {
    const supabase = createClient()
    let cancelled = false
    let channel: ReturnType<typeof supabase.channel> | null = null

    function mapRow(raw: Record<string, unknown>): TMessage {
      return mapIncomingRef.current ? mapIncomingRef.current(raw) : (raw as unknown as TMessage)
    }

    function handleInsert(raw: Record<string, unknown>) {
      const row = mapRow(raw)
      setMessages((current) => mergeById(current, [row]))
      setPending((current) => {
        const matchIndex = current.findIndex(
          (message) => message.id.startsWith('temp-') && message.body === row.body && isOwnMessageRef.current(row)
        )
        if (matchIndex === -1) return current
        const next = [...current]
        next.splice(matchIndex, 1)
        return next
      })
    }

    async function catchUp() {
      const { data } = await supabase
        .from(table)
        .select('*')
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true })
      if (cancelled || !data) return
      setMessages((current) => mergeById(current, (data as Record<string, unknown>[]).map(mapRow)))
    }

    function connect() {
      channel = supabase
        .channel(`live-${table}-${threadId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table, filter: `thread_id=eq.${threadId}` },
          (payload) => handleInsert(payload.new as Record<string, unknown>)
        )
        .subscribe()
    }

    function reconnect() {
      if (channel) supabase.removeChannel(channel)
      connect()
      catchUp()
    }

    function handleVisibility() {
      if (document.visibilityState === 'visible') reconnect()
    }

    connect()
    window.addEventListener('online', reconnect)
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      cancelled = true
      window.removeEventListener('online', reconnect)
      document.removeEventListener('visibilitychange', handleVisibility)
      if (channel) supabase.removeChannel(channel)
    }
  }, [table, threadId])

  const addOptimistic = useCallback((partial: Omit<TMessage, 'id' | 'created_at'>) => {
    const tempId = `temp-${crypto.randomUUID()}`
    const message = { ...partial, id: tempId, created_at: new Date().toISOString() } as TMessage
    setPending((current) => [...current, message])
    return tempId
  }, [])

  const removeOptimistic = useCallback((tempId: string) => {
    setPending((current) => current.filter((message) => message.id !== tempId))
  }, [])

  return { messages: mergeById(messages, pending), addOptimistic, removeOptimistic }
}
