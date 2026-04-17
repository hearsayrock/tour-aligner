import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { InboxRealtime } from '@/components/contact/InboxRealtime'
import {
  formatInboxDate,
  getPartnerHref,
  getPartnerLabel,
  getPartnerMeta,
  getViewerSide,
  hasUnread,
  isPendingIncoming,
  isPendingOutgoing,
  type InboxThread,
  THREAD_STATUS_LABELS,
} from '@/lib/contact'

export const metadata = { title: 'Inbox' }

const STATUS_STYLES = {
  pending: 'text-yellow-700 bg-yellow-50 border-yellow-200',
  accepted: 'text-[#0c7c71] bg-[#00bba5]/10 border-[#00bba5]/20',
  declined: 'text-[#666666] bg-[#F5F5F5] border-[#E8E8E8]',
  blocked: 'text-red-600 bg-red-50 border-red-200',
} as const

function ThreadCard({ thread, userId }: { thread: InboxThread; userId: string }) {
  const viewerSide = getViewerSide(thread, userId)
  if (!viewerSide) return null

  const unread = hasUnread(thread, viewerSide)
  const partnerHref = getPartnerHref(thread, viewerSide)

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
              {getPartnerLabel(thread, viewerSide)}
            </h2>
            {unread && <span className="w-2 h-2 rounded-full bg-[#FD6A2F] shrink-0" />}
          </div>
          <p className="text-sm text-[#888888] mt-1">
            {getPartnerMeta(thread, viewerSide) || 'Conversation'}
          </p>
          {partnerHref && (
            <span className="inline-block mt-2 text-xs text-[#888888] hover:text-[#252525] transition-colors">
              View profile
            </span>
          )}
        </div>
        <div className="shrink-0 text-right">
          <span
            className={`inline-flex text-xs font-medium px-2 py-0.5 rounded border ${
              STATUS_STYLES[thread.status]
            }`}
          >
            {THREAD_STATUS_LABELS[thread.status]}
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
}: {
  title: string
  threads: InboxThread[]
  userId: string
}) {
  if (threads.length === 0) return null

  return (
    <section>
      <h2 className="text-sm font-semibold text-[#888888] uppercase tracking-widest mb-4">
        {title}
      </h2>
      <div className="space-y-4">
        {threads.map((thread) => (
          <ThreadCard key={thread.id} thread={thread} userId={userId} />
        ))}
      </div>
    </section>
  )
}

export default async function InboxPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return redirect('/login')

  const { data: rawThreads } = await supabase
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
    .order('last_message_at', { ascending: false })
    .order('updated_at', { ascending: false })

  const threads = (rawThreads ?? []) as unknown as InboxThread[]
  const visibleThreads = threads.filter((thread) => !!getViewerSide(thread, user.id))

  const incomingPending = visibleThreads.filter((thread) => {
    const viewerSide = getViewerSide(thread, user.id)
    return !!viewerSide && isPendingIncoming(thread, viewerSide)
  })
  const outgoingPending = visibleThreads.filter((thread) => {
    const viewerSide = getViewerSide(thread, user.id)
    return !!viewerSide && isPendingOutgoing(thread, viewerSide)
  })
  const activeThreads = visibleThreads.filter((thread) => thread.status === 'accepted')
  const historyThreads = visibleThreads.filter(
    (thread) => thread.status === 'declined' || thread.status === 'blocked'
  )

  const hasAnything =
    incomingPending.length > 0 ||
    outgoingPending.length > 0 ||
    activeThreads.length > 0 ||
    historyThreads.length > 0

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <InboxRealtime />

      <div className="flex items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold">Inbox</h1>
          <p className="text-sm text-[#888888] mt-1">
            Contact requests, active conversations, and history all live here.
          </p>
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

      <div className="space-y-10">
        <Section title="Incoming Requests" threads={incomingPending} userId={user.id} />
        <Section title="Pending Requests" threads={outgoingPending} userId={user.id} />
        <Section title="Active Conversations" threads={activeThreads} userId={user.id} />
        <Section title="History" threads={historyThreads} userId={user.id} />
      </div>
    </div>
  )
}
