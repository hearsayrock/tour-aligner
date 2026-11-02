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
