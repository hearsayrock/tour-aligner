import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { ProfileSelectionModal } from '@/components/dashboard/ProfileSelectionModal'
import { InboxRealtime } from '@/components/contact/InboxRealtime'
import { LivePrivateConversation } from '@/components/private-chat/LivePrivateConversation'
import { PrivateChatReadTracker } from '@/components/private-chat/PrivateChatReadTracker'
import { PrivateChatThreadActions } from '@/components/private-chat/PrivateChatThreadActions'
import { Badge, Card, PageHeader } from '@/components/ui/primitives'
import {
  ACTIVE_IDENTITY_COOKIE,
  resolveRequiredActiveIdentity,
  type ManagedIdentity,
} from '@/lib/managed-identity'
import {
  createPrivateChatProfileLookup,
  formatInboxDate,
  getPrivateChatConversationMeta,
  getPrivateChatConversationTitle,
  getPrivateChatLastReadAt,
  getPrivateChatPartner,
  getPrivateChatViewerSlot,
  hasUnreadPrivateChat,
  hydratePrivateChatMessage,
  hydratePrivateChatThread,
  isPrivateChatArchived,
  PRIVATE_CHAT_STATUS_LABELS,
  type InboxPrivateChatMessage,
  type PrivateChatBandLookupRow,
  type PrivateChatVenueLookupRow,
} from '@/lib/private-chat'
import type { PrivateChatMessage, PrivateChatThread } from '@/types/database'

export const metadata = { title: 'Private Chat' }

export default async function PrivateInboxThreadPage({
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
    supabase.from('private_chat_threads').select('*').eq('id', threadId).maybeSingle(),
    supabase
      .from('private_chat_messages')
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
  const threadBase = rawThread as PrivateChatThread | null

  if (!threadBase) return notFound()

  const bandIds = Array.from(
    new Set(
      [threadBase.participant_one_kind === 'band' ? threadBase.participant_one_id : null,
        threadBase.participant_two_kind === 'band' ? threadBase.participant_two_id : null]
        .filter((value): value is string => !!value)
    )
  )
  const venueIds = Array.from(
    new Set(
      [threadBase.participant_one_kind === 'venue' ? threadBase.participant_one_id : null,
        threadBase.participant_two_kind === 'venue' ? threadBase.participant_two_id : null]
        .filter((value): value is string => !!value)
    )
  )

  const [{ data: participantBands }, { data: participantVenues }] = await Promise.all([
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
    bands: (participantBands ?? []) as PrivateChatBandLookupRow[],
    venues: (participantVenues ?? []) as PrivateChatVenueLookupRow[],
  })

  const thread = hydratePrivateChatThread(threadBase, lookup)
  const messages = ((rawMessages ?? []) as Array<
    PrivateChatMessage & { profiles: { full_name: string | null } | Array<{ full_name: string | null }> | null }
  >)
    .map((message) =>
      hydratePrivateChatMessage(
        {
          ...message,
          profiles: Array.isArray(message.profiles) ? message.profiles[0] ?? null : message.profiles,
        },
        lookup
      )
    ) as InboxPrivateChatMessage[]

  const threadIdentities = identities.filter((identity) => !!getPrivateChatViewerSlot(thread, identity))

  if (requiredIdentity.requiresSelection) {
    if (threadIdentities.length === 0) return notFound()

    return (
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <PageHeader
          eyebrow="Inbox"
          title="Choose a profile"
          description="Private chats are tied to one artist or venue profile."
        />
        <ProfileSelectionModal
          title="Select a profile to view this private chat"
          body="Choose the artist or venue profile related to this private chat."
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
          description="The selected profile is not part of this private chat."
        />
        <ProfileSelectionModal
          title="Select a profile to view this private chat"
          body="Choose the artist or venue profile related to this private chat."
          identities={threadIdentities}
        />
      </div>
    )
  }

  const partner = getPrivateChatPartner(thread, activeIdentity)
  if (!partner) return notFound()

  const unread = hasUnreadPrivateChat(thread, activeIdentity)
  const lastReadAt = getPrivateChatLastReadAt(thread, activeIdentity)
  const archived = isPrivateChatArchived(thread, activeIdentity)

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <InboxRealtime privateThreadId={threadId} />
      <PrivateChatReadTracker threadId={threadId} actorIdentity={activeIdentity} shouldMark={unread} />
      <PageHeader
        backHref="/dashboard/inbox"
        backLabel="Back to inbox"
        eyebrow="Private Chat"
        title={getPrivateChatConversationTitle(thread, activeIdentity)}
        description={getPrivateChatConversationMeta(thread, activeIdentity)}
        actions={
          <>
            <Badge tone={thread.status === 'accepted' ? 'success' : thread.status === 'pending' ? 'warning' : thread.status === 'blocked' ? 'danger' : 'muted'}>
              {PRIVATE_CHAT_STATUS_LABELS[thread.status]}
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
            <p className="mt-1 text-sm text-[#777777]">{partner.meta || 'Private chat'}</p>
            {partner.href && (
              <Link href={partner.href} className="mt-3 inline-block text-sm font-semibold text-[#FD6A2F] hover:underline">
                View profile
              </Link>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="text-base font-semibold text-[#252525]">Actions</h2>
            <div className="mt-4">
              <PrivateChatThreadActions thread={thread} actorIdentity={activeIdentity} archived={archived} />
            </div>
          </Card>
        </aside>

        <main className="flex min-h-[72vh] flex-col overflow-hidden rounded-2xl border border-[#E6E6E6] bg-white shadow-[0_14px_34px_rgba(20,20,20,0.04)]">
          <div className="border-b border-[#ECECEC] px-6 py-4">
            <h2 className="text-lg font-semibold text-[#252525]">{partner.name}</h2>
            <p className="mt-1 text-sm text-[#777777]">{partner.meta || 'Private chat'}</p>
          </div>
          <LivePrivateConversation
            key={thread.id}
            threadId={thread.id}
            thread={thread}
            actorIdentity={activeIdentity}
            lookupEntries={Array.from(lookup.entries())}
            initialMessages={messages}
            lastReadAt={lastReadAt}
            canReply={thread.status === 'accepted'}
          />
        </main>
      </div>
    </div>
  )
}
