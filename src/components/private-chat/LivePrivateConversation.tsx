'use client'

import { useCallback, useMemo } from 'react'
import { useLiveMessages } from '@/lib/useLiveMessages'
import { PrivateChatPane } from '@/components/private-chat/PrivateChatPane'
import { PrivateChatComposer } from '@/components/private-chat/PrivateChatComposer'
import {
  getPrivateChatProfileKey,
  hydratePrivateChatMessage,
  type InboxPrivateChatMessage,
  type InboxPrivateChatThread,
  type PrivateChatProfileSummary,
} from '@/lib/private-chat'
import type { PrivateChatMessage } from '@/types/database'
import type { ManagedIdentity } from '@/lib/managed-identity'

interface Props {
  threadId: string
  thread: InboxPrivateChatThread
  actorIdentity: ManagedIdentity
  lookupEntries: Array<[string, PrivateChatProfileSummary]>
  initialMessages: InboxPrivateChatMessage[]
  lastReadAt: string | null
  canReply: boolean
}

export function LivePrivateConversation({
  threadId,
  thread,
  actorIdentity,
  lookupEntries,
  initialMessages,
  lastReadAt,
  canReply,
}: Props) {
  const lookup = useMemo(() => new Map(lookupEntries), [lookupEntries])

  const { messages, addOptimistic, removeOptimistic } = useLiveMessages<InboxPrivateChatMessage>({
    table: 'private_chat_messages',
    threadId,
    initialMessages,
    isOwnMessage: (message) =>
      message.sender_profile_kind === actorIdentity.kind && message.sender_profile_id === actorIdentity.id,
    mapIncoming: (raw) =>
      hydratePrivateChatMessage(
        { ...(raw as unknown as PrivateChatMessage), profiles: null },
        lookup
      ),
  })

  const handleOptimisticSend = useCallback(
    (body: string) =>
      addOptimistic({
        thread_id: threadId,
        sender_profile_kind: actorIdentity.kind,
        sender_profile_id: actorIdentity.id,
        sender_user_id: null,
        kind: 'message',
        body,
        profiles: null,
        senderProfile: lookup.get(getPrivateChatProfileKey(actorIdentity.kind, actorIdentity.id)) ?? null,
      } as Omit<InboxPrivateChatMessage, 'id' | 'created_at'>),
    [addOptimistic, threadId, actorIdentity, lookup]
  )

  return (
    <>
      <PrivateChatPane messages={messages} thread={thread} actorIdentity={actorIdentity} lastReadAt={lastReadAt} />
      {canReply && (
        <div className="border-t border-[#ECECEC] px-6 py-5">
          <PrivateChatComposer
            threadId={threadId}
            senderIdentity={actorIdentity}
            onOptimisticSend={handleOptimisticSend}
            onSendError={removeOptimistic}
          />
        </div>
      )}
    </>
  )
}
