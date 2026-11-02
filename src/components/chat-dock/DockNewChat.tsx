'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { LoaderCircle, Search, X } from 'lucide-react'
import { searchDockProfiles } from '@/app/actions/chat-dock'
import { requestPrivateChat, sendPrivateChatMessage } from '@/app/actions/private-chat'
import { identityValue, type ManagedIdentity } from '@/lib/managed-identity'
import type { ChatProfile, DockPrivateChat } from '@/lib/chat-dock'
import { DockAvatar, DockComposer, DockEmpty, iconButton } from './DockPrimitives'

export function DockNewChat({
  identity,
  chats,
  draft,
  onDraft,
  onOpen,
  target,
  onTarget,
}: {
  identity: ManagedIdentity
  chats: DockPrivateChat[]
  draft: string
  onDraft: (value: string) => void
  onOpen: (threadId: string, unsentDraft?: string) => void
  target: ChatProfile | null
  onTarget: (profile: ChatProfile | null) => void
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ChatProfile[]>([])
  const [loading, setLoading] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeIndex, setActiveIndex] = useState(-1)
  const listId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const scope = identityValue(identity)

  useEffect(() => {
    if (activeIndex >= 0)
      document.getElementById(`${listId}-${activeIndex}`)?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex, listId])

  useEffect(() => {
    if (target) return
    inputRef.current?.focus()
  }, [target])

  useEffect(() => {
    if (target || query.trim().length < 2) return
    let cancelled = false
    const timer = window.setTimeout(async () => {
      setLoading(true)
      try {
        const result = await searchDockProfiles(scope, query)
        if (cancelled) return
        if (result.error) {
          setError(result.error)
          setResults([])
        } else {
          setResults(result.data ?? [])
          setError(null)
        }
      } catch {
        if (!cancelled) setError('Could not search profiles. Try again.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, 250)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [query, target, scope])

  function selectProfile(profile: ChatProfile) {
    const existing = chats.find(
      (chat) => chat.partner.kind === profile.kind && chat.partner.id === profile.id
    )
    if (existing && existing.thread.status !== 'declined') {
      onOpen(existing.thread.id, draft)
      return
    }
    onTarget(profile)
    setResults([])
    setError(null)
  }

  async function send() {
    if (!target || pending || !draft.trim()) return
    setPending(true)
    setError(null)
    try {
      const result = await requestPrivateChat({
        senderKind: identity.kind,
        senderId: identity.id,
        recipientKind: target.kind,
        recipientId: target.id,
        message: draft.trim(),
      })
      if (result.error || !result.threadId) {
        setError(result.error ?? 'Could not start this chat. Try again.')
        return
      }
      if (result.action === 'existing') {
        const sent = await sendPrivateChatMessage(result.threadId, identity.kind, identity.id, draft.trim())
        if (sent.error) {
          setError(sent.error)
          return
        }
      }
      if (result.action === 'incoming_pending') {
        onDraft('')
        onOpen(result.threadId, draft)
        return
      }
      onDraft('')
      onOpen(result.threadId)
    } catch {
      setError('Could not send your request. Try again.')
    } finally {
      setPending(false)
    }
  }

  return (
    <>
      <div className="shrink-0 border-b border-[#ECEAE5] p-3">
        {target ? (
          <div className="flex items-center gap-2.5 rounded-xl bg-[#FAF9F6] p-2">
            <DockAvatar name={target.name} photo={target.photo} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold">{target.name}</p>
              <p className="truncate text-[11px] text-[#837C72]">{target.meta}</p>
            </div>
            <button
              type="button"
              className={iconButton}
              aria-label="Change recipient"
              disabled={pending}
              onClick={() => {
                onTarget(null)
                setQuery('')
                setError(null)
                setLoading(false)
              }}
            >
              <X className="size-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-xl border border-[#E5E3DE] bg-[#F7F6F3] px-3">
            <Search className="size-4 shrink-0 text-[#928B81]" />
            <input
              ref={inputRef}
              role="combobox"
              aria-label="Find an artist or venue"
              aria-autocomplete="list"
              aria-expanded={query.trim().length >= 2}
              aria-controls={listId}
              aria-activedescendant={
                activeIndex >= 0 && results[activeIndex] ? `${listId}-${activeIndex}` : undefined
              }
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                setResults([])
                setActiveIndex(-1)
                setError(null)
                setLoading(event.target.value.trim().length >= 2)
              }}
              onKeyDown={(event) => {
                if (event.key === 'ArrowDown') {
                  event.preventDefault()
                  setActiveIndex((index) => Math.min(index + 1, results.length - 1))
                }
                if (event.key === 'ArrowUp') {
                  event.preventDefault()
                  setActiveIndex((index) => Math.max(index - 1, 0))
                }
                if (event.key === 'Enter' && activeIndex >= 0 && results[activeIndex]) {
                  event.preventDefault()
                  selectProfile(results[activeIndex])
                }
              }}
              placeholder="Find an artist or venue"
              className="h-10 w-full bg-transparent text-[13px] outline-none placeholder:text-[#979086]"
            />
            {loading && <LoaderCircle className="size-4 shrink-0 animate-spin text-[#928B81]" />}
          </div>
        )}
      </div>
      {error && (
        <p role="alert" className="shrink-0 px-4 py-2 text-xs text-red-700">
          {error}
        </p>
      )}
      {target ? (
        <>
          <DockEmpty title={`Connect with ${target.name}`}>
            <p>Send a short introduction. They can reply once they accept your request.</p>
          </DockEmpty>
          <DockComposer
            value={draft}
            onChange={onDraft}
            onSend={() => void send()}
            pending={pending}
            identityName={identity.name}
            request
          />
        </>
      ) : (
        <div className="app-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto">
          <div id={listId} role="listbox" aria-label="Matching profiles">
            {results.map((profile, index) => (
              <button
                key={`${profile.kind}:${profile.id}`}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={activeIndex === index}
                onClick={() => selectProfile(profile)}
                type="button"
                className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[#F8F6F2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#FD6A2F] ${activeIndex === index ? 'bg-[#FFF3EB]' : ''}`}
              >
                <DockAvatar name={profile.name} photo={profile.photo} />
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-semibold">{profile.name}</span>
                  <span className="block truncate text-[11px] text-[#837C72]">{profile.meta}</span>
                </span>
              </button>
            ))}
          </div>
          {!results.length && (
            <DockEmpty
              title={
                loading
                  ? 'Searching profiles...'
                  : query.trim().length >= 2
                    ? 'No matching profiles'
                    : 'Who are you connecting with?'
              }
            >
              {query.trim().length < 2
                ? 'Type at least two characters to find an artist or venue.'
                : !loading
                  ? 'Try another name.'
                  : null}
            </DockEmpty>
          )}
        </div>
      )}
    </>
  )
}
