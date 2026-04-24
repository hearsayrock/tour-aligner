import Link from 'next/link'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { IdentitySwitcher } from '@/components/dashboard/IdentitySwitcher'
import { InboxRealtime } from '@/components/contact/InboxRealtime'
import { InboxViewSelect } from '@/components/contact/InboxViewSelect'
import {
  BOOKING_STATUS_LABELS,
  formatInboxDate,
  getConversationLabel,
  getConversationMeta,
  getThreadBookingStatus,
  getThreadDisplayStatus,
  getPartnerUserId,
  getPartnerHref,
  getPresenceLabel,
  getViewerSide,
  hasUnread,
  isThreadArchived,
  isPendingIncoming,
  isPendingOutgoing,
  type InboxThread,
  THREAD_STATUS_LABELS,
} from '@/lib/contact'
import {
  ACTIVE_IDENTITY_COOKIE,
  activeIdentityLabel,
  identityMatchesThread,
  resolveActiveIdentity,
  type ManagedIdentity,
} from '@/lib/managed-identity'

export const metadata = { title: 'Inbox' }

const STATUS_STYLES = {
  pending: 'text-yellow-700 bg-yellow-50 border-yellow-200',
  accepted: 'text-sky-700 bg-blue-50 border-blue-200',
  declined: 'text-[#666666] bg-[#F5F5F5] border-[#E8E8E8]',
  blocked: 'text-red-600 bg-red-50 border-red-200',
  confirmed: 'text-[#14584E] bg-[#F3FBF8] border-[#CBEAE2]',
  cancellation_requested: 'text-[#8A5A12] bg-[#FFF7E8] border-[#F2D7A6]',
  cancelled: 'text-[#666666] bg-[#F5F5F5] border-[#E8E8E8]',
} as const

function ThreadCard({
  thread,
  userId,
  presenceByUserId,
  bookingStatusByThreadId,
}: {
  thread: InboxThread
  userId: string
  presenceByUserId: Map<string, string | null>
  bookingStatusByThreadId: Map<string, 'confirmed' | 'cancellation_requested' | 'cancelled'>
}) {
  const viewerSide = getViewerSide(thread, userId)
  if (!viewerSide) return null

  const unread = hasUnread(thread, viewerSide)
  const partnerHref = getPartnerHref(thread, viewerSide)
  const partnerUserId = getPartnerUserId(thread, viewerSide)
  const presenceLabel = partnerUserId ? getPresenceLabel(presenceByUserId.get(partnerUserId) ?? null) : null
  const bookingStatus = bookingStatusByThreadId.get(thread.id) ?? null
  const displayStatus = getThreadDisplayStatus(thread.status, bookingStatus)
  const displayStatusLabel = bookingStatus ? BOOKING_STATUS_LABELS[bookingStatus] : THREAD_STATUS_LABELS[thread.status]
  const displayStatusStyle = STATUS_STYLES[displayStatus]

  return (
    <Link
      href={`/dashboard/inbox/${thread.id}`}
      className={`block rounded-2xl border bg-white p-5 transition-all hover:border-[#CCCCCC] hover:shadow-sm ${
        unread ? 'border-[#FD6A2F]/30 shadow-[0_0_0_1px_rgba(253,106,47,0.08)]' : 'border-[#E8E8E8]'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-[#252525] truncate">
              {getConversationLabel(thread, viewerSide)}
            </h2>
            {unread && <span className="w-2 h-2 rounded-full bg-[#FD6A2F] shrink-0" />}
          </div>
          <p className="text-sm text-[#888888] mt-1">
            {getConversationMeta(thread, viewerSide)}
          </p>
          {presenceLabel && (
            <p className="mt-1 flex items-center gap-2 text-xs text-[#0C7C71]">
              <span className="h-2 w-2 rounded-full bg-[#0C7C71]" />
              {presenceLabel}
            </p>
          )}
          {partnerHref && (
            <span className="inline-block mt-2 text-xs text-[#888888] hover:text-[#252525] transition-colors">
              View profile
            </span>
          )}
        </div>
        <div className="shrink-0 text-right">
          <span
            className={`inline-flex text-xs font-medium px-2 py-0.5 rounded border ${displayStatusStyle}`}
          >
            {displayStatusLabel}
          </span>
          <p className="text-xs text-[#AAAAAA] mt-2">
            {formatInboxDate(thread.last_message_at ?? thread.updated_at)}
          </p>
        </div>
      </div>
    </Link>
  )
}

function Section({
  title,
  threads,
  userId,
  presenceByUserId,
  bookingStatusByThreadId,
}: {
  title: string
  threads: InboxThread[]
  userId: string
  presenceByUserId: Map<string, string | null>
  bookingStatusByThreadId: Map<string, 'confirmed' | 'cancellation_requested' | 'cancelled'>
}) {
  if (threads.length === 0) return null

  return (
    <section>
      <h2 className="text-sm font-semibold text-[#888888] uppercase tracking-widest mb-4">
        {title}
      </h2>
      <div className="space-y-4">
        {threads.map((thread) => (
          <ThreadCard
            key={thread.id}
            thread={thread}
            userId={userId}
            presenceByUserId={presenceByUserId}
            bookingStatusByThreadId={bookingStatusByThreadId}
          />
        ))}
      </div>
    </section>
  )
}

export default async function InboxPage({
  searchParams,
}: {
  searchParams?: Promise<{ view?: string }>
}) {
  const supabase = await createClient()
  const resolvedSearchParams = (await searchParams) ?? {}
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return redirect('/login')

  const [{ data: rawThreads }, { data: rawBands }, { data: rawVenues }] = await Promise.all([
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
        band_archived_at,
        venue_archived_at,
        created_at,
        updated_at,
        bands (id, name, slug, user_id),
        venues (id, name, slug, location_city, location_state, claimed_by_user_id)
      `)
      .order('last_message_at', { ascending: false })
      .order('updated_at', { ascending: false }),
    supabase.from('bands').select('id, name, slug').eq('user_id', user.id).eq('is_active', true).order('name'),
    supabase.from('venues').select('id, name, slug').eq('claimed_by_user_id', user.id).eq('is_active', true).order('name'),
  ])

  const threadIds = ((rawThreads ?? []) as Array<{ id: string }>).map((t) => t.id)
  const { data: rawBookings } = threadIds.length > 0
    ? await supabase
        .from('bookings')
        .select('thread_id, status, updated_at')
        .in('thread_id', threadIds)
        .order('updated_at', { ascending: false })
    : { data: [] }

  const threads = (rawThreads ?? []) as unknown as InboxThread[]
  const identities: ManagedIdentity[] = [
    ...((rawBands ?? []) as Array<{ id: string; name: string; slug: string }>).map((band) => ({
      kind: 'band' as const,
      id: band.id,
      name: band.name,
      href: `/dashboard/bands/${band.id}/edit`,
    })),
    ...((rawVenues ?? []) as Array<{ id: string; name: string; slug: string }>).map((venue) => ({
      kind: 'venue' as const,
      id: venue.id,
      name: venue.name,
      href: `/dashboard/venues/${venue.id}/edit`,
    })),
  ]
  const cookieStore = await cookies()
  const activeIdentity = resolveActiveIdentity(cookieStore.get(ACTIVE_IDENTITY_COOKIE)?.value, identities)
  const bookingStatusesByThreadId = new Map<string, Array<'confirmed' | 'cancellation_requested' | 'cancelled'>>()
  for (const booking of (rawBookings ?? []) as Array<{ thread_id: string | null; status: 'confirmed' | 'cancellation_requested' | 'cancelled' }>) {
    if (!booking.thread_id) continue
    bookingStatusesByThreadId.set(booking.thread_id, [
      ...(bookingStatusesByThreadId.get(booking.thread_id) ?? []),
      booking.status,
    ])
  }
  const bookingStatusByThreadId = new Map<string, 'confirmed' | 'cancellation_requested' | 'cancelled'>()
  for (const [threadId, statuses] of bookingStatusesByThreadId) {
    const status = getThreadBookingStatus(statuses)
    if (status) bookingStatusByThreadId.set(threadId, status)
  }
  const visibleThreads = threads.filter((thread) => !!getViewerSide(thread, user.id) && identityMatchesThread(activeIdentity, thread))
  const partnerUserIds = Array.from(
    new Set(
      visibleThreads
        .map((thread) => {
          const viewerSide = getViewerSide(thread, user.id)
          return viewerSide ? getPartnerUserId(thread, viewerSide) : null
        })
        .filter((value): value is string => !!value)
    )
  )
  const presenceByUserId = new Map<string, string | null>()

  if (partnerUserIds.length > 0) {
    const { data: rawProfiles } = await supabase
      .from('profiles')
      .select('id, last_active_at')
      .in('id', partnerUserIds)

    for (const profile of (rawProfiles ?? []) as Array<{ id: string; last_active_at: string | null }>) {
      presenceByUserId.set(profile.id, profile.last_active_at)
    }
  }

  const activeThreadsPool = visibleThreads.filter((thread) => {
    const viewerSide = getViewerSide(thread, user.id)
    return !!viewerSide && !isThreadArchived(thread, viewerSide)
  })
  const archivedThreads = visibleThreads.filter((thread) => {
    const viewerSide = getViewerSide(thread, user.id)
    return !!viewerSide && isThreadArchived(thread, viewerSide)
  })

  const incomingPending = activeThreadsPool.filter((thread) => {
    const viewerSide = getViewerSide(thread, user.id)
    return !!viewerSide && isPendingIncoming(thread, viewerSide)
  })
  const outgoingPending = activeThreadsPool.filter((thread) => {
    const viewerSide = getViewerSide(thread, user.id)
    return !!viewerSide && isPendingOutgoing(thread, viewerSide)
  })
  const cancellationRequestedThreads = activeThreadsPool.filter(
    (thread) => bookingStatusByThreadId.get(thread.id) === 'cancellation_requested'
  )
  const confirmedThreads = activeThreadsPool.filter(
    (thread) => bookingStatusByThreadId.get(thread.id) === 'confirmed'
  )
  const activeThreads = activeThreadsPool.filter(
    (thread) => thread.status === 'accepted' && !bookingStatusByThreadId.has(thread.id)
  )
  const historyThreads = activeThreadsPool.filter(
    (thread) =>
      thread.status === 'declined' ||
      thread.status === 'blocked' ||
      bookingStatusByThreadId.get(thread.id) === 'cancelled'
  )

  const hasAnything =
    incomingPending.length > 0 ||
    outgoingPending.length > 0 ||
    cancellationRequestedThreads.length > 0 ||
    confirmedThreads.length > 0 ||
    activeThreads.length > 0 ||
    historyThreads.length > 0 ||
    archivedThreads.length > 0
  const selectedView = resolvedSearchParams.view === 'archived' ? 'archived' : 'active'
  const showViewSelect = archivedThreads.length > 0 || selectedView === 'archived'

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <InboxRealtime />

      <div className="flex items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold">Inbox</h1>
          <p className="text-sm text-[#888888] mt-1">
            {activeIdentity.kind === 'all'
              ? 'Contact requests, active conversations, and history all live here.'
              : `Contact requests, active conversations, and history for ${activeIdentityLabel(activeIdentity)}.`}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3">
          <IdentitySwitcher activeIdentity={activeIdentity} identities={identities} />
          {showViewSelect && <InboxViewSelect value={selectedView} />}
        </div>
      </div>

      {!hasAnything && (
        <div className="bg-white border border-[#E8E8E8] rounded-2xl p-12 text-center">
          <p className="text-[#888888] mb-4">No conversations yet.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/dashboard/venues"
              className="inline-block bg-[#FD6A2F] text-white text-sm font-semibold rounded-lg px-5 py-2.5 hover:bg-[#E55A22] transition-colors"
            >
              Browse venues
            </Link>
            <Link
              href="/dashboard/bands"
              className="inline-block border border-[#E8E8E8] text-[#252525] text-sm font-semibold rounded-lg px-5 py-2.5 hover:border-[#CCCCCC] transition-colors"
            >
              Browse artists
            </Link>
          </div>
        </div>
      )}

      {selectedView === 'active' ? (
        <div className="space-y-10">
          <Section title="Incoming Requests" threads={incomingPending} userId={user.id} presenceByUserId={presenceByUserId} bookingStatusByThreadId={bookingStatusByThreadId} />
          <Section title="Pending Requests" threads={outgoingPending} userId={user.id} presenceByUserId={presenceByUserId} bookingStatusByThreadId={bookingStatusByThreadId} />
          <Section title="Cancellation Requests" threads={cancellationRequestedThreads} userId={user.id} presenceByUserId={presenceByUserId} bookingStatusByThreadId={bookingStatusByThreadId} />
          <Section title="Confirmed Bookings" threads={confirmedThreads} userId={user.id} presenceByUserId={presenceByUserId} bookingStatusByThreadId={bookingStatusByThreadId} />
          <Section title="Conversations In Discussion" threads={activeThreads} userId={user.id} presenceByUserId={presenceByUserId} bookingStatusByThreadId={bookingStatusByThreadId} />
          <Section title="History" threads={historyThreads} userId={user.id} presenceByUserId={presenceByUserId} bookingStatusByThreadId={bookingStatusByThreadId} />
        </div>
      ) : archivedThreads.length > 0 ? (
        <div className="space-y-10">
          <Section title="Archived" threads={archivedThreads} userId={user.id} presenceByUserId={presenceByUserId} bookingStatusByThreadId={bookingStatusByThreadId} />
        </div>
      ) : (
        <div className="bg-white border border-[#E8E8E8] rounded-2xl p-12 text-center">
          <p className="text-[#888888]">No archived conversations.</p>
        </div>
      )}
    </div>
  )
}
