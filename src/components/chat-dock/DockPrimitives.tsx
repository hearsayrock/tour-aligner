'use client'

import Image from 'next/image'
import { MessageSquare, Send } from 'lucide-react'

export const iconButton =
  'inline-flex size-9 shrink-0 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-surface-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-40'
export const smallButton =
  'inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-border bg-white px-3 text-xs font-semibold text-ink transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-40'

export function DockAvatar({
  name,
  photo,
  room = false,
}: {
  name: string
  photo?: string | null
  room?: boolean
}) {
  return (
    <span
      className={`relative flex size-10 shrink-0 items-center justify-center overflow-hidden border border-black/5 text-sm font-semibold ${room ? 'rounded-xl bg-surface-2 text-text-secondary' : 'rounded-full bg-surface text-rust'}`}
    >
      {photo ? (
        <Image src={photo} alt="" fill sizes="40px" unoptimized className="object-cover" />
      ) : room ? (
        <MessageSquare className="size-4" />
      ) : (
        name
          .split(/\s+/)
          .slice(0, 2)
          .map((word) => word[0])
          .join('')
          .toUpperCase()
      )}
    </span>
  )
}

export function DockEmpty({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-8 py-10 text-center">
      <span className="mb-4 flex size-12 items-center justify-center rounded-2xl border border-border bg-surface">
        <MessageSquare className="size-5 text-text-subtle" />
      </span>
      <p className="max-w-full break-words text-sm font-semibold text-ink">{title}</p>
      {children && <div className="mt-2 text-xs leading-relaxed text-text-secondary">{children}</div>}
    </div>
  )
}

export function DockComposer({
  value,
  onChange,
  onSend,
  pending,
  identityName,
  request = false,
}: {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  pending: boolean
  identityName: string
  request?: boolean
}) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        if (value.trim() && !pending) onSend()
      }}
      className="shrink-0 border-t border-border bg-white px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-3"
    >
      <div className="rounded-xl border border-border bg-surface p-2.5 transition-shadow focus-within:border-peach focus-within:ring-2 focus-within:ring-brand/10">
        <textarea
          aria-label={request ? 'Chat request message' : 'Message'}
          disabled={pending}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault()
              if (value.trim() && !pending) onSend()
            }
          }}
          rows={2}
          maxLength={10000}
          placeholder={request ? 'Say hello...' : 'Write a message...'}
          className="block max-h-32 min-h-12 w-full resize-none bg-transparent px-1 text-[13px] leading-relaxed text-ink outline-none placeholder:text-text-subtle"
        />
        <div className="mt-1 flex items-center justify-between gap-2">
          <p className="truncate pl-1 text-[10px] text-text-subtle">
            As <span className="font-medium">{identityName}</span>
          </p>
          <button
            type="submit"
            disabled={pending || !value.trim()}
            aria-label={request ? 'Send chat request' : 'Send message'}
            className="flex min-h-8 items-center justify-center gap-1.5 rounded-lg bg-brand px-3 text-xs font-semibold text-on-brand transition-colors hover:bg-brand-dim focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:opacity-40"
          >
            {pending ? 'Sending...' : request ? 'Send request' : 'Send'}
            <Send className="size-3.5" />
          </button>
        </div>
      </div>
    </form>
  )
}
