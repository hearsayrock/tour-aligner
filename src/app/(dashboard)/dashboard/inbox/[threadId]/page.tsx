import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DirectMessageComposer } from '@/components/contact/DirectMessageComposer'
import { InboxRealtime } from '@/components/contact/InboxRealtime'
import { BlockContactControl, InboxThreadActions } from '@/components/contact/InboxThreadActions'
import { LinkifiedText } from '@/components/contact/LinkifiedText'
import { ThreadReadTracker } from '@/components/contact/ThreadReadTracker'
import {
  formatInboxDate,
  formatShowDate,
  getPartnerHref,
  getPartnerLabel,
  getPartnerMeta,
  getViewerSide,
  hasUnread,
  type InboxMessage,
  type ThreadBookingSummary,
  type InboxThread,
  THREAD_STATUS_LABELS,
} from '@/lib/contact'

export const metadata = { title: 'Inbox Thread' }

const STATUS_STYLES = {
  pending: 'text-yellow-700 bg-yellow-50 border-yellow-200',
  accepted: 'text-[#0c7c71] bg-[#00bba5]/10 border-[#00bba5]/20',
  declined: 'text-[#666666] bg-[#F5F5F5] border-[#E8E8E8]',
  blocked: 'text-red-600 bg-red-50 border-red-200',
  confirmed: 'text-[#14584E] bg-[#F3FBF8] border-[#CBEAE2]',
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
        className={`max-w-[78%] px-4 py-3 ${
          isOwnMessage
            ? 'rounded-[20px] rounded-br-md bg-[#FD6A2F] text-white'
            : 'rounded-[20px] rounded-bl-md border border-[#E8E8E8] bg-white text-[#252525]'
        }`}
      >
        <p className={`mb-2 text-[11px] font-medium ${isOwnMessage ? 'text-white/75' : 'text-[#8E8E93]'}`}>
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
        <p className={`mt-2 text-[11px] ${isOwnMessage ? 'text-white/75' : 'text-[#AAAAAA]'}`}>
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

  const [{ data: rawThread }, { data: rawMessages }, { data: rawBooking }] = await Promise.all([
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
        working_date,
        last_message_at,
        band_last_read_at,
        venue_last_read_at,
        created_at,
        updated_at,
        bands (id, name, slug, user_id),
        venues (id, name, slug, location_city, location_state, claimed_by_user_id, default_bill_cap)
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
    supabase
      .from('bookings')
      .select(`
        id,
        thread_id,
        band_id,
        venue_id,
        show_date,
        venue_booking_date_id,
        status,
        created_at,
        updated_at,
        venue_booking_dates (
          id,
          venue_id,
          show_date,
          bill_cap,
          is_closed_to_more_bands,
          created_at,
          updated_at
        )
      `)
      .eq('thread_id', threadId)
      .eq('status', 'confirmed')
      .maybeSingle(),
  ])

  const thread = rawThread as unknown as InboxThread | null
  if (!thread) return notFound()

  const viewerSide = getViewerSide(thread, user.id)
  if (!viewerSide) return notFound()

  const messages = (rawMessages ?? []) as unknown as InboxMessage[]
  const unread = hasUnread(thread, viewerSide)
  const partnerHref = getPartnerHref(thread, viewerSide)
  const rawBookingRecord = rawBooking as
    | ({
        venue_booking_dates?: ThreadBookingSummary['venue_booking_dates'][] | ThreadBookingSummary['venue_booking_dates'] | null
      } & Record<string, unknown>)
    | null
  const booking = rawBookingRecord
    ? ({
        ...rawBookingRecord,
        venue_booking_dates: Array.isArray(rawBookingRecord.venue_booking_dates)
          ? (rawBookingRecord.venue_booking_dates[0] ?? null)
          : (rawBookingRecord.venue_booking_dates ?? null),
      } as unknown as ThreadBookingSummary)
    : null
  const confirmedBandCount =
    booking?.venue_booking_dates
      ? (
          await supabase
            .from('bookings')
            .select('id', { count: 'exact', head: true })
            .eq('venue_booking_date_id', booking.venue_booking_dates.id)
            .eq('status', 'confirmed')
        ).count ?? 0
      : 0
  const displayStatusLabel = booking ? 'Confirmed' : THREAD_STATUS_LABELS[thread.status]
  const displayStatusStyle = booking ? STATUS_STYLES.confirmed : STATUS_STYLES[thread.status]

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
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                {partnerHref && (
                  <Link
                    href={partnerHref}
                    className="inline-flex items-center rounded-lg border border-[#E8E8E8] bg-white px-3 py-2 text-sm font-medium text-[#252525] transition-colors hover:border-[#CCCCCC]"
                  >
                    View profile
                  </Link>
                )}
                <BlockContactControl
                  threadId={thread.id}
                  status={thread.status}
                  viewerSide={viewerSide}
                  blockedBySide={thread.blocked_by_side}
                />
              </div>
              {thread.working_date && !booking && (
                <p className="mt-3 inline-flex rounded-full border border-[#E8E8E8] bg-[#FAFAFA] px-3 py-1 text-xs font-medium text-[#666666]">
                  Working date: {formatShowDate(thread.working_date)}
                </p>
              )}
              {booking?.venue_booking_dates && (
                <p className="mt-3 inline-flex rounded-full border border-[#CBEAE2] bg-[#F3FBF8] px-3 py-1 text-xs font-medium text-[#14584E]">
                  Confirmed date: {formatShowDate(booking.venue_booking_dates.show_date)}
                </p>
              )}
            </div>
            <div className="flex flex-col items-end gap-3">
              <span
                className={`inline-flex text-xs font-medium px-2 py-0.5 rounded border ${displayStatusStyle}
                }`}
              >
                {displayStatusLabel}
              </span>
              <p className="text-xs text-[#AAAAAA]">
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
            workingDate={thread.working_date}
            defaultBillCap={thread.venues?.default_bill_cap ?? 4}
            booking={booking}
            confirmedBandCount={confirmedBandCount}
          />
        </div>

        <div className="px-6 py-6 bg-[#FCFCFC]">
          {messages.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#E8E8E8] bg-white px-6 py-10 text-center text-sm text-[#888888]">
              No messages yet.
            </div>
          ) : (
            <div className="space-y-3">
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
