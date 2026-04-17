import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DirectMessageComposer } from '@/components/contact/DirectMessageComposer'
import { InboxRealtime } from '@/components/contact/InboxRealtime'
import { InboxThreadActions } from '@/components/contact/InboxThreadActions'
import { LinkifiedText } from '@/components/contact/LinkifiedText'
import { ThreadReadTracker } from '@/components/contact/ThreadReadTracker'
import {
  formatInboxDate,
  getPartnerHref,
  getPartnerLabel,
  getPartnerMeta,
  getViewerSide,
  hasUnread,
  type InboxMessage,
  type InboxThread,
  THREAD_STATUS_LABELS,
} from '@/lib/contact'

export const metadata = { title: 'Inbox Thread' }

const STATUS_STYLES = {
  pending: 'text-yellow-700 bg-yellow-50 border-yellow-200',
  accepted: 'text-[#0c7c71] bg-[#00bba5]/10 border-[#00bba5]/20',
  declined: 'text-[#666666] bg-[#F5F5F5] border-[#E8E8E8]',
  blocked: 'text-red-600 bg-red-50 border-red-200',
} as const

function MessageBubble({
  message,
  viewerSide,
}: {
  message: InboxMessage
  viewerSide: 'band' | 'venue'
}) {
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
        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
          isOwnMessage
            ? 'bg-[#FD6A2F] text-white'
            : 'bg-white border border-[#E8E8E8] text-[#252525]'
        }`}
      >
        <p className={`text-[11px] uppercase tracking-widest mb-2 ${isOwnMessage ? 'text-white/75' : 'text-[#AAAAAA]'}`}>
          {isOwnMessage ? 'You' : message.sender_side === 'band' ? 'Artist' : 'Venue'}
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
        <p className={`text-[11px] mt-2 ${isOwnMessage ? 'text-white/75' : 'text-[#AAAAAA]'}`}>
          {formatInboxDate(message.created_at)}
        </p>
      </div>
    </div>
  )
}

export default async function InboxThreadPage({
  params,
}: {
  params: Promise<{ threadId: string }>
}) {
  const { threadId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return redirect('/login')

  const [{ data: rawThread }, { data: rawMessages }] = await Promise.all([
    supabase
      .from('contact_threads')
      .select(`
        id,
        band_id,
        venue_id,
        status,
        requested_by_side,
        blocked_by_side,
        accepted_at,
        last_message_at,
        band_last_read_at,
        venue_last_read_at,
        created_at,
        updated_at,
        bands (id, name, slug, user_id),
        venues (id, name, slug, location_city, location_state, claimed_by_user_id)
      `)
      .eq('id', threadId)
      .single(),
    supabase
      .from('contact_messages')
      .select(`
        id,
        thread_id,
        sender_side,
        sender_user_id,
        kind,
        body,
        created_at,
        profiles (full_name)
      `)
      .eq('thread_id', threadId)
      .order('created_at'),
  ])

  const thread = rawThread as unknown as InboxThread | null
  if (!thread) return notFound()

  const viewerSide = getViewerSide(thread, user.id)
  if (!viewerSide) return notFound()

  const messages = (rawMessages ?? []) as unknown as InboxMessage[]
  const unread = hasUnread(thread, viewerSide)
  const partnerHref = getPartnerHref(thread, viewerSide)

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <InboxRealtime threadId={threadId} />
      <ThreadReadTracker threadId={threadId} shouldMark={unread} />

      <Link
        href="/dashboard/inbox"
        className="inline-flex items-center gap-2 text-sm text-[#888888] hover:text-[#252525] transition-colors mb-6"
      >
        <span aria-hidden="true">←</span>
        Back to inbox
      </Link>

      <div className="bg-white border border-[#E8E8E8] rounded-2xl overflow-hidden">
        <div className="border-b border-[#F0F0F0] px-6 py-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <h1 className="text-2xl font-bold">{getPartnerLabel(thread, viewerSide)}</h1>
              <p className="text-sm text-[#888888] mt-1">
                {getPartnerMeta(thread, viewerSide) || 'Conversation'}
              </p>
              {partnerHref && (
                <Link href={partnerHref} className="inline-block mt-2 text-sm text-[#FD6A2F] hover:underline">
                  View profile
                </Link>
              )}
            </div>
            <div className="text-right">
              <span
                className={`inline-flex text-xs font-medium px-2 py-0.5 rounded border ${
                  STATUS_STYLES[thread.status]
                }`}
              >
                {THREAD_STATUS_LABELS[thread.status]}
              </span>
              <p className="text-xs text-[#AAAAAA] mt-2">
                Updated {formatInboxDate(thread.last_message_at ?? thread.updated_at)}
              </p>
            </div>
          </div>
        </div>

        <div className="px-6 py-5 border-b border-[#F0F0F0]">
          <InboxThreadActions
            threadId={thread.id}
            bandId={thread.band_id}
            venueId={thread.venue_id}
            status={thread.status}
            viewerSide={viewerSide}
            requestedBySide={thread.requested_by_side}
            blockedBySide={thread.blocked_by_side}
          />
        </div>

        <div className="px-6 py-6 bg-[#FCFCFC]">
          {messages.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#E8E8E8] bg-white px-6 py-10 text-center text-sm text-[#888888]">
              No messages yet.
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} viewerSide={viewerSide} />
              ))}
            </div>
          )}
        </div>

        {thread.status === 'accepted' && (
          <div className="border-t border-[#F0F0F0] px-6 py-5">
            <DirectMessageComposer threadId={thread.id} />
          </div>
        )}
      </div>
    </div>
  )
}
