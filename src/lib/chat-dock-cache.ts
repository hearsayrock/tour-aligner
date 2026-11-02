import type {
  DockConversation,
  DockInbox,
  DockMessage,
  DockMessageCursor,
  DockResult,
  DockSelection,
} from './chat-dock'

type Loader = (selection: DockSelection, cursor?: DockMessageCursor) => Promise<DockResult<DockConversation>>
type Entry = { selection: DockSelection; data: DockConversation; validatedAt: number }

function keyOf(selection: DockSelection) {
  return `${selection.kind}:${selection.id}`
}

function mergeMessages(current: DockMessage[], incoming: DockMessage[]) {
  const rows = new Map(current.map((message) => [message.id, message]))
  for (const message of incoming) if (!message.id.startsWith('temp-')) rows.set(message.id, message)
  return [...rows.values()].sort(
    (a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id)
  )
}

function mergeConversation(
  current: DockConversation | undefined,
  incoming: DockConversation,
  older: boolean
): DockConversation {
  if (
    !current ||
    current.kind !== incoming.kind ||
    (incoming.kind === 'backstage' && !incoming.backstage.canChat)
  )
    return incoming
  const messages = mergeMessages(current.messages, incoming.messages)
  // Refreshing the latest page must not discard previously loaded history or
  // move its pagination cursor forward.
  const retainHistoryCursor =
    !older && current.messages.length > 0 && messages[0]?.id === current.messages[0]?.id
  return {
    ...incoming,
    messages,
    hasMoreMessages: retainHistoryCursor ? current.hasMoreMessages : incoming.hasMoreMessages,
    nextCursor: retainHistoryCursor ? current.nextCursor : incoming.nextCursor,
  }
}

/** Per-dock memory only. A new account/profile gets a new instance. */
export function createDockConversationCache(
  loader: Loader,
  options: { ttlMs?: number; limit?: number; now?: () => number } = {}
) {
  const entries = new Map<string, Entry>()
  const pending = new Map<string, Promise<DockResult<DockConversation>>>()
  const versions = new Map<string, number>()
  const now = options.now ?? Date.now
  const ttl = options.ttlMs ?? 15000
  const limit = options.limit ?? 12
  let generation = 0

  function peek(selection: DockSelection) {
    return entries.get(keyOf(selection))?.data ?? null
  }

  function save(selection: DockSelection, data: DockConversation) {
    const key = keyOf(selection)
    entries.delete(key)
    entries.set(key, { selection, data, validatedAt: now() })
    while (entries.size > limit) entries.delete(entries.keys().next().value!)
  }

  function load(
    selection: DockSelection,
    force = false,
    cursor?: DockMessageCursor
  ): Promise<DockResult<DockConversation>> {
    const key = keyOf(selection)
    const version = versions.get(key) ?? 0
    const requestKey = `${key}:${version}:${cursor ? `${cursor.createdAt}:${cursor.id}` : 'latest'}`
    const inflight = pending.get(requestKey)
    if (inflight && !force) return inflight
    const current = entries.get(key)
    if (!cursor && !force && current && now() - current.validatedAt < ttl)
      return Promise.resolve({ data: current.data })
    const requestGeneration = generation
    const request = loader(selection, cursor)
      .then((result): DockResult<DockConversation> => {
        if (requestGeneration !== generation)
          return { error: 'Your selected profile changed. Reopen the chat to continue.', accessChanged: true }
        if (version !== (versions.get(key) ?? 0))
          return { error: 'Could not load this conversation. Try again.' }
        if (pending.get(requestKey) !== request) return result
        if (result.error || !result.data) {
          entries.delete(key)
          return result
        }
        const data = mergeConversation(entries.get(key)?.data, result.data, !!cursor)
        save(selection, data)
        return { data }
      })
      .finally(() => {
        if (pending.get(requestKey) === request) pending.delete(requestKey)
      })
    pending.set(requestKey, request)
    return request
  }

  function rememberMessages(selection: DockSelection, messages: DockMessage[]) {
    const entry = entries.get(keyOf(selection))
    if (!entry || (entry.data.kind === 'backstage' && !entry.data.backstage.canChat)) return
    entry.data = { ...entry.data, messages: mergeMessages(entry.data.messages, messages) }
  }

  function reconcile(inbox: DockInbox) {
    for (const [key, entry] of entries) {
      if (entry.data.kind === 'private') {
        const chat = inbox.chats.find((row) => row.thread.id === entry.selection.id)
        if (!chat) {
          versions.set(key, (versions.get(key) ?? 0) + 1)
          entries.delete(key)
          continue
        }
        if (entry.data.chat.thread.status !== chat.thread.status) {
          versions.set(key, (versions.get(key) ?? 0) + 1)
          entry.validatedAt = Number.NEGATIVE_INFINITY
        }
        entry.data = { ...entry.data, chat }
      } else {
        const backstage = inbox.backstages.find((row) => row.id === entry.selection.id)
        if (!backstage) {
          versions.set(key, (versions.get(key) ?? 0) + 1)
          entries.delete(key)
          continue
        }
        if (entry.data.backstage.canChat !== backstage.canChat) {
          versions.set(key, (versions.get(key) ?? 0) + 1)
          entry.validatedAt = Number.NEGATIVE_INFINITY
        }
        entry.data = {
          ...entry.data,
          backstage,
          ...(!backstage.canChat ? { messages: [], hasMoreMessages: false, nextCursor: null } : {}),
        }
      }
    }
  }

  return {
    peek,
    load,
    rememberMessages,
    reconcile,
    clear() {
      generation++
      entries.clear()
      pending.clear()
      versions.clear()
    },
  }
}

export type DockConversationCache = ReturnType<typeof createDockConversationCache>
