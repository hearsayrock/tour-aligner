'use client'

import { useCallback } from 'react'
import { useLiveMessages } from '@/lib/useLiveMessages'
import { ChatPane } from '@/components/contact/ChatPane'
import { DirectMessageComposer } from '@/components/contact/DirectMessageComposer'
import type { ConversationSide } from '@/types/database'
import type { InboxMessage, InboxThread } from '@/lib/contact'

interface Props {
  threadId: string
  thread: InboxThread
  viewerSide: ConversationSide
  viewerUserId: string
  initialMessages: InboxMessage[]
  lastReadAt: string | null
  canReply: boolean
  replyingAsName: string
}

export function LiveConversation({
  threadId,
  thread,
  viewerSide,
  viewerUserId,
  initialMessages,
  lastReadAt,
  canReply,
  replyingAsName,
}: Props) {
  const { messages, addOptimistic, removeOptimistic } = useLiveMessages<InboxMessage>({
    table: 'contact_messages',
    threadId,
    initialMessages,
    isOwnMessage: (message) => message.sender_side === viewerSide,
    mapIncoming: (raw) => ({ ...(raw as unknown as InboxMessage), profiles: null }),
  })

  const handleOptimisticSend = useCallback(
    (body: string) =>
      addOptimistic({
        thread_id: threadId,
        sender_side: viewerSide,
        sender_user_id: viewerUserId,
        kind: 'message',
        body,
        profiles: null,
      } as Omit<InboxMessage, 'id' | 'created_at'>),
    [addOptimistic, threadId, viewerSide, viewerUserId]
  )

  return (
    <>
      <ChatPane messages={messages} thread={thread} viewerSide={viewerSide} lastReadAt={lastReadAt} />
      {canReply && (
        <div className="border-t border-[#ECECEC] px-6 py-5">
          <DirectMessageComposer
            threadId={threadId}
            replyingAsName={replyingAsName}
            onOptimisticSend={handleOptimisticSend}
            onSendError={removeOptimistic}
          />
        </div>
      )}
    </>
  )
}
