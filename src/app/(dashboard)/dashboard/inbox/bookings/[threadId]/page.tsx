import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { ProfileSelectionModal } from '@/components/dashboard/ProfileSelectionModal'
import { LiveConversation } from '@/components/contact/LiveConversation'
import { ArchiveThreadControl, InboxThreadActions } from '@/components/contact/InboxThreadActions'
import { InboxRealtime } from '@/components/contact/InboxRealtime'
import { ThreadReadTracker } from '@/components/contact/ThreadReadTracker'
import { Badge, Card, PageHeader } from '@/components/ui/primitives'
import {
  ACTIVE_IDENTITY_COOKIE,
  resolveRequiredActiveIdentity,
  type ManagedIdentity,
} from '@/lib/managed-identity'
import {
  formatInboxDate,
  formatShowDate,
  getConversationMeta,
  getConversationTitle,
  getPartnerEntity,
  getThreadBookingStatus,
  getThreadDisplayStatus,
  hasUnread,
  isThreadArchived,
  THREAD_STATUS_LABELS,
  type InboxMessage,
  type InboxThread,
  type ThreadBookingSummary,
} from '@/lib/contact'

export const metadata = { title: 'Booking Thread' }

type BookingThreadDetail = InboxThread & {
  bookings: ThreadBookingSummary[] | null
}

function bookingStatusLabel(status: ReturnType<typeof getThreadDisplayStatus>) {
  if (status in THREAD_STATUS_LABELS) {
    return THREAD_STATUS_LABELS[status as keyof typeof THREAD_STATUS_LABELS]
  }

  if (status === 'cancellation_requested') return 'Cancellation requested'
  if (status === 'confirmed') return 'Confirmed'
  return 'Cancelled'
}

export default async function BookingInboxThreadPage({
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

  const [{ data: bands }, { data: venues }, { data: rawThread }, { data: rawMessages }] = await Promise.all([
    supabase.from('bands').select('id, name').eq('user_id', user.id).eq('is_active', true).order('name'),
    supabase.from('venues').select('id, name').eq('claimed_by_user_id', user.id).eq('is_active', true).order('name'),
    supabase
      .from('contact_threads')
      .select(`
        *,
        bands(id, name, slug, user_id),
        venues(id, name, slug, location_city, location_state, claimed_by_user_id, default_bill_cap),
        bookings(*, venue_booking_dates(*))
      `)
      .eq('id', threadId)
      .maybeSingle(),
    supabase
      .from('contact_messages')
      .select('*, profiles(full_name)')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true }),
  ])

  const identities: ManagedIdentity[] = [
    ...(bands ?? []).map((band) => ({
      kind: 'band' as const,
      id: band.id,
      name: band.name,
      href: `/dashboard/bands/${band.id}/edit`,
    })),
    ...(venues ?? []).map((venue) => ({
      kind: 'venue' as const,
      id: venue.id,
      name: venue.name,
      href: `/dashboard/venues/${venue.id}/edit`,
    })),
  ]

  const cookieStore = await cookies()
  const requiredIdentity = resolveRequiredActiveIdentity(cookieStore.get(ACTIVE_IDENTITY_COOKIE)?.value, identities)
  const thread = rawThread as unknown as BookingThreadDetail | null

  if (!thread) return notFound()

  const threadIdentities = identities.filter((identity) =>
    identity.kind === 'band' ? thread.band_id === identity.id : thread.venue_id === identity.id
  )

  if (requiredIdentity.requiresSelection) {
    if (threadIdentities.length === 0) return notFound()

    return (
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <PageHeader
          eyebrow="Inbox"
          title="Choose a profile"
          description="Booking threads are tied to one artist or venue profile."
        />
        <ProfileSelectionModal
          title="Select a profile to view this booking thread"
          body="Choose the artist or venue profile related to this booking thread."
          identities={threadIdentities}
        />
      </div>
    )
  }

  const activeIdentity = requiredIdentity.activeIdentity
  if (!activeIdentity) return notFound()
  if (!threadIdentities.some((identity) => identity.kind === activeIdentity.kind && identity.id === activeIdentity.id)) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <PageHeader
          eyebrow="Inbox"
          title="Switch profiles"
          description="The selected profile is not part of this booking thread."
        />
        <ProfileSelectionModal
          title="Select a profile to view this booking thread"
          body="Choose the artist or venue profile related to this booking thread."
          identities={threadIdentities}
        />
      </div>
    )
  }

  const viewerSide = activeIdentity.kind
  const partner = getPartnerEntity(thread, viewerSide)
  const messages = (rawMessages ?? []) as unknown as InboxMessage[]
  const bookings = (thread.bookings ?? []) as ThreadBookingSummary[]
  const bookingStatus = getThreadBookingStatus(bookings.map((booking) => booking.status))
  const displayStatus = getThreadDisplayStatus(thread.status, bookingStatus)
  const unread = hasUnread(thread, viewerSide)
  const lastReadAt = viewerSide === 'band' ? thread.band_last_read_at : thread.venue_last_read_at
  const archived = isThreadArchived(thread, viewerSide)
  const bookingCountByDateId = bookings.reduce<Record<string, number>>((counts, booking) => {
    counts[booking.venue_booking_date_id] = (counts[booking.venue_booking_date_id] ?? 0) + 1
    return counts
  }, {})

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <InboxRealtime bookingThreadId={threadId} />
      <ThreadReadTracker threadId={threadId} shouldMark={unread} />
      <PageHeader
        backHref="/dashboard/inbox"
        backLabel="Back to inbox"
        eyebrow="Booking Thread"
        title={getConversationTitle(thread)}
        description={getConversationMeta(thread, viewerSide)}
        actions={
          <>
            {thread.working_date && (
              <Badge tone="brand">Proposed date: {formatShowDate(thread.working_date)}</Badge>
            )}
            <Badge tone={displayStatus === 'confirmed' ? 'success' : displayStatus === 'pending' ? 'warning' : displayStatus === 'blocked' ? 'danger' : 'muted'}>
              {bookingStatusLabel(displayStatus)}
            </Badge>
            {thread.last_message_at && <Badge tone="default">Updated {formatInboxDate(thread.last_message_at)}</Badge>}
          </>
        }
      />

      <div className="grid gap-8 xl:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="space-y-6 xl:sticky xl:top-8 xl:self-start">
          <Card className="p-5">
            <h2 className="text-base font-semibold text-[#252525]">Conversation details</h2>
            <p className="mt-2 text-sm text-[#777777]">{partner.name}</p>
            <p className="mt-1 text-sm text-[#777777]">{partner.meta || 'Booking conversation'}</p>
            {partner.href && (
              <Link href={partner.href} className="mt-3 inline-block text-sm font-semibold text-[#FD6A2F] hover:underline">
                View profile
              </Link>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="text-base font-semibold text-[#252525]">Actions</h2>
            <div className="mt-4 space-y-4">
              <ArchiveThreadControl threadId={thread.id} archived={archived} />
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
                bookingCountByDateId={bookingCountByDateId}
              />
            </div>
          </Card>
        </aside>

        <main className="flex min-h-[72vh] flex-col overflow-hidden rounded-2xl border border-[#E6E6E6] bg-white shadow-[0_14px_34px_rgba(20,20,20,0.04)]">
          <div className="border-b border-[#ECECEC] px-6 py-4">
            <h2 className="text-lg font-semibold text-[#252525]">{partner.name}</h2>
            <p className="mt-1 text-sm text-[#777777]">{partner.meta || 'Booking conversation'}</p>
          </div>
          <LiveConversation
            key={thread.id}
            threadId={thread.id}
            thread={thread}
            viewerSide={viewerSide}
            viewerUserId={user.id}
            initialMessages={messages}
            lastReadAt={lastReadAt}
            canReply={thread.status === 'accepted'}
            replyingAsName={activeIdentity.name}
          />
        </main>
      </div>
    </div>
  )
}
