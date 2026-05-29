import Link from 'next/link'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { Inbox, MessageSquare, MessagesSquare } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { ProfileSelectionModal } from '@/components/dashboard/ProfileSelectionModal'
import { InboxRealtime } from '@/components/contact/InboxRealtime'
import { InboxViewSelect } from '@/components/contact/InboxViewSelect'
import { Badge, Card, EmptyState, PageHeader, SectionHeading } from '@/components/ui/primitives'
import {
  formatInboxDate,
  getPartnerEntity,
  getThreadBookingStatus,
  getThreadDisplayStatus,
  hasUnread,
  isPendingIncoming,
  isPendingOutgoing,
  isThreadArchived,
  THREAD_STATUS_LABELS,
  type InboxThread,
} from '@/lib/contact'
import {
  ACTIVE_IDENTITY_COOKIE,
  resolveRequiredActiveIdentity,
  type ManagedIdentity,
} from '@/lib/managed-identity'
import {
  createPrivateChatProfileLookup,
  formatInboxDate as formatPrivateInboxDate,
  getPrivateChatConversationMeta,
  getPrivateChatConversationTitle,
  getPrivateChatViewerSlot,
  hasUnreadPrivateChat,
  hydratePrivateChatThread,
  isIncomingPrivateChatRequest,
  isOutgoingPrivateChatRequest,
  isPrivateChatArchived,
  PRIVATE_CHAT_STATUS_LABELS,
  type InboxPrivateChatThread,
  type PrivateChatBandLookupRow,
  type PrivateChatVenueLookupRow,
} from '@/lib/private-chat'
import type { Booking, PrivateChatThread } from '@/types/database'

export const metadata = { title: 'Inbox' }

type BookingThreadRow = InboxThread & {
  bookings: Array<Pick<Booking, 'status'>> | null
}

function bookingStatusLabel(status: ReturnType<typeof getThreadDisplayStatus>) {
  if (status in THREAD_STATUS_LABELS) {
    return THREAD_STATUS_LABELS[status as keyof typeof THREAD_STATUS_LABELS]
  }

  if (status === 'cancellation_requested') return 'Cancellation requested'
  if (status === 'confirmed') return 'Confirmed'
  return 'Cancelled'
}

async function loadPrivateChatThreads(
  supabase: Awaited<ReturnType<typeof createClient>>,
  activeIdentity: ManagedIdentity
) {
  const { data: rawPrivateThreads } = await supabase
    .from('private_chat_threads')
    .select('*')
    .order('last_message_at', { ascending: false, nullsFirst: false })

  const privateThreads = ((rawPrivateThreads ?? []) as PrivateChatThread[]).filter((thread) =>
    !!getPrivateChatViewerSlot(thread, activeIdentity)
  )

  const bandIds = Array.from(
    new Set(
      privateThreads
        .flatMap((thread) => [
          thread.participant_one_kind === 'band' ? thread.participant_one_id : null,
          thread.participant_two_kind === 'band' ? thread.participant_two_id : null,
        ])
        .filter((value): value is string => !!value)
    )
  )
  const venueIds = Array.from(
    new Set(
      privateThreads
        .flatMap((thread) => [
          thread.participant_one_kind === 'venue' ? thread.participant_one_id : null,
          thread.participant_two_kind === 'venue' ? thread.participant_two_id : null,
        ])
        .filter((value): value is string => !!value)
    )
  )

  const [{ data: rawBands }, { data: rawVenues }] = await Promise.all([
    bandIds.length
      ? supabase.from('bands').select('id, name, slug, user_id').in('id', bandIds)
      : Promise.resolve({ data: [] }),
    venueIds.length
      ? supabase
          .from('venues')
          .select('id, name, slug, location_city, location_state, claimed_by_user_id')
          .in('id', venueIds)
      : Promise.resolve({ data: [] }),
  ])

  const lookup = createPrivateChatProfileLookup({
    bands: (rawBands ?? []) as PrivateChatBandLookupRow[],
    venues: (rawVenues ?? []) as PrivateChatVenueLookupRow[],
  })

  return privateThreads.map((thread) => hydratePrivateChatThread(thread, lookup))
}

function PrivateChatListCard({
  thread,
  activeIdentity,
}: {
  thread: InboxPrivateChatThread
  activeIdentity: ManagedIdentity
}) {
  const hasUnreadState = hasUnreadPrivateChat(thread, activeIdentity)
  const incomingPending = isIncomingPrivateChatRequest(thread, activeIdentity)
  const outgoingPending = isOutgoingPrivateChatRequest(thread, activeIdentity)

  return (
    <Link
      href={`/dashboard/inbox/private/${thread.id}`}
      className="block rounded-2xl border border-[#E6E6E6] bg-white p-5 shadow-[0_12px_28px_rgba(20,20,20,0.035)] transition-all hover:-translate-y-0.5 hover:border-[#D0D0D0] hover:shadow-[0_18px_38px_rgba(20,20,20,0.07)]"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-[#202020]">{getPrivateChatConversationTitle(thread, activeIdentity)}</h2>
            <Badge tone={thread.status === 'accepted' ? 'success' : thread.status === 'pending' ? 'warning' : thread.status === 'blocked' ? 'danger' : 'muted'}>
              {PRIVATE_CHAT_STATUS_LABELS[thread.status]}
            </Badge>
            {hasUnreadState && <Badge tone="brand">Unread</Badge>}
          </div>
          <p className="mt-2 text-sm text-[#666666]">{getPrivateChatConversationMeta(thread, activeIdentity) || 'Private chat'}</p>
          <p className="mt-2 text-sm text-[#777777]">
            {incomingPending
              ? 'Waiting for your approval.'
              : outgoingPending
                ? 'Waiting for their approval.'
                : thread.status === 'blocked'
                  ? 'Future contact is blocked.'
                  : thread.status === 'declined'
                    ? 'This chat was denied.'
                    : 'Open private conversation.'}
          </p>
        </div>
        <div className="text-right text-xs text-[#888888]">
          {thread.last_message_at ? formatPrivateInboxDate(thread.last_message_at) : 'No activity yet'}
        </div>
      </div>
    </Link>
  )
}

function BookingThreadListCard({
  thread,
  activeIdentity,
}: {
  thread: BookingThreadRow
  activeIdentity: ManagedIdentity
}) {
  const viewerSide = activeIdentity.kind
  const partner = getPartnerEntity(thread, viewerSide)
  const bookingStatus = getThreadBookingStatus((thread.bookings ?? []).map((booking) => booking.status))
  const displayStatus = getThreadDisplayStatus(thread.status, bookingStatus)
  const unread = hasUnread(thread, viewerSide)

  return (
    <Link
      href={`/dashboard/inbox/bookings/${thread.id}`}
      className="block rounded-2xl border border-[#E6E6E6] bg-white p-5 shadow-[0_12px_28px_rgba(20,20,20,0.035)] transition-all hover:-translate-y-0.5 hover:border-[#D0D0D0] hover:shadow-[0_18px_38px_rgba(20,20,20,0.07)]"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-[#202020]">{partner.name}</h2>
            <Badge tone={displayStatus === 'confirmed' ? 'success' : displayStatus === 'pending' ? 'warning' : displayStatus === 'blocked' ? 'danger' : 'muted'}>
              {bookingStatusLabel(displayStatus)}
            </Badge>
            {unread && <Badge tone="brand">Unread</Badge>}
          </div>
          <p className="mt-2 text-sm text-[#666666]">{partner.meta || 'Booking conversation'}</p>
          <p className="mt-2 text-sm text-[#777777]">
            {isPendingIncoming(thread, viewerSide)
              ? 'Waiting for your response.'
              : isPendingOutgoing(thread, viewerSide)
                ? 'Waiting for their response.'
                : 'Booking conversation.'}
          </p>
        </div>
        <div className="text-right text-xs text-[#888888]">
          {thread.last_message_at ? formatInboxDate(thread.last_message_at) : 'No activity yet'}
        </div>
      </div>
    </Link>
  )
}

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>
}) {
  const { view: rawView } = await searchParams
  const view = rawView === 'archived' ? 'archived' : 'active'

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return redirect('/login')

  const [{ data: bands }, { data: venues }] = await Promise.all([
    supabase.from('bands').select('id, name').eq('user_id', user.id).eq('is_active', true).order('name'),
    supabase.from('venues').select('id, name').eq('claimed_by_user_id', user.id).eq('is_active', true).order('name'),
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

  if (requiredIdentity.requiresSelection) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <PageHeader
          eyebrow="Inbox"
          title="Choose a profile"
          description="Private chats and booking conversations are filtered by one artist or venue profile."
        />
        <ProfileSelectionModal
          title="Select a profile to view the inbox"
          body="Choose the artist or venue profile you want to use for private chats and booking threads."
          identities={identities}
        />
      </div>
    )
  }

  const activeIdentity = requiredIdentity.activeIdentity
  if (!activeIdentity) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <EmptyState
          title="No profiles yet"
          description="Create or claim an artist or venue profile before using the inbox."
        />
      </div>
    )
  }

  const [privateThreads, rawBookingThreadsResult] = await Promise.all([
    loadPrivateChatThreads(supabase, activeIdentity),
    activeIdentity.kind === 'band'
      ? supabase
          .from('contact_threads')
          .select(`
            *,
            bands(id, name, slug, user_id),
            venues(id, name, slug, location_city, location_state, claimed_by_user_id, default_bill_cap),
            bookings(status)
          `)
          .eq('band_id', activeIdentity.id)
          .order('last_message_at', { ascending: false, nullsFirst: false })
      : supabase
          .from('contact_threads')
          .select(`
            *,
            bands(id, name, slug, user_id),
            venues(id, name, slug, location_city, location_state, claimed_by_user_id, default_bill_cap),
            bookings(status)
          `)
          .eq('venue_id', activeIdentity.id)
          .order('last_message_at', { ascending: false, nullsFirst: false }),
  ])

  const bookingThreads = (rawBookingThreadsResult.data ?? []) as unknown as BookingThreadRow[]

  const visiblePrivateThreads = privateThreads.filter((thread) =>
    view === 'archived'
      ? isPrivateChatArchived(thread, activeIdentity)
      : !isPrivateChatArchived(thread, activeIdentity)
  )
  const visibleBookingThreads = bookingThreads.filter((thread) => {
    const viewerSide = activeIdentity.kind
    return view === 'archived' ? isThreadArchived(thread, viewerSide) : !isThreadArchived(thread, viewerSide)
  })

  const privateUnreadCount = privateThreads.filter(
    (thread) => !isPrivateChatArchived(thread, activeIdentity) && hasUnreadPrivateChat(thread, activeIdentity)
  ).length
  const bookingUnreadCount = bookingThreads.filter((thread) => {
    const viewerSide = activeIdentity.kind
    return !isThreadArchived(thread, viewerSide) && hasUnread(thread, viewerSide)
  }).length

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <InboxRealtime />
      <PageHeader
        eyebrow="Inbox"
        title={`${activeIdentity.name} inbox`}
        description="Private chats and booking conversations for the selected profile."
        actions={<InboxViewSelect value={view} />}
      />

      {visiblePrivateThreads.length === 0 && visibleBookingThreads.length === 0 ? (
        <EmptyState
          title={view === 'archived' ? 'No archived conversations' : 'No inbox conversations yet'}
          description={
            view === 'archived'
              ? 'Archived private chats and booking threads will appear here.'
              : 'Start a private chat from a profile page or request booking contact to open your inbox.'
          }
          action={
            <Link
              href="/events"
              className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#E2E2E2] bg-white px-4 py-2 text-sm font-semibold text-[#252525] transition-colors hover:border-[#CFCFCF] hover:bg-[#F6F6F6]"
            >
              Browse events
            </Link>
          }
        />
      ) : (
        <div className="space-y-10">
          <section>
            <SectionHeading
              title="Private Chats"
              description="One-on-one conversations between managed artist and venue profiles."
              action={
                <div className="flex items-center gap-2">
                  <Badge tone="default">
                    <MessageSquare className="h-3.5 w-3.5" />
                    {visiblePrivateThreads.length}
                  </Badge>
                  {privateUnreadCount > 0 && <Badge tone="brand">{privateUnreadCount} unread</Badge>}
                </div>
              }
            />
            {visiblePrivateThreads.length === 0 ? (
              <Card className="px-6 py-8 text-center text-sm text-[#777777]">
                No {view === 'archived' ? 'archived ' : ''}private chats for this profile.
              </Card>
            ) : (
              <div className="space-y-4">
                {visiblePrivateThreads.map((thread) => (
                  <PrivateChatListCard key={thread.id} thread={thread} activeIdentity={activeIdentity} />
                ))}
              </div>
            )}
          </section>

          <section>
            <SectionHeading
              title="Booking Threads"
              description="Booking-specific conversations that still drive contact and scheduling."
              action={
                <div className="flex items-center gap-2">
                  <Badge tone="default">
                    <Inbox className="h-3.5 w-3.5" />
                    {visibleBookingThreads.length}
                  </Badge>
                  {bookingUnreadCount > 0 && <Badge tone="brand">{bookingUnreadCount} unread</Badge>}
                </div>
              }
            />
            {visibleBookingThreads.length === 0 ? (
              <Card className="px-6 py-8 text-center text-sm text-[#777777]">
                No {view === 'archived' ? 'archived ' : ''}booking threads for this profile.
              </Card>
            ) : (
              <div className="space-y-4">
                {visibleBookingThreads.map((thread) => (
                  <BookingThreadListCard key={thread.id} thread={thread} activeIdentity={activeIdentity} />
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      <div className="mt-10 rounded-2xl border border-[#E6E6E6] bg-[#FCFCFC] px-5 py-4 text-sm text-[#666666]">
        <div className="flex items-center gap-2 font-medium text-[#252525]">
          <MessagesSquare className="h-4 w-4 text-[#FD6A2F]" />
          Inbox notifications
        </div>
        <p className="mt-2">
          Unread private messages and pending approvals will keep the Inbox badge active until you open the thread and it is marked read.
        </p>
      </div>
    </div>
  )
}
