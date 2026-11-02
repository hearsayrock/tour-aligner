'use client'

import type { ChatProfile } from '@/lib/chat-dock'

type OpenChat = { scope: string; profile: ChatProfile; threadId?: string }
const OPEN_CHAT_EVENT = 'touraligner:open-chat'
let queuedChat: OpenChat | null = null

// A profile button can hydrate before the suspended root host. Keep the request
// until the dock listener mounts, rather than dropping that first click.
export function openChatDock(chat: OpenChat) {
  queuedChat = chat
  window.dispatchEvent(new Event(OPEN_CHAT_EVENT))
}

export function subscribeChatDock(onOpen: (chat: OpenChat) => void) {
  function receive() {
    if (!queuedChat) return
    const chat = queuedChat
    queuedChat = null
    onOpen(chat)
  }
  window.addEventListener(OPEN_CHAT_EVENT, receive)
  receive()
  return () => window.removeEventListener(OPEN_CHAT_EVENT, receive)
}

export function readChatDockLocation(search: string): { threadId: string | null } | null {
  const params = new URLSearchParams(search)
  const threadId = params.get('chat')
  if (threadId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(threadId)) return { threadId }
  return params.get('chats') === 'open' ? { threadId: null } : null
}

export function subscribeChatDockLocation(onOpen: (request: { threadId: string | null }) => boolean) {
  function receive() {
    const url = new URL(window.location.href)
    const request = readChatDockLocation(url.search)
    if (!request || !onOpen(request)) return
    url.searchParams.delete('chat')
    url.searchParams.delete('chats')
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`)
  }
  window.addEventListener('popstate', receive)
  receive()
  return () => window.removeEventListener('popstate', receive)
}
