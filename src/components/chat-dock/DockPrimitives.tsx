'use client'

import Image from 'next/image'
import { MessageSquare, Send } from 'lucide-react'

export const iconButton =
  'inline-flex size-9 shrink-0 items-center justify-center rounded-full text-[#72716E] transition-colors hover:bg-[#F2F1EE] hover:text-[#252525] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FD6A2F] disabled:opacity-40'
export const smallButton =
  'inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-[#E5E3DE] bg-white px-3 text-xs font-semibold text-[#333333] transition-colors hover:bg-[#F6F5F2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FD6A2F] disabled:opacity-40'

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
      className={`relative flex size-10 shrink-0 items-center justify-center overflow-hidden border border-black/5 text-sm font-semibold ${room ? 'rounded-xl bg-[#EFEEE9] text-[#726B5F]' : 'rounded-full bg-[#FFF0E8] text-[#A84420]'}`}
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
      <span className="mb-4 flex size-12 items-center justify-center rounded-2xl border border-[#EEECE7] bg-[#FAF9F6]">
        <MessageSquare className="size-5 text-[#A49B8E]" />
      </span>
      <p className="max-w-full break-words text-sm font-semibold text-[#35332F]">{title}</p>
      {children && <div className="mt-2 text-xs leading-relaxed text-[#77736D]">{children}</div>}
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
      className="shrink-0 border-t border-[#ECEAE5] bg-white px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-3"
    >
      <div className="rounded-xl border border-[#E5E3DE] bg-[#FAFAF8] p-2.5 transition-shadow focus-within:border-[#E7A082] focus-within:ring-2 focus-within:ring-[#FD6A2F]/10">
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
          className="block max-h-32 min-h-12 w-full resize-none bg-transparent px-1 text-[13px] leading-relaxed text-[#252525] outline-none placeholder:text-[#A19B92]"
        />
        <div className="mt-1 flex items-center justify-between gap-2">
          <p className="truncate pl-1 text-[10px] text-[#8B847A]">
            As <span className="font-medium">{identityName}</span>
          </p>
          <button
            type="submit"
            disabled={pending || !value.trim()}
            aria-label={request ? 'Send chat request' : 'Send message'}
            className="flex min-h-8 items-center justify-center gap-1.5 rounded-lg bg-[#FD6A2F] px-3 text-xs font-semibold text-white transition-colors hover:bg-[#E55A22] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FD6A2F] focus-visible:ring-offset-2 disabled:opacity-40"
          >
            {pending ? 'Sending...' : request ? 'Send request' : 'Send'}
            <Send className="size-3.5" />
          </button>
        </div>
      </div>
    </form>
  )
}
