import { getChatDockContext } from '@/lib/chat-dock-server'
import { identityValue } from '@/lib/managed-identity'
import { ChatDock } from './ChatDock'

export async function ChatDockHost() {
  const context = await getChatDockContext()
  if (!context || !context.identities.length) return null
  return (
    <ChatDock
      key={`${context.userId}:${context.identity ? identityValue(context.identity) : 'all'}`}
      userId={context.userId}
      identity={context.identity}
      identities={context.identities}
      isAdmin={context.isAdmin}
    />
  )
}
