'use client'

import type { DockConversation, DockMessageCursor, DockResult, DockSelection } from '@/lib/chat-dock'

// GET reads run independently of Next's mutation-action queue, so inbox polling,
// read receipts and prefetches cannot hold up opening a conversation.
export async function fetchDockConversation(
  scope: string,
  selection: DockSelection,
  cursor?: DockMessageCursor
): Promise<DockResult<DockConversation>> {
  const params = new URLSearchParams({ scope, kind: selection.kind, id: selection.id })
  if (cursor) {
    params.set('before', cursor.createdAt)
    params.set('beforeId', cursor.id)
  }
  const response = await fetch(`/api/chat-dock/conversation?${params}`, {
    cache: 'no-store',
    credentials: 'same-origin',
  })
  if (!response.headers.get('content-type')?.includes('application/json'))
    throw new Error('Could not load this conversation. Try again.')
  return response.json() as Promise<DockResult<DockConversation>>
}
