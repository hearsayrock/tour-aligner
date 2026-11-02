'use client'

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  ChevronDown,
  ChevronUp,
  LoaderCircle,
  MessageSquare,
  Search,
  SquarePen,
  PanelsTopLeft,
  X,
  ExternalLink,
} from 'lucide-react'
import { getDockInbox } from '@/app/actions/chat-dock'
import { setActiveIdentity } from '@/app/actions/profile'
import { identityValue, type ManagedIdentity } from '@/lib/managed-identity'
import {
  chatDockHidden,
  type ChatProfile,
  type DockConversation,
  type DockInbox,
  type DockSelection,
} from '@/lib/chat-dock'
import { createDockConversationCache } from '@/lib/chat-dock-cache'
import { fetchDockConversation } from '@/lib/chat-dock-fetch'
import { createClient } from '@/lib/supabase/client'
import { subscribeChatDock, subscribeChatDockLocation } from '@/lib/chat-dock-events'
import { DockNewChat } from './DockNewChat'
import { DockThread } from './DockThread'
import { DockWindow } from './DockWindow'
import {
  dockChatWindow,
  openChatWindow,
  type ChatWindow,
  type ChatWindowPosition,
} from '@/lib/chat-dock-windows'
import { DockAvatar, DockEmpty, iconButton, smallButton } from './DockPrimitives'

function subscribeMobile(callback: () => void) {
  const media = window.matchMedia('(max-width: 767px)')
  media.addEventListener('change', callback)
  return () => media.removeEventListener('change', callback)
}
function mobileSnapshot() {
  return window.matchMedia('(max-width: 767px)').matches
}
function serverMobileSnapshot() {
  return false
}

function shortDate(value: string | null) {
  if (!value) return ''
  const date = new Date(value)
  return date.toDateString() === new Date().toDateString()
    ? date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
    : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function ChatDock({
  userId,
  identity,
  identities,
  isAdmin,
}: {
  userId: string
  identity: ManagedIdentity | null
  identities: ManagedIdentity[]
  isAdmin: boolean
}) {
  const pathname = usePathname()
  const locationQuery = useSearchParams().toString()
  const router = useRouter()
  const [sessionValid, setSessionValid] = useState(true)
  const hidden = chatDockHidden(pathname) || !sessionValid
  const mobile = useSyncExternalStore(subscribeMobile, mobileSnapshot, serverMobileSnapshot)
  const [expanded, setExpanded] = useState(false)
  const [tab, setTab] = useState<'chats' | 'booking'>('chats')
  const [windows, setWindows] = useState<ChatWindow[]>([])
  const [activeWindow, setActiveWindow] = useState<string | null>(null)
  const [picker, setPicker] = useState(false)
  const [target, setTarget] = useState<ChatProfile | null>(null)
  const [query, setQuery] = useState('')
  const [archived, setArchived] = useState(false)
  const [inbox, setInbox] = useState<DockInbox | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [switching, setSwitching] = useState(false)
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const rootRef = useRef<HTMLElement>(null)
  const railRef = useRef<HTMLDivElement>(null)
  const pickerRef = useRef<HTMLDivElement>(null)
  const launcherRef = useRef<HTMLButtonElement>(null)
  const requestId = useRef(0)
  const scope = identity ? identityValue(identity) : null
  const [conversationCache] = useState(() =>
    createDockConversationCache((conversation, cursor) =>
      fetchDockConversation(scope ?? '', conversation, cursor)
    )
  )

  const refresh = useCallback((): Promise<void> => {
    if (!scope) return Promise.resolve()
    const current = ++requestId.current
    return getDockInbox(scope)
      .then((result) => {
        if (requestId.current !== current) return
        if (result.error) {
          setError(result.error)
          if (result.accessChanged) {
            conversationCache.clear()
            setInbox(null)
            setWindows([])
            setActiveWindow(null)
            setPicker(false)
            setExpanded(false)
            router.refresh()
          }
        } else {
          if (result.data) conversationCache.reconcile(result.data)
          setInbox(result.data ?? null)
          setError(null)
        }
      })
      .catch(() => {
        if (requestId.current === current) setError('Could not load chats. Try again.')
      })
  }, [scope, router, conversationCache])

  useEffect(() => {
    const {
      data: { subscription },
    } = createClient().auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || (event === 'SIGNED_IN' && session?.user.id !== userId)) {
        conversationCache.clear()
        setSessionValid(false)
        router.refresh()
      }
    })
    return () => subscription.unsubscribe()
  }, [router, userId, conversationCache])

  useEffect(() => {
    if (hidden || !scope) return
    let timer: ReturnType<typeof setTimeout> | undefined
    const supabase = createClient()
    function queueRefresh() {
      window.clearTimeout(timer)
      timer = setTimeout(() => void refresh(), 200)
    }
    function refreshVisible() {
      if (document.visibilityState === 'visible') void refresh()
    }
    const channel = supabase.channel(`chat-dock-${scope}`)
    for (const table of [
      'private_chat_threads',
      'private_chat_messages',
      'backstage_messages',
      'event_artist_memberships',
      'events',
    ]) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, queueRefresh)
    }
    channel.subscribe()
    void refresh()
    const poll = window.setInterval(refreshVisible, 15000)
    window.addEventListener('focus', refreshVisible)
    window.addEventListener('online', refreshVisible)
    document.addEventListener('visibilitychange', refreshVisible)
    return () => {
      window.clearTimeout(timer)
      window.clearInterval(poll)
      window.removeEventListener('focus', refreshVisible)
      window.removeEventListener('online', refreshVisible)
      document.removeEventListener('visibilitychange', refreshVisible)
      void supabase.removeChannel(channel)
    }
  }, [scope, hidden, refresh])

  useEffect(() => {
    if (!expanded || hidden || (mobile && activeWindow)) return
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    // Desktop pop-outs share the page with the inbox. Activating one must leave
    // focus in its search field or composer; only the mobile inbox is modal.
    if (mobile && !rootRef.current?.contains(document.activeElement)) rootRef.current?.focus()
    const previousOverflow = document.body.style.overflow
    const element = rootRef.current
    function resizeViewport() {
      if (mobile && element && window.visualViewport) {
        element.style.height = `${window.visualViewport.height}px`
        element.style.top = `${window.visualViewport.offsetTop}px`
      }
    }
    if (mobile) {
      document.body.style.overflow = 'hidden'
      resizeViewport()
      window.visualViewport?.addEventListener('resize', resizeViewport)
      window.visualViewport?.addEventListener('scroll', resizeViewport)
    }
    function handleKey(event: KeyboardEvent) {
      if (!rootRef.current?.contains(event.target as Node)) return
      if (event.key === 'Escape' && !event.defaultPrevented) {
        setExpanded(false)
        launcherRef.current?.focus()
      }
      if (mobile && event.key === 'Tab') {
        const controls = Array.from(
          rootRef.current?.querySelectorAll<HTMLElement>(
            'button:not(:disabled), a[href], input:not(:disabled), textarea:not(:disabled), select:not(:disabled)'
          ) ?? []
        ).filter((element) => element.getClientRects().length > 0)
        const first = controls[0]
        const last = controls.at(-1)
        if (
          event.shiftKey &&
          (document.activeElement === first || document.activeElement === rootRef.current)
        ) {
          event.preventDefault()
          last?.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first?.focus()
        }
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('keydown', handleKey)
      if (mobile) {
        document.body.style.overflow = previousOverflow
        window.visualViewport?.removeEventListener('resize', resizeViewport)
        window.visualViewport?.removeEventListener('scroll', resizeViewport)
        if (element) {
          element.style.height = ''
          element.style.top = ''
        }
      }
      if (mobile && element?.contains(document.activeElement)) previousFocus?.focus()
    }
  }, [expanded, hidden, mobile, activeWindow])

  const openConversation = useCallback((selection: DockSelection, title = 'Private chat') => {
    const id = `${selection.kind}:${selection.id}`
    setWindows((current) => openChatWindow(current, id, selection, title))
    setActiveWindow(id)
    setPicker(false)
  }, [])

  const openPrivate = useCallback(
    (id: string, unsentDraft?: string) => {
      if (unsentDraft) setDrafts((current) => ({ ...current, [`private:${id}`]: unsentDraft }))
      openConversation({ kind: 'private', id })
    },
    [openConversation]
  )

  useEffect(
    () => subscribeChatDockLocation((request) => {
      if (request.threadId) {
        if (!scope) {
          setExpanded(true)
          return false
        }
        openPrivate(request.threadId)
      } else setExpanded(true)
      return true
    }),
    [scope, openPrivate, locationQuery]
  )

  function focusWindow(id: string) {
    setActiveWindow(id)
    setPicker(false)
    setWindows((current) => {
      const window = current.find((item) => item.id === id)
      return window ? openChatWindow(current, id, window.selection, window.title) : current
    })
  }

  function activateWindow(id: string) {
    if (!windows.find((window) => window.id === id)?.minimized) setActiveWindow(id)
    setWindows((current) => {
      const z = Math.max(0, ...current.map((window) => window.z)) + 1
      return current.map((window) => (window.id === id ? { ...window, z } : window))
    })
  }

  function closeWindow(id: string) {
    if (mobile && activeWindow === id) setExpanded(true)
    setWindows((current) => current.filter((window) => window.id !== id))
    setActiveWindow((current) => (current === id ? null : current))
  }

  function toggleWindow(id: string) {
    const restoring = windows.find((window) => window.id === id)?.minimized
    setWindows((current) =>
      current.map((window) => (window.id === id ? { ...window, minimized: !window.minimized } : window))
    )
    setActiveWindow((current) => (restoring ? id : current === id ? null : current))
    if (mobile && !restoring) setExpanded(true)
  }

  function moveWindow(id: string, position: ChatWindowPosition) {
    setWindows((current) => current.map((window) => (window.id === id ? { ...window, position } : window)))
  }

  function dockWindow(id: string, centerX?: number) {
    const neighbors = [
      ...(railRef.current?.querySelectorAll<HTMLElement>('[data-docked="true"]') ?? []),
    ].filter((element) => element.dataset.chatWindowId !== id)
    const before =
      centerX === undefined
        ? neighbors[0]
        : neighbors.find((element) => {
            const rect = element.getBoundingClientRect()
            return centerX > rect.left + rect.width / 2
          })
    setWindows((current) => dockChatWindow(current, id, before?.dataset.chatWindowId))
  }

  useEffect(() => {
    return subscribeChatDock((detail) => {
      if (!detail || detail.scope !== scope) return
      const existing = inbox?.chats.find(
        (chat) => chat.partner.kind === detail.profile.kind && chat.partner.id === detail.profile.id
      )
      if (detail.threadId || existing) openPrivate(detail.threadId ?? existing!.thread.id)
      else {
        setTarget(detail.profile)
        setWindows((current) => openChatWindow(current, 'new', null, 'New chat'))
        setActiveWindow('new')
      }
    })
  }, [inbox, scope, openPrivate])

  async function switchProfile(value: string) {
    setSwitching(true)
    setError(null)
    try {
      const result = await setActiveIdentity(value)
      if (result.error) setError(result.error)
      else router.refresh()
    } catch {
      setError('Could not switch profiles. Try again.')
    } finally {
      setSwitching(false)
    }
  }

  function newChat(profile: ChatProfile | null = null) {
    setTarget(profile)
    setWindows((current) => openChatWindow(current, 'new', null, 'New chat'))
    setActiveWindow('new')
    setPicker(false)
  }

  function showBackstagePage() {
    if (!mobile) return
    setActiveWindow(null)
    setExpanded(false)
    setPicker(false)
  }

  const unreadChats = inbox?.chats.filter((chat) => chat.unread && !chat.archived).length ?? 0
  const unreadBooking = inbox?.backstages.filter((room) => room.unread).length ?? 0
  const unread = unreadChats + unreadBooking
  const chats =
    inbox?.chats.filter(
      (chat) =>
        chat.archived === archived &&
        `${chat.partner.name} ${chat.preview}`.toLocaleLowerCase().includes(query.toLocaleLowerCase())
    ) ?? []
  const rooms =
    inbox?.backstages.filter((room) =>
      `${room.title} ${room.venueName}`.toLocaleLowerCase().includes(query.toLocaleLowerCase())
    ) ?? []

  const prefetch = useCallback(
    (conversation: DockSelection) => {
      void conversationCache.load(conversation).catch(() => {})
    },
    [conversationCache]
  )
  const prefetchIds = (tab === 'chats' ? chats.map((chat) => chat.thread.id) : rooms.map((room) => room.id))
    .slice(0, 3)
    .join(',')
  useEffect(() => {
    if (!expanded || hidden || !prefetchIds) return
    for (const id of prefetchIds.split(',')) prefetch({ kind: tab === 'chats' ? 'private' : 'backstage', id })
  }, [expanded, hidden, prefetchIds, tab, prefetch])

  useEffect(() => {
    if (!picker) return
    function dismiss(event: PointerEvent) {
      if (
        !pickerRef.current?.contains(event.target as Node) &&
        !(event.target as Element).closest('[data-chat-window-picker]')
      )
        setPicker(false)
    }
    window.addEventListener('pointerdown', dismiss)
    return () => window.removeEventListener('pointerdown', dismiss)
  }, [picker])

  function windowTitle(window: ChatWindow) {
    return window.selection?.kind === 'private'
      ? (inbox?.chats.find((chat) => chat.thread.id === window.selection?.id)?.partner.name ?? window.title)
      : window.selection?.kind === 'backstage'
        ? (inbox?.backstages.find((room) => room.id === window.selection?.id)?.title ?? window.title)
        : 'New chat'
  }

  function renderWindow(window: ChatWindow) {
    if (!identity) return null
    const selection = window.selection
    const chat =
      selection?.kind === 'private' ? inbox?.chats.find((chat) => chat.thread.id === selection.id) : null
    const room =
      selection?.kind === 'backstage' ? inbox?.backstages.find((room) => room.id === selection.id) : null
    const seed: DockConversation | null = chat
      ? { kind: 'private', chat, messages: [], hasMoreMessages: false, nextCursor: null }
      : room
        ? {
            kind: 'backstage',
            backstage: room,
            messages: [],
            artistNames: {},
            hasMoreMessages: false,
            nextCursor: null,
          }
        : null
    const revision = chat
      ? `${chat.thread.status}:${chat.archived}:${chat.thread.blocked_by_id}`
      : room
        ? `${room.membershipStatus}:${room.canChat}`
        : inbox
          ? 'unavailable'
          : 'loading'
    const key = selection ? window.id : target ? `new:${target.kind}:${target.id}` : 'new'
    const onDraft = (value: string) => setDrafts((current) => ({ ...current, [key]: value }))
    return (
      <DockWindow
        key={window.id}
        window={window}
        title={windowTitle(window)}
        mobile={mobile}
        selected={activeWindow === window.id}
        onActivate={() => {
          if (activeWindow !== window.id) activateWindow(window.id)
        }}
        onToggle={() => toggleWindow(window.id)}
        onClose={() => closeWindow(window.id)}
        onMove={(point) => moveWindow(window.id, point)}
        onDock={(x) => dockWindow(window.id, x)}
        onList={() => {
          setActiveWindow(null)
          setExpanded(true)
        }}
      >
        {(controls, header, visible) =>
          selection ? (
            <DockThread
              selection={selection}
              identity={identity}
              draft={drafts[key] ?? ''}
              onDraft={onDraft}
              onRead={refresh}
              onRetry={newChat}
              revision={revision}
              isAdmin={isAdmin}
              active={visible}
              cache={conversationCache}
              seed={seed}
              controls={controls}
              fallbackHeader={header}
              onOpenBackstage={showBackstagePage}
            />
          ) : (
            <>
              {header}
              <DockNewChat
                identity={identity}
                chats={inbox?.chats ?? []}
                draft={drafts[key] ?? ''}
                onDraft={onDraft}
                onOpen={(id, draft) => {
                  openPrivate(id, draft)
                  closeWindow('new')
                }}
                target={target}
                onTarget={setTarget}
              />
            </>
          )
        }
      </DockWindow>
    )
  }

  if (hidden) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[80] flex items-end justify-end gap-3 md:px-6">
      <div
        ref={railRef}
        className="pointer-events-auto flex w-max min-w-0 shrink flex-row-reverse items-end gap-3 overflow-x-auto overscroll-x-contain pt-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden max-md:contents"
      >
        {windows.map(renderWindow)}
      </div>
      <aside
        ref={rootRef}
        tabIndex={-1}
        role={expanded && mobile && !activeWindow ? 'dialog' : 'complementary'}
        aria-modal={expanded && mobile && !activeWindow ? true : undefined}
        aria-label="Chats"
        onFocusCapture={() => {
          if (!mobile) setActiveWindow(null)
        }}
        className={`chat-dock pointer-events-auto relative z-[85] flex shrink-0 flex-col overflow-hidden border border-[#E5E2DC] bg-white text-[#252525] shadow-[0_4px_36px_rgba(35,28,18,0.15)] outline-none ${mobile && activeWindow ? '!hidden' : ''} ${expanded ? 'max-md:fixed max-md:inset-0 md:h-[560px] md:max-h-[calc(100dvh-24px)] md:w-[340px] xl:w-[380px] md:rounded-t-2xl' : 'max-md:fixed max-md:bottom-[max(12px,env(safe-area-inset-bottom))] max-md:right-3 w-56 rounded-2xl md:w-80 md:rounded-b-none'}`}
      >
        <div className="flex h-14 shrink-0 items-center gap-1 border-b border-[#ECEAE5] bg-white px-2.5">
          <button
            ref={launcherRef}
            type="button"
            onClick={() => setExpanded(!expanded)}
            aria-expanded={expanded}
            aria-controls="chat-dock-content"
            className="flex h-full min-w-0 flex-1 items-center gap-2.5 rounded-lg px-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#FD6A2F]"
          >
            <MessageSquare className="size-[18px] shrink-0 text-[#FD6A2F]" />
            <span className="truncate text-[13px] font-semibold tracking-tight">Chats</span>
            {unread > 0 && (
              <span
                aria-label={`${unread} unread conversations`}
                className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#FD6A2F] px-1.5 text-[10px] font-bold text-white"
              >
                {unread > 99 ? '99+' : unread}
              </span>
            )}
          </button>
          {windows.length > 0 && (
            <button
              type="button"
              data-chat-window-picker
              className={`${iconButton} relative`}
              aria-label={`Open conversations (${windows.length})`}
              aria-expanded={picker}
              onClick={() => setPicker(!picker)}
            >
              <PanelsTopLeft className="size-4" />
              <span className="absolute -right-0.5 top-0.5 rounded-full bg-[#F0EEE9] px-1 text-[9px]">
                {windows.length}
              </span>
            </button>
          )}
          <button
            type="button"
            aria-label="New chat"
            className={`${iconButton} ${!expanded ? 'hidden md:inline-flex' : ''}`}
            disabled={!identity || switching}
            onClick={() => newChat()}
          >
            <SquarePen className="size-4" />
          </button>
          <button
            type="button"
            className={iconButton}
            aria-label={expanded ? 'Minimize chats' : 'Expand chats'}
            aria-expanded={expanded}
            aria-controls="chat-dock-content"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <ChevronDown className="size-[18px]" /> : <ChevronUp className="size-[18px]" />}
          </button>
        </div>
        <div id="chat-dock-content" className={expanded ? 'flex min-h-0 flex-1 flex-col' : 'hidden'}>
          {
            <div className="flex shrink-0 items-center gap-2 px-4 pb-2 pt-3">
              <span className="size-1.5 shrink-0 rounded-full bg-[#FD6A2F]" />
              {identities.length > 1 ? (
                <select
                  aria-label="Chat as profile"
                  value={scope ?? ''}
                  disabled={switching}
                  onChange={(event) => void switchProfile(event.target.value)}
                  className="h-8 min-w-0 flex-1 bg-transparent text-xs font-semibold text-[#625D54] outline-none focus-visible:ring-2 focus-visible:ring-[#FD6A2F]"
                >
                  {!identity && (
                    <option value="" disabled>
                      Select a profile
                    </option>
                  )}
                  {identities.map((profile) => (
                    <option key={identityValue(profile)} value={identityValue(profile)}>
                      {profile.name}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="truncate text-xs font-semibold text-[#625D54]">
                  {identity?.name ?? 'Select a profile'}
                </span>
              )}
              {switching && <LoaderCircle className="size-3.5 animate-spin text-[#928B81]" />}
            </div>
          }
          {!identity ? (
            <DockEmpty title="Choose a profile to chat">
              <p>Use the profile selector to view conversations for an artist or venue you manage.</p>
            </DockEmpty>
          ) : (
            <>
              <div className="shrink-0 px-3 pb-3">
                <label className="flex h-9 items-center gap-2 rounded-lg border border-transparent bg-[#F5F4F1] px-3 focus-within:border-[#E7A082]">
                  <Search className="size-3.5 shrink-0 text-[#958D81]" />
                  <input
                    aria-label="Search conversations"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search conversations"
                    className="w-full bg-transparent text-xs outline-none placeholder:text-[#979086]"
                  />
                </label>
              </div>
              <div
                role="tablist"
                aria-label="Conversation type"
                className="flex shrink-0 border-b border-[#ECEAE5] px-3"
              >
                {(['chats', 'booking'] as const).map((value) => (
                  <button
                    key={value}
                    id={`dock-tab-${value}`}
                    type="button"
                    role="tab"
                    aria-selected={tab === value}
                    aria-controls={`dock-panel-${value}`}
                    tabIndex={tab === value ? 0 : -1}
                    onKeyDown={(event) => {
                      if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
                        event.preventDefault()
                        const next =
                          event.key === 'Home'
                            ? 'chats'
                            : event.key === 'End'
                              ? 'booking'
                              : value === 'chats'
                                ? 'booking'
                                : 'chats'
                        setTab(next)
                        document.getElementById(`dock-tab-${next}`)?.focus()
                      }
                    }}
                    onClick={() => setTab(value)}
                    className={`relative flex h-10 flex-1 items-center justify-center gap-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#FD6A2F] ${tab === value ? 'text-[#B7491D] after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:bg-[#FD6A2F]' : 'text-[#81786B] hover:text-[#252525]'}`}
                  >
                    {value === 'chats' ? 'Chats' : 'Booking'}
                    {(value === 'chats' ? unreadChats : unreadBooking) > 0 && (
                      <span className="rounded-full bg-[#FFF0E6] px-1.5 py-0.5 text-[9px] text-[#A84420]">
                        {value === 'chats' ? unreadChats : unreadBooking}
                      </span>
                    )}
                  </button>
                ))}
              </div>
              {tab === 'chats' && (
                <div className="flex h-9 shrink-0 items-center justify-between border-b border-[#F3F1EC] px-4">
                  <span className="text-[10px] font-medium text-[#999083]">
                    {archived ? 'Archived conversations' : 'Recent conversations'}
                  </span>
                  <select
                    aria-label="Chat view"
                    value={archived ? 'archived' : 'active'}
                    onChange={(event) => setArchived(event.target.value === 'archived')}
                    className="bg-transparent text-[10px] text-[#81786B] outline-none focus-visible:ring-2 focus-visible:ring-[#FD6A2F]"
                  >
                    <option value="active">Active</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              )}
              {error && (
                <div role="alert" className="shrink-0 bg-red-50 px-4 py-2 text-xs text-red-700">
                  {error}
                  <button type="button" onClick={() => void refresh()} className="ml-2 underline">
                    Retry
                  </button>
                </div>
              )}
              <div
                role="tabpanel"
                id={`dock-panel-${tab}`}
                aria-labelledby={`dock-tab-${tab}`}
                className="app-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain"
              >
                {!inbox && !error ? (
                  <DockEmpty title="Loading conversations..." />
                ) : tab === 'chats' ? (
                  chats.length ? (
                    chats.map((chat) => (
                      <button
                        type="button"
                        key={chat.thread.id}
                        onClick={() => openPrivate(chat.thread.id)}
                        onPointerEnter={() => prefetch({ kind: 'private', id: chat.thread.id })}
                        onFocus={() => prefetch({ kind: 'private', id: chat.thread.id })}
                        className="flex w-full shrink-0 items-center gap-3 border-b border-[#F3F1ED] px-4 py-3 text-left transition-colors hover:bg-[#FAF8F4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#FD6A2F]"
                      >
                        <DockAvatar name={chat.partner.name} photo={chat.partner.photo} />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center justify-between gap-2">
                            <span
                              className={`truncate text-[13px] ${chat.unread ? 'font-bold' : 'font-semibold'}`}
                            >
                              {chat.partner.name}
                            </span>
                            <span className="shrink-0 text-[9px] text-[#A0978B]">
                              {shortDate(chat.thread.last_message_at)}
                            </span>
                          </span>
                          <span className="mt-1 flex items-center gap-2">
                            <span
                              className={`flex-1 truncate text-[11px] leading-relaxed ${chat.unread ? 'font-medium text-[#554C40]' : 'text-[#92887B]'}`}
                            >
                              {chat.thread.status === 'pending'
                                ? chat.thread.requested_by_kind === identity.kind &&
                                  chat.thread.requested_by_id === identity.id
                                  ? 'Request pending'
                                  : 'New chat request'
                                : chat.thread.status === 'blocked'
                                  ? 'Blocked'
                                  : chat.preview || chat.partner.meta}
                            </span>
                            {chat.unread && (
                              <span
                                aria-label="Unread"
                                className="size-1.5 shrink-0 rounded-full bg-[#FD6A2F]"
                              />
                            )}
                          </span>
                        </span>
                      </button>
                    ))
                  ) : (
                    <DockEmpty
                      title={
                        query ? 'No matching conversations' : archived ? 'No archived chats' : 'No chats yet'
                      }
                    >
                      {!query && !archived && (
                        <button type="button" className={`${smallButton} mt-1`} onClick={() => newChat()}>
                          Start a chat
                        </button>
                      )}
                    </DockEmpty>
                  )
                ) : rooms.length ? (
                  rooms.map((room) => (
                    <div key={room.id} className="relative shrink-0 border-b border-[#F3F1ED]">
                      <button
                        type="button"
                        onPointerEnter={() => prefetch({ kind: 'backstage', id: room.id })}
                        onFocus={() => prefetch({ kind: 'backstage', id: room.id })}
                        onClick={() => {
                          openConversation({ kind: 'backstage', id: room.id }, room.title)
                        }}
                        className="flex w-full items-center gap-3 px-4 pb-9 pt-3 text-left transition-colors hover:bg-[#FAF8F4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#FD6A2F]"
                      >
                        <DockAvatar name={room.title} photo={room.photo} room />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center justify-between gap-2">
                            <span className="truncate text-[13px] font-semibold">{room.title}</span>
                            <span className="shrink-0 text-[9px] text-[#A0978B]">
                              {shortDate(room.lastMessageAt ?? `${room.date}T12:00:00`)}
                            </span>
                          </span>
                          <span className="mt-0.5 block truncate text-[10px] text-[#A0978B]">
                            {room.venueName}
                          </span>
                          <span className="mt-1 flex items-center gap-2">
                            <span className="flex-1 truncate text-[11px] text-[#817668]">
                              {room.membershipStatus === 'invited'
                                ? 'You’re invited. Accept to join the chat.'
                                : room.preview || 'Open Backstage chat'}
                            </span>
                            {room.unread && (
                              <span
                                aria-label="Unread"
                                className="size-1.5 shrink-0 rounded-full bg-[#FD6A2F]"
                              />
                            )}
                          </span>
                        </span>
                      </button>
                      <Link
                        href={`/dashboard/backstage/${room.id}`}
                        onClick={showBackstagePage}
                        aria-label={`Open backstage for ${room.title}`}
                        className="absolute bottom-2.5 right-4 inline-flex items-center gap-1 rounded text-[11px] font-semibold text-[#B7491D] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FD6A2F]"
                      >
                        Open backstage
                        <ExternalLink className="size-3" />
                      </Link>
                    </div>
                  ))
                ) : (
                  <DockEmpty title={query ? 'No matching Backstages' : 'No Backstage chats yet'}>
                    {!query && 'Your Backstage invitations and shared conversations will appear here.'}
                  </DockEmpty>
                )}
              </div>
            </>
          )}
        </div>
      </aside>
      {picker && (
        <div
          ref={pickerRef}
          className="pointer-events-auto fixed bottom-16 right-3 z-[200] flex max-h-[min(420px,70dvh)] w-80 flex-col overflow-hidden rounded-2xl border border-[#E5E2DC] bg-white shadow-xl md:right-6"
        >
          <div className="flex items-center justify-between border-b border-[#ECEAE5] px-4 py-2">
            <p className="text-xs font-semibold">Open conversations</p>
            <button
              type="button"
              className={iconButton}
              aria-label="Close open conversations"
              onClick={() => setPicker(false)}
            >
              <X className="size-4" />
            </button>
          </div>
          <div className="app-scrollbar overflow-y-auto">
            {windows.map((window) => (
              <div key={window.id} className="flex items-center gap-1 border-b border-[#F3F1ED] px-2">
                <button
                  type="button"
                  onClick={() => focusWindow(window.id)}
                  className="flex min-h-12 min-w-0 flex-1 items-center gap-2 rounded-lg px-2 text-left text-xs hover:bg-[#FAF8F4]"
                >
                  <MessageSquare className="size-3.5 shrink-0 text-[#FD6A2F]" />
                  <span className="truncate">{windowTitle(window)}</span>
                </button>
                <button
                  type="button"
                  className={iconButton}
                  aria-label={`Close ${windowTitle(window)}`}
                  onClick={() => closeWindow(window.id)}
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
