'use client'

import { useRef, useEffect } from 'react'
import { ChevronUp } from 'lucide-react'
import { LinkifiedText } from '@/components/contact/LinkifiedText'
import {
  formatChatClusterTime,
  formatChatDateDivider,
  getMessageSenderLabel,
  isSameCalendarDay,
  type InboxMessage,
  type InboxThread,
} from '@/lib/contact'

const MESSAGE_CLUSTER_GAP_MS = 5 * 60 * 1000

function buildMessageTimeline(messages: InboxMessage[]) {
  return messages.map((message, index) => {
    const previousMessage = index > 0 ? messages[index - 1] : null
    const isNewDay =
      !previousMessage || !isSameCalendarDay(previousMessage.created_at, message.created_at)
    const gapFromPrevious = previousMessage
      ? new Date(message.created_at).getTime() - new Date(previousMessage.created_at).getTime()
      : Number.POSITIVE_INFINITY
    const startsNewCluster =
      !previousMessage || isNewDay || gapFromPrevious >= MESSAGE_CLUSTER_GAP_MS
    return { message, showDateDivider: isNewDay, showClusterTime: startsNewCluster }
  })
}

function MessageBubble({
  message,
  thread,
  viewerSide,
}: {
  message: InboxMessage
  thread: InboxThread
  viewerSide: 'band' | 'venue'
}) {
  const splitIndex = message.body.indexOf(' Note: ')
  const splitSystemNote =
    message.kind === 'system' && splitIndex > -1
      ? {
          systemBody: message.body.slice(0, splitIndex),
          noteBody: message.body.slice(splitIndex + ' Note: '.length),
        }
      : null

  if (splitSystemNote) {
    const isOwnMessage = message.sender_side === viewerSide
    return (
      <div className="space-y-3">
        <div className="flex justify-center">
          <div className="max-w-xl rounded-full bg-[#F5F5F5] border border-[#E8E8E8] px-4 py-2 text-xs text-[#666666]">
            <LinkifiedText text={splitSystemNote.systemBody} className="whitespace-pre-wrap" />
          </div>
        </div>
        <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
          <div
            className={`max-w-[78%] px-4 py-3 ${
              isOwnMessage
                ? 'rounded-[20px] rounded-br-md bg-[#FD6A2F] text-white'
                : 'rounded-[20px] rounded-bl-md border border-[#E8E8E8] bg-white text-[#252525]'
            }`}
          >
            <p className={`mb-2 text-[11px] font-medium ${isOwnMessage ? 'text-white/75' : 'text-[#8E8E93]'}`}>
              {getMessageSenderLabel(thread, message.sender_side, viewerSide)}
            </p>
            <LinkifiedText
              text={splitSystemNote.noteBody}
              className={`whitespace-pre-wrap break-words text-sm leading-relaxed ${
                isOwnMessage ? 'text-white' : 'text-[#252525]'
              }`}
              linkClassName={
                isOwnMessage
                  ? 'text-white underline decoration-white/60 break-all'
                  : 'text-[#FD6A2F] hover:underline break-all'
              }
            />
          </div>
        </div>
      </div>
    )
  }

  if (message.kind === 'system') {
    return (
      <div className="flex justify-center">
        <div className="max-w-xl rounded-full bg-[#F5F5F5] border border-[#E8E8E8] px-4 py-2 text-xs text-[#666666]">
          <LinkifiedText text={message.body} className="whitespace-pre-wrap" />
        </div>
      </div>
    )
  }

  const isOwnMessage = message.sender_side === viewerSide
  return (
    <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[78%] px-4 py-3 ${
          isOwnMessage
            ? 'rounded-[20px] rounded-br-md bg-[#FD6A2F] text-white'
            : 'rounded-[20px] rounded-bl-md border border-[#E8E8E8] bg-white text-[#252525]'
        }`}
      >
        <p className={`mb-2 text-[11px] font-medium ${isOwnMessage ? 'text-white/75' : 'text-[#8E8E93]'}`}>
          {getMessageSenderLabel(thread, message.sender_side, viewerSide)}
        </p>
        <LinkifiedText
          text={message.body}
          className={`whitespace-pre-wrap break-words text-sm leading-relaxed ${
            isOwnMessage ? 'text-white' : 'text-[#252525]'
          }`}
          linkClassName={
            isOwnMessage
              ? 'text-white underline decoration-white/60 break-all'
              : 'text-[#FD6A2F] hover:underline break-all'
          }
        />
      </div>
    </div>
  )
}

interface Props {
  messages: InboxMessage[]
  thread: InboxThread
  viewerSide: 'band' | 'venue'
  lastReadAt: string | null
}

export function ChatPane({ messages, thread, viewerSide, lastReadAt }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const prevLengthRef = useRef<number | null>(null)

  const messageTimeline = buildMessageTimeline(messages)

  // Find first unread message index
  const firstUnreadIndex = (() => {
    if (messageTimeline.length === 0) return -1
    if (lastReadAt == null) return 0
    return messageTimeline.findIndex(
      ({ message }) => new Date(message.created_at) > new Date(lastReadAt)
    )
  })()
  const unreadCount = firstUnreadIndex >= 0 ? messageTimeline.length - firstUnreadIndex : 0

  // Scroll to bottom on mount; on new message, scroll only if already near bottom
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    const isInitial = prevLengthRef.current === null
    prevLengthRef.current = messages.length

    if (isInitial) {
      el.scrollTop = el.scrollHeight
    } else {
      const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
      if (distanceFromBottom < 150) el.scrollTop = el.scrollHeight
    }
  }, [messages.length])

  function scrollToUnread() {
    const el = scrollRef.current
    if (!el) return
    const target = el.querySelector<HTMLElement>('[data-unread-start]')
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  return (
    <div className="relative min-h-0 flex-1 overflow-hidden">
      {unreadCount > 0 && (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center pt-3">
          <button
            onClick={scrollToUnread}
            className="pointer-events-auto flex items-center gap-1.5 rounded-full border border-[#FD6A2F]/30 bg-white px-4 py-1.5 text-xs font-semibold text-[#FD6A2F] shadow-sm transition hover:border-[#FD6A2F] hover:shadow"
          >
            <ChevronUp className="h-3.5 w-3.5" />
            {unreadCount} new message{unreadCount !== 1 ? 's' : ''}
          </button>
        </div>
      )}

      <div ref={scrollRef} className="h-full overflow-y-auto bg-[#FCFCFC] px-6 py-6">
        {messageTimeline.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#E8E8E8] bg-white px-6 py-10 text-center text-sm text-[#888888]">
            No messages yet.
          </div>
        ) : (
          <div className="space-y-3">
            {messageTimeline.map(({ message, showDateDivider, showClusterTime }, index) => (
              <div key={message.id} className="space-y-3">
                {index === firstUnreadIndex && (
                  <div data-unread-start className="flex items-center gap-3 py-1">
                    <div className="h-px flex-1 bg-[#FD6A2F]/25" />
                    <span className="text-[11px] font-semibold tracking-wide text-[#FD6A2F]/70">
                      New messages
                    </span>
                    <div className="h-px flex-1 bg-[#FD6A2F]/25" />
                  </div>
                )}
                {showDateDivider && (
                  <div className="flex justify-center">
                    <p className="text-xs font-medium text-[#AAAAAA]">
                      {formatChatDateDivider(message.created_at)}
                    </p>
                  </div>
                )}
                {showClusterTime && (
                  <div className="flex justify-center">
                    <p className="text-[11px] text-[#B3B3B3]">
                      {formatChatClusterTime(message.created_at)}
                    </p>
                  </div>
                )}
                <MessageBubble message={message} thread={thread} viewerSide={viewerSide} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
