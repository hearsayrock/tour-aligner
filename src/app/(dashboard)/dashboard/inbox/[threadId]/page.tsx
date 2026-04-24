import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DirectMessageComposer } from '@/components/contact/DirectMessageComposer'
import { InboxRealtime } from '@/components/contact/InboxRealtime'
import { ArchiveThreadControl, BlockContactControl, InboxThreadActions } from '@/components/contact/InboxThreadActions'
import { LinkifiedText } from '@/components/contact/LinkifiedText'
import { ThreadReadTracker } from '@/components/contact/ThreadReadTracker'
import {
  BOOKING_STATUS_LABELS,
  formatChatClusterTime,
  formatChatDateDivider,
  formatInboxDate,
  formatShowDate,
  getConversationMeta,
  getConversationTitle,
  getMessageSenderLabel,
  getThreadBookingStatus,
  getThreadDisplayStatus,
  getPartnerHref,
  getPartnerUserId,
  getPresenceLabel,
  getViewerEntity,
  getViewerSide,
  hasUnread,
  isThreadArchived,
  isSameCalendarDay,
  type InboxMessage,
  type ThreadBookingSummary,
  type InboxThread,
  THREAD_STATUS_LABELS,
} from '@/lib/contact'

export const metadata = { title: 'Inbox Thread' }
const MESSAGE_CLUSTER_GAP_MS = 5 * 60 * 1000

const STATUS_STYLES = {
  pending: 'text-yellow-700 bg-yellow-50 border-yellow-200',
  accepted: 'text-sky-700 bg-blue-50 border-blue-200',
  declined: 'text-[#666666] bg-[#F5F5F5] border-[#E8E8E8]',
  blocked: 'text-red-600 bg-red-50 border-red-200',
  confirmed: 'text-[#14584E] bg-[#F3FBF8] border-[#CBEAE2]',
  cancellation_requested: 'text-[#8A5A12] bg-[#FFF7E8] border-[#F2D7A6]',
  cancelled: 'text-[#666666] bg-[#F5F5F5] border-[#E8E8E8]',
} as const

function MessageBubble({
  message,
  thread,
  viewerSide,
}: {
  message: InboxMessage
  thread: InboxThread
  viewerSide: 'band' | 'venue'
}) {
  const splitIndex = message.body.indexOf(' Note: ')
  const splitSystemNote = message.kind === 'system' && splitIndex > -1
    ? {
        systemBody: message.body.slice(0, splitIndex),
        noteBody: message.body.slice(splitIndex + ' Note: '.length),
      }
    : null

  if (splitSystemNote) {
    const isOwnMessage = message.sender_side === viewerSide

    return (
      <div className="space-y-3">
        <div className="flex justify-center">
          <div className="max-w-xl rounded-full bg-[#F5F5F5] border border-[#E8E8E8] px-4 py-2 text-xs text-[#666666]">
            <LinkifiedText text={splitSystemNote.systemBody} className="whitespace-pre-wrap" />
          </div>
        </div>
        <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
          <div
            className={`max-w-[78%] px-4 py-3 ${
              isOwnMessage
                ? 'rounded-[20px] rounded-br-md bg-[#FD6A2F] text-white'
                : 'rounded-[20px] rounded-bl-md border border-[#E8E8E8] bg-white text-[#252525]'
            }`}
          >
            <p className={`mb-2 text-[11px] font-medium ${isOwnMessage ? 'text-white/75' : 'text-[#8E8E93]'}`}>
              {getMessageSenderLabel(thread, message.sender_side, viewerSide)}
            </p>
            <LinkifiedText
              text={splitSystemNote.noteBody}
              className={`whitespace-pre-wrap break-words text-sm leading-relaxed ${
                isOwnMessage ? 'text-white' : 'text-[#252525]'
              }`}
              linkClassName={
                isOwnMessage
                  ? 'text-white underline decoration-white/60 break-all'
                  : 'text-[#FD6A2F] hover:underline break-all'
              }
            />
          </div>
        </div>
      </div>
    )
  }

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
          {getMessageSenderLabel(thread, message.sender_side, viewerSide)}
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
      </div>
    </div>
  )
}

function buildMessageTimeline(messages: InboxMessage[]) {
  return messages.map((message, index) => {
    const previousMessage = index > 0 ? messages[index - 1] : null
    const isNewDay =
      !previousMessage || !isSameCalendarDay(previousMessage.created_at, message.created_at)

    const gapFromPrevious = previousMessage
      ? new Date(message.created_at).getTime() - new Date(previousMessage.created_at).getTime()
      : Number.POSITIVE_INFINITY

    const startsNewCluster =
      !previousMessage ||
      isNewDay ||
      gapFromPrevious >= MESSAGE_CLUSTER_GAP_MS

    return {
      message,
      showDateDivider: isNewDay,
      showClusterTime: startsNewCluster,
    }
  })
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

  const [{ data: rawThread }, { data: rawMessages }, { data: rawBookings }] = await Promise.all([
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
        band_archived_at,
        venue_archived_at,
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
        cancellation_requested_by_side,
        cancellation_requested_at,
        cancelled_by_side,
        cancelled_at,
        created_at,
        updated_at,
        venue_booking_dates (
          id,
          venue_id,
          show_date,
          bill_cap,
          is_closed_to_more_bands,
          is_unavailable,
          show_type,
          genre_focus,
          created_at,
          updated_at
        )
      `)
      .eq('thread_id', threadId)
      .order('show_date', { ascending: false })
      .order('updated_at', { ascending: false }),
  ])

  const thread = rawThread as unknown as InboxThread | null
  if (!thread) return notFound()

  const viewerSide = getViewerSide(thread, user.id)
  if (!viewerSide) return notFound()

  const messages = (rawMessages ?? []) as unknown as InboxMessage[]
  const unread = hasUnread(thread, viewerSide)
  const archived = isThreadArchived(thread, viewerSide)
  const partnerHref = getPartnerHref(thread, viewerSide)
  const partnerUserId = getPartnerUserId(thread, viewerSide)
  const { data: rawPartnerProfile } = partnerUserId
    ? await supabase.from('profiles').select('last_active_at').eq('id', partnerUserId).maybeSingle()
    : { data: null }
  const partnerPresenceLabel = getPresenceLabel((rawPartnerProfile as { last_active_at: string | null } | null)?.last_active_at ?? null)
  const bookings = ((rawBookings ?? []) as unknown as Array<
    {
      venue_booking_dates?: ThreadBookingSummary['venue_booking_dates'][] | ThreadBookingSummary['venue_booking_dates'] | null
    } & Record<string, unknown>
  >).map(
    (rawBookingRecord) =>
      ({
        ...rawBookingRecord,
        venue_booking_dates: Array.isArray(rawBookingRecord.venue_booking_dates)
          ? (rawBookingRecord.venue_booking_dates[0] ?? null)
          : (rawBookingRecord.venue_booking_dates ?? null),
      }) as unknown as ThreadBookingSummary
  )
  const bookingDateIds = Array.from(
    new Set(bookings.map((booking) => booking.venue_booking_dates?.id).filter((value): value is string => !!value))
  )
  const bookingCountByDateId = new Map<string, number>()
  if (bookingDateIds.length > 0) {
    const { data: rawBookingCounts } = await supabase
      .from('bookings')
      .select('venue_booking_date_id, status')
      .in('venue_booking_date_id', bookingDateIds)
      .in('status', ['confirmed', 'cancellation_requested'])

    for (const booking of (rawBookingCounts ?? []) as Array<{ venue_booking_date_id: string; status: string }>) {
      bookingCountByDateId.set(
        booking.venue_booking_date_id,
        (bookingCountByDateId.get(booking.venue_booking_date_id) ?? 0) + 1
      )
    }
  }
  const threadBookingStatus = getThreadBookingStatus(bookings.map((booking) => booking.status))
  const displayStatus = getThreadDisplayStatus(thread.status, threadBookingStatus)
  const displayStatusLabel = threadBookingStatus ? BOOKING_STATUS_LABELS[threadBookingStatus] : THREAD_STATUS_LABELS[thread.status]
  const displayStatusStyle = STATUS_STYLES[displayStatus]
  const messageTimeline = buildMessageTimeline(messages)
  const viewerEntity = getViewerEntity(thread, viewerSide)

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <InboxRealtime threadId={threadId} />
      <ThreadReadTracker threadId={threadId} shouldMark={unread} />

      <Link
        href="/dashboard/inbox"
        className="inline-flex items-center gap-2 text-sm text-[#888888] hover:text-[#252525] transition-colors mb-6"
      >
        <span aria-hidden="true">←</span>
        Back to inbox
      </Link>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">
        <section className="flex min-h-[540px] max-h-[78vh] min-w-0 flex-col overflow-hidden rounded-2xl border border-[#E8E8E8] bg-white xl:h-[calc(100vh-8rem)] xl:max-h-none">
          <div className="shrink-0 border-b border-[#F0F0F0] px-6 py-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <h1 className="text-2xl font-bold">{getConversationTitle(thread)}</h1>
                <p className="mt-1 text-sm text-[#888888]">
                  {getConversationMeta(thread, viewerSide)}
                </p>
                {partnerPresenceLabel && (
                  <p className="mt-2 flex items-center gap-2 text-xs text-[#0C7C71]">
                    <span className="h-2 w-2 rounded-full bg-[#0C7C71]" />
                    {partnerPresenceLabel}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-2">
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
                  <ArchiveThreadControl threadId={thread.id} archived={archived} />
                </div>
              </div>
              <div className="flex flex-col items-start gap-3 sm:items-end">
                <span
                  className={`inline-flex rounded border px-2 py-0.5 text-xs font-medium ${displayStatusStyle}`}
                >
                  {displayStatusLabel}
                </span>
                <p className="text-xs text-[#AAAAAA]">
                  Updated {formatInboxDate(thread.last_message_at ?? thread.updated_at)}
                </p>
              </div>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto bg-[#FCFCFC] px-6 py-6">
            {messages.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#E8E8E8] bg-white px-6 py-10 text-center text-sm text-[#888888]">
                No messages yet.
              </div>
            ) : (
              <div className="space-y-3">
                {messageTimeline.map(({ message, showDateDivider, showClusterTime }) => (
                  <div key={message.id} className="space-y-3">
                    {showDateDivider && (
                      <div className="flex justify-center">
                        <p className="text-xs font-medium text-[#AAAAAA]">
                          {formatChatDateDivider(message.created_at)}
                        </p>
                      </div>
                    )}
                    {showClusterTime && (
                      <div className="flex justify-center">
                        <p className="text-[11px] text-[#B3B3B3]">
                          {formatChatClusterTime(message.created_at)}
                        </p>
                      </div>
                    )}
                    <MessageBubble message={message} thread={thread} viewerSide={viewerSide} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {thread.status === 'accepted' && (
            <div className="shrink-0 border-t border-[#F0F0F0] px-6 py-5">
              <DirectMessageComposer threadId={thread.id} replyingAsName={viewerEntity.name} />
            </div>
          )}
        </section>

        <aside className="rounded-2xl border border-[#E8E8E8] bg-white xl:sticky xl:top-6">
          <div className="border-b border-[#F0F0F0] px-6 py-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#888888]">Booking</p>
            <h2 className="mt-2 text-lg font-semibold text-[#252525]">
              {thread.working_date ? formatShowDate(thread.working_date) : 'No working date'}
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {thread.working_date && bookings.length === 0 && (
                <p className="inline-flex rounded-full border border-[#E8E8E8] bg-[#FAFAFA] px-3 py-1 text-xs font-medium text-[#666666]">
                  Working date
                </p>
              )}
              {bookings.length > 0 && (
                <p className="inline-flex rounded-full border border-[#CBEAE2] bg-[#F3FBF8] px-3 py-1 text-xs font-medium text-[#14584E]">
                  {bookings.length === 1 ? '1 booking' : `${bookings.length} bookings`}
                </p>
              )}
            </div>
          </div>
          <div className="px-6 py-5">
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
              bookings={bookings}
              bookingCountByDateId={Object.fromEntries(bookingCountByDateId)}
            />
          </div>
        </aside>
      </div>
    </div>
  )
}
