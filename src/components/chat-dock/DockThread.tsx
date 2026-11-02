'use client'

import Link from 'next/link'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Archive, ExternalLink, MoreHorizontal, ShieldBan, Undo2 } from 'lucide-react'
import {
  archivePrivateChatThread,
  blockPrivateChatThread,
  markPrivateChatRead,
  respondToPrivateChatRequest,
  sendPrivateChatMessage,
  unarchivePrivateChatThread,
  unblockPrivateChatThread,
} from '@/app/actions/private-chat'
import { markBackstageRead, sendBackstageMessage, updateMembershipStatus } from '@/app/actions/events'
import { LinkifiedText } from '@/components/contact/LinkifiedText'
import { type ManagedIdentity } from '@/lib/managed-identity'
import type { DockConversationCache } from '@/lib/chat-dock-cache'
import {
  backstageDockMessage,
  privateDockMessage,
  type ChatProfile,
  type DockConversation,
  type DockMessage,
  type DockSelection,
} from '@/lib/chat-dock'
import { formatChatDateDivider, isIncomingPrivateChatRequest } from '@/lib/private-chat'
import { useLiveMessages } from '@/lib/useLiveMessages'
import type { BackstageMessage, PrivateChatMessage } from '@/types/database'
import { DockAvatar, DockComposer, DockEmpty, iconButton, smallButton } from './DockPrimitives'

export function DockThread({
  selection,
  identity,
  draft,
  onDraft,
  onRead,
  onRetry,
  revision,
  isAdmin,
  active,
  cache,
  seed,
  controls,
  fallbackHeader,
  onOpenBackstage,
}: {
  selection: DockSelection
  identity: ManagedIdentity
  draft: string
  onDraft: (value: string) => void
  onRead: () => void
  onRetry: (profile: ChatProfile) => void
  revision: string
  isAdmin: boolean
  active: boolean
  cache: DockConversationCache
  seed: DockConversation | null
  controls?: React.ReactNode
  fallbackHeader?: React.ReactNode
  onOpenBackstage?: () => void
}) {
  const [data, setData] = useState<DockConversation | null>(() => cache.peek(selection))
  const [error, setError] = useState<string | null>(null)
  const requestId = useRef(0)
  const { kind, id } = selection

  const reload = useCallback(
    (force = true) => {
      const current = ++requestId.current
      return cache
        .load({ kind, id }, force)
        .then((result) => {
          if (current !== requestId.current) return
          if (result.error) {
            setError(result.error)
            setData(null)
          } else {
            setData(result.data ?? null)
            setError(null)
          }
        })
        .catch(() => {
          if (current === requestId.current) setError('Could not load this conversation. Try again.')
        })
    },
    [cache, kind, id]
  )

  useEffect(() => {
    void reload(false)
  }, [reload, revision])

  const rememberMessages = useCallback(
    (messages: DockMessage[]) => {
      cache.rememberMessages({ kind, id }, messages)
    },
    [cache, kind, id]
  )
  const loadEarlier = useCallback(async () => {
    if (!data?.nextCursor || !data.hasMoreMessages) return
    const result = await cache.load({ kind, id }, false, data.nextCursor)
    if (result.error || !result.data) throw new Error(result.error)
    setData(result.data)
  }, [data, cache, kind, id])

  if (error)
    return (
      <>
        {fallbackHeader}
        <DockEmpty title="Conversation unavailable">
          <p role="alert">{error}</p>
          <button type="button" onClick={() => void reload()} className={`${smallButton} mt-4`}>
            Try again
          </button>
        </DockEmpty>
      </>
    )
  // The inbox already knows the participant and permissions. Render that shell
  // immediately, and fill its messages from the cache or the independent GET.
  let displayData = data ?? seed
  if (!displayData)
    return (
      <>
        {fallbackHeader}
        <DockEmpty title="Loading conversation..." />
      </>
    )
  if (displayData.kind === 'private' && seed?.kind === 'private')
    displayData = { ...displayData, chat: seed.chat }
  if (displayData.kind === 'backstage' && seed?.kind === 'backstage')
    displayData = { ...displayData, backstage: seed.backstage }
  return (
    <DockConversationView
      data={displayData}
      loading={!data}
      onMessages={rememberMessages}
      onEarlier={loadEarlier}
      identity={identity}
      draft={draft}
      onDraft={onDraft}
      onRead={onRead}
      onRetry={onRetry}
      reload={reload}
      isAdmin={isAdmin}
      active={active}
      controls={controls}
      onOpenBackstage={onOpenBackstage}
    />
  )
}

function DockConversationView({
  data,
  identity,
  draft,
  onDraft,
  onRead,
  onRetry,
  reload,
  isAdmin,
  active,
  loading,
  onMessages,
  onEarlier,
  controls,
  onOpenBackstage,
}: {
  data: DockConversation
  identity: ManagedIdentity
  draft: string
  onDraft: (value: string) => void
  onRead: () => void
  onRetry: (profile: ChatProfile) => void
  reload: () => Promise<void>
  isAdmin: boolean
  active: boolean
  loading: boolean
  onMessages: (messages: DockMessage[]) => void
  onEarlier: () => Promise<void>
  controls?: React.ReactNode
  onOpenBackstage?: () => void
}) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [menu, setMenu] = useState(false)
  const [confirmBlock, setConfirmBlock] = useState(false)
  const [note, setNote] = useState('')
  const menuRef = useRef<HTMLDivElement>(null)
  const thread = data.kind === 'private' ? data.chat.thread : null
  const room = data.kind === 'backstage' ? data.backstage : null
  const title = data.kind === 'private' ? data.chat.partner.name : data.backstage.title
  const id = thread?.id ?? room!.id
  const canReply = thread ? thread.status === 'accepted' : room!.canChat
  const canUnblock =
    thread?.status === 'blocked' &&
    thread.blocked_by_kind === identity.kind &&
    thread.blocked_by_id === identity.id
  const incoming = !!thread && isIncomingPrivateChatRequest(thread, identity)
  const scrollRef = useRef<HTMLDivElement>(null)
  const nearBottom = useRef(true)
  const [loadingEarlier, setLoadingEarlier] = useState(false)
  const historyScroll = useRef<{ height: number; top: number } | null>(null)
  const lastMarkedMessage = useRef<string | null>(null)

  const { messages, addOptimistic, removeOptimistic, refresh } = useLiveMessages<DockMessage>({
    table: data.kind === 'private' ? 'private_chat_messages' : 'backstage_messages',
    threadId: id,
    foreignKey: data.kind === 'private' ? 'thread_id' : 'event_id',
    initialMessages: data.messages,
    enabled: !loading && active && (!room || room.canChat),
    catchUpLimit: 50,
    pollIntervalMs: 10000,
    isOwnMessage: (message) => message.own,
    mapIncoming: (raw) =>
      data.kind === 'private'
        ? privateDockMessage(raw as unknown as PrivateChatMessage, identity, data.chat.partner.name)
        : backstageDockMessage(
            raw as unknown as BackstageMessage,
            identity,
            data.backstage.venueName,
            data.artistNames
          ),
  })
  const latestId = messages.filter((message) => !message.id.startsWith('temp-')).at(-1)?.id
  const isPrivate = data.kind === 'private'
  const canRead = !room || room.canChat
  const initiallyUnread = data.kind === 'private' ? data.chat.unread : data.backstage.unread
  const latestLoadedId = data.messages.at(-1)?.id
  const visibleMessages = canRead ? messages : []

  useEffect(() => {
    if (!loading && canRead) onMessages(messages)
  }, [loading, canRead, messages, onMessages])

  useLayoutEffect(() => {
    if (historyScroll.current && scrollRef.current) {
      scrollRef.current.scrollTop =
        historyScroll.current.top + scrollRef.current.scrollHeight - historyScroll.current.height
      historyScroll.current = null
    }
  }, [messages.length])

  async function earlier() {
    if (loadingEarlier) return
    const element = scrollRef.current
    if (element) historyScroll.current = { height: element.scrollHeight, top: element.scrollTop }
    nearBottom.current = false
    setLoadingEarlier(true)
    try {
      await onEarlier()
    } catch (failure) {
      historyScroll.current = null
      setError(failure instanceof Error ? failure.message : 'Could not load messages. Try again.')
    } finally {
      setLoadingEarlier(false)
    }
  }

  useEffect(() => {
    if (!menu) return
    function dismiss(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setMenu(false)
    }
    function escape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.stopPropagation()
        setMenu(false)
      }
    }
    document.addEventListener('pointerdown', dismiss)
    document.addEventListener('keydown', escape, true)
    return () => {
      document.removeEventListener('pointerdown', dismiss)
      document.removeEventListener('keydown', escape, true)
    }
  }, [menu])

  useEffect(() => {
    if (nearBottom.current && scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages.length, active])

  useEffect(() => {
    if (!latestId || !canRead || !active || loading) return
    if (lastMarkedMessage.current === latestId || (!initiallyUnread && latestId === latestLoadedId)) return
    let cancelled = false
    let marked = false
    async function markRead() {
      if (marked || document.visibilityState !== 'visible' || !document.hasFocus()) return
      marked = true
      try {
        const result = isPrivate
          ? await markPrivateChatRead(id, identity.kind, identity.id)
          : await markBackstageRead(id)
        if (result.error) marked = false
        else if (!cancelled) {
          lastMarkedMessage.current = latestId ?? null
          onRead()
        }
      } catch {
        marked = false
      }
    }
    void markRead()
    window.addEventListener('focus', markRead)
    document.addEventListener('visibilitychange', markRead)
    return () => {
      cancelled = true
      window.removeEventListener('focus', markRead)
      document.removeEventListener('visibilitychange', markRead)
    }
  }, [
    latestId,
    latestLoadedId,
    initiallyUnread,
    id,
    identity.kind,
    identity.id,
    isPrivate,
    canRead,
    onRead,
    active,
    loading,
  ])

  async function run(task: () => Promise<{ error?: string }>) {
    if (pending) return
    setPending(true)
    setError(null)
    try {
      const result = await task()
      if (result.error) {
        setError(result.error)
        return
      }
      setMenu(false)
      setConfirmBlock(false)
      setNote('')
      await reload()
      onRead()
    } catch {
      setError('Could not update this conversation. Try again.')
    } finally {
      setPending(false)
    }
  }

  async function send() {
    if (!canReply || pending || !draft.trim()) return
    const body = draft.trim()
    const tempId = addOptimistic({ body, own: true, system: false, sender: identity.name })
    nearBottom.current = true
    onDraft('')
    setPending(true)
    setError(null)
    try {
      const result = thread
        ? await sendPrivateChatMessage(id, identity.kind, identity.id, body)
        : await sendBackstageMessage({
            eventId: id,
            bandId: identity.kind === 'band' ? identity.id : null,
            body,
          })
      if (result.error) {
        removeOptimistic(tempId)
        onDraft(body)
        setError(result.error)
        return
      }
      await refresh()
      removeOptimistic(tempId)
      onRead()
    } catch {
      removeOptimistic(tempId)
      onDraft(body)
      setError('Could not send your message. Try again.')
    } finally {
      setPending(false)
    }
  }

  return (
    <>
      <div
        data-chat-drag-handle
        className="flex shrink-0 items-center gap-1 border-b border-[#ECEAE5] px-2.5 py-2.5 md:cursor-grab"
      >
        <button
          type="button"
          data-chat-drag-handle
          data-chat-window-title
          aria-label={`Minimize ${title}`}
          aria-expanded={true}
          className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#FD6A2F]"
        >
          <DockAvatar
            name={title}
            photo={data.kind === 'private' ? data.chat.partner.photo : data.backstage.photo}
            room={data.kind === 'backstage'}
          />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-semibold text-[#252525]">{title}</span>
            <span className="block truncate text-[11px] text-[#878074]">
              {data.kind === 'private'
                ? data.chat.partner.meta || 'Private chat'
                : `${data.backstage.venueName} · ${new Date(`${data.backstage.date}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`}
            </span>
          </span>
        </button>
        <div className={data.kind === 'private' || isAdmin ? 'relative' : 'hidden'} ref={menuRef}>
          <button
            type="button"
            className={iconButton}
            aria-label="Conversation actions"
            aria-expanded={menu}
            onClick={() => setMenu(!menu)}
          >
            <MoreHorizontal className="size-4" />
          </button>
          {menu && (
            <div className="absolute right-0 top-10 z-20 w-52 rounded-xl border border-[#E8E5DF] bg-white p-1.5 shadow-xl">
              {data.kind === 'private' ? (
                <>
                  <Link
                    href={data.chat.partner.href}
                    onClick={() => setMenu(false)}
                    className="flex min-h-10 items-center gap-2 rounded-lg px-3 text-xs hover:bg-[#F6F5F2]"
                  >
                    <ExternalLink className="size-3.5" />
                    View profile
                  </Link>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      void run(() =>
                        data.chat.archived
                          ? unarchivePrivateChatThread(id, identity.kind, identity.id)
                          : archivePrivateChatThread(id, identity.kind, identity.id)
                      )
                    }
                    className="flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-xs hover:bg-[#F6F5F2] disabled:opacity-40"
                  >
                    <Archive className="size-3.5" />
                    {data.chat.archived ? 'Unarchive' : 'Archive'}
                  </button>
                  {thread?.status === 'accepted' && (
                    <button
                      type="button"
                      onClick={() => {
                        setMenu(false)
                        setConfirmBlock(true)
                      }}
                      className="flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-xs text-red-700 hover:bg-red-50"
                    >
                      <ShieldBan className="size-3.5" />
                      Block chat
                    </button>
                  )}
                  {canUnblock && (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => void run(() => unblockPrivateChatThread(id, identity.kind, identity.id))}
                      className="flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-xs hover:bg-[#F6F5F2]"
                    >
                      <Undo2 className="size-3.5" />
                      Unblock chat
                    </button>
                  )}
                </>
              ) : isAdmin ? (
                <Link
                  href={`/dashboard/backstage/${id}`}
                  onClick={onOpenBackstage}
                  className="flex min-h-10 items-center gap-2 rounded-lg px-3 text-xs hover:bg-[#F6F5F2]"
                >
                  <ExternalLink className="size-3.5" />
                  Open Backstage
                </Link>
              ) : (
                <p className="px-3 py-2 text-xs text-[#77736D]">Shared Backstage chat</p>
              )}
            </div>
          )}
        </div>
        {controls}
      </div>
      {room && (
        <div className="shrink-0 border-b border-[#ECEAE5] bg-white px-4 py-2">
          <Link
            href={`/dashboard/backstage/${room.id}`}
            onClick={onOpenBackstage}
            aria-label={`Open backstage for ${room.title}`}
            className="inline-flex items-center gap-1 rounded text-[11px] font-semibold text-[#B7491D] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FD6A2F]"
          >
            Open backstage
            <ExternalLink className="size-3" />
          </Link>
        </div>
      )}
      {confirmBlock && (
        <div className="shrink-0 space-y-2 border-b border-red-100 bg-red-50 p-3">
          <p className="text-xs font-semibold text-red-900">Block this private chat?</p>
          <p className="text-xs text-red-800">
            This stops future messages and requests until you unblock it.
          </p>
          <input
            aria-label="Optional block note"
            placeholder="Optional note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            className="h-9 w-full rounded-lg border border-red-100 bg-white px-2 text-xs outline-none focus:ring-2 focus:ring-[#FD6A2F]"
          />
          <div className="flex gap-2">
            <button
              type="button"
              className={smallButton}
              disabled={pending}
              onClick={() => {
                setConfirmBlock(false)
                setNote('')
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              className={`${smallButton} !border-red-200 !text-red-700`}
              disabled={pending}
              onClick={() => void run(() => blockPrivateChatThread(id, identity.kind, identity.id, note))}
            >
              Block chat
            </button>
          </div>
        </div>
      )}
      <div
        ref={scrollRef}
        onScroll={() => {
          const element = scrollRef.current
          if (element)
            nearBottom.current = element.scrollHeight - element.scrollTop - element.clientHeight < 80
        }}
        role="log"
        aria-label={`${title} messages`}
        aria-live="polite"
        aria-relevant="additions"
        className="app-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain bg-[#FCFBF9] px-3 py-4"
      >
        {loading && (
          <div
            role="status"
            aria-label="Loading conversation..."
            className="space-y-5 motion-safe:animate-pulse"
          >
            <div className="h-12 w-2/3 rounded-2xl bg-[#EDEAE4]" />
            <div className="ml-auto h-16 w-3/4 rounded-2xl bg-[#E5E2DB]" />
            <div className="h-10 w-1/2 rounded-2xl bg-[#EDEAE4]" />
          </div>
        )}
        {!loading && data.hasMoreMessages && canRead && (
          <div className="text-center">
            <button
              type="button"
              className={smallButton}
              disabled={loadingEarlier}
              onClick={() => void earlier()}
            >
              {loadingEarlier ? 'Loading...' : 'Load earlier messages'}
            </button>
          </div>
        )}
        {!loading && !visibleMessages.length && (
          <DockEmpty title={room && !room.canChat ? 'Your Backstage invitation' : 'No messages yet'}>
            {room && !room.canChat
              ? 'Accept the invitation to join the conversation.'
              : 'The conversation starts here.'}
          </DockEmpty>
        )}
        {visibleMessages.map((message, index) => {
          const previous = visibleMessages[index - 1]
          const newDay =
            !previous ||
            new Date(previous.created_at).toDateString() !== new Date(message.created_at).toDateString()
          return (
            <div key={message.id}>
              {newDay && (
                <p className="my-4 text-center text-[10px] font-medium text-[#9A9185]">
                  {formatChatDateDivider(message.created_at)}
                </p>
              )}
              {message.system ? (
                <LinkifiedText
                  text={message.body}
                  className="mx-auto max-w-[95%] rounded-lg bg-[#F0EEE9] px-3 py-2 text-center text-[10px] leading-relaxed text-[#82796C]"
                />
              ) : (
                <div className={`flex flex-col ${message.own ? 'items-end' : 'items-start'}`}>
                  {(!previous || previous.sender !== message.sender || previous.system || newDay) && (
                    <p className="mb-1 px-1 text-[10px] font-medium text-[#837B70]">
                      {message.own ? 'You' : message.sender}
                    </p>
                  )}
                  <div
                    className={`max-w-[86%] rounded-2xl px-3 py-2 ${message.own ? 'rounded-br-md bg-[#252525] text-white' : 'rounded-bl-md border border-[#E8E5DF] bg-white text-[#35322D]'}`}
                  >
                    <LinkifiedText
                      text={message.body}
                      className="whitespace-pre-wrap break-words text-[13px] leading-relaxed"
                      linkClassName={
                        message.own
                          ? 'break-all text-[#FFBE9F] underline'
                          : 'break-all text-[#BD4C1D] underline'
                      }
                    />
                    <p
                      className={`mt-1 text-right text-[9px] ${message.own ? 'text-white/55' : 'text-[#A09990]'}`}
                    >
                      {message.id.startsWith('temp-')
                        ? 'Sending...'
                        : new Date(message.created_at).toLocaleTimeString(undefined, {
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
      {error && (
        <p role="alert" className="shrink-0 bg-white px-4 py-2 text-xs text-red-700">
          {error}
        </p>
      )}
      {incoming && (
        <div className="shrink-0 space-y-2 border-t border-[#ECEAE5] bg-[#FFF8F2] p-3">
          <p className="text-xs text-[#705847]">{title} wants to chat with you.</p>
          <input
            aria-label="Optional response note"
            placeholder="Optional note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            className="h-8 w-full rounded-lg border border-[#EBDFD1] bg-white px-2 text-xs outline-none focus:ring-2 focus:ring-[#FD6A2F]"
          />
          <div className="flex flex-wrap gap-1.5">
            {(['accept', 'deny', 'deny_and_block'] as const).map((action) => (
              <button
                key={action}
                type="button"
                disabled={pending}
                className={`${smallButton} ${action === 'accept' ? '!border-[#FD6A2F] !bg-[#FD6A2F] !text-white' : ''}`}
                onClick={() =>
                  void run(() => respondToPrivateChatRequest(id, identity.kind, identity.id, action, note))
                }
              >
                {action === 'accept' ? 'Allow' : action === 'deny' ? 'Deny' : 'Deny and block'}
              </button>
            ))}
          </div>
        </div>
      )}
      {room?.membershipStatus === 'invited' && (
        <div className="shrink-0 border-t border-[#ECEAE5] p-3">
          <button
            type="button"
            disabled={pending}
            className={`${smallButton} w-full !border-[#FD6A2F] !bg-[#FD6A2F] !text-white`}
            onClick={() =>
              void run(() => updateMembershipStatus({ membershipId: room.membershipId!, status: 'accepted' }))
            }
          >
            Accept invite
          </button>
        </div>
      )}
      {canReply ? (
        <DockComposer
          value={draft}
          onChange={onDraft}
          onSend={() => void send()}
          pending={pending || loading}
          identityName={identity.name}
        />
      ) : (
        thread &&
        !incoming && (
          <div className="shrink-0 border-t border-[#ECEAE5] bg-white px-4 py-3 text-xs text-[#81786C]">
            {thread.status === 'pending'
              ? 'Your private chat request is pending.'
              : thread.status === 'blocked'
                ? 'This private chat is blocked.'
                : 'This chat request was denied.'}
            {thread.status === 'declined' && data.kind === 'private' && (
              <button
                type="button"
                className={`${smallButton} mt-2 w-full`}
                onClick={() => onRetry(data.chat.partner)}
              >
                Send another request
              </button>
            )}
          </div>
        )
      )}
    </>
  )
}
