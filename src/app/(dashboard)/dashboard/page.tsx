import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  BOOKING_STATUS_LABELS,
  formatInboxDate,
  getThreadBookingStatus,
  getThreadDisplayStatus,
  getPartnerLabel,
  getViewerSide,
  hasUnread,
  isThreadArchived,
  isPendingIncoming,
  type InboxThread,
  THREAD_STATUS_LABELS,
} from '@/lib/contact'
import type { VenueClaim } from '@/types/database'

type SlimBand = { id: string; name: string; slug: string }
type SlimVenue = {
  id: string
  name: string
  slug: string
  location_city: string
  location_state: string
}
type SlimProfile = { full_name: string | null }
type PendingClaim = Pick<VenueClaim, 'id' | 'created_at'> & { venues: SlimVenue | null }

export const metadata = { title: 'Dashboard' }

const STATUS_STYLES = {
  pending: 'text-yellow-700 bg-yellow-50 border-yellow-200',
  accepted: 'text-sky-700 bg-blue-50 border-blue-200',
  declined: 'text-[#666666] bg-[#F5F5F5] border-[#E8E8E8]',
  blocked: 'text-red-600 bg-red-50 border-red-200',
  confirmed: 'text-[#14584E] bg-[#F3FBF8] border-[#CBEAE2]',
  cancellation_requested: 'text-[#8A5A12] bg-[#FFF7E8] border-[#F2D7A6]',
  cancelled: 'text-[#666666] bg-[#F5F5F5] border-[#E8E8E8]',
} as const

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return redirect('/login')

  const [
    { data: rawProfile },
    { data: rawBands },
    { data: rawVenues },
    { data: rawPendingClaims },
    { data: rawThreads },
  ] = await Promise.all([
    supabase.from('profiles').select('full_name').eq('id', user.id).single(),
    supabase.from('bands').select('id, name, slug').eq('user_id', user.id).order('created_at', { ascending: false }),
    supabase.from('venues').select('id, name, slug, location_city, location_state').eq('claimed_by_user_id', user.id).order('name'),
    supabase
      .from('venue_claims')
      .select('id, created_at, venues(id, name, slug, location_city, location_state)')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false }),
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
  ])

  const threadIds = ((rawThreads ?? []) as Array<{ id: string }>).map((t) => t.id)
  const { data: rawBookings } = threadIds.length > 0
    ? await supabase
        .from('bookings')
        .select('thread_id, status, updated_at')
        .in('thread_id', threadIds)
        .order('updated_at', { ascending: false })
    : { data: [] }

  const profile = rawProfile as SlimProfile | null
  const bands = rawBands as SlimBand[] | null
  const venues = rawVenues as SlimVenue[] | null
  const pendingClaims = rawPendingClaims as unknown as PendingClaim[] | null
  const threads = (rawThreads ?? []) as unknown as InboxThread[]

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

  const visibleThreads = threads.filter((thread) => !!getViewerSide(thread, user.id))
  const activeVisibleThreads = visibleThreads.filter((thread) => {
    const viewerSide = getViewerSide(thread, user.id)
    return !!viewerSide && !isThreadArchived(thread, viewerSide)
  })
  const incomingRequests = activeVisibleThreads.filter((thread) => {
    const viewerSide = getViewerSide(thread, user.id)
    return !!viewerSide && isPendingIncoming(thread, viewerSide)
  })
  const recentThreads = activeVisibleThreads
    .filter((thread) => thread.status === 'accepted' || thread.status === 'pending' || bookingStatusByThreadId.has(thread.id))
    .slice(0, 5)
  const inboxAlertCount = activeVisibleThreads.filter((thread) => {
    const viewerSide = getViewerSide(thread, user.id)
    return !!viewerSide && (isPendingIncoming(thread, viewerSide) || hasUnread(thread, viewerSide))
  }).length

  const displayName = profile?.full_name?.split(' ')[0] ?? 'there'
  const bandCount = (bands ?? []).length
  const venueCount = (venues ?? []).length
  const pendingClaimCount = (pendingClaims ?? []).length
  const isNewUser = bandCount === 0 && venueCount === 0 && pendingClaimCount === 0

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Hey, {displayName}</h1>
        <p className="text-[#888888] text-sm mt-1">Here&apos;s what&apos;s happening in your tour pipeline.</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-10">
        <Link
          href="/dashboard/bands"
          className="bg-[#FFFFFF] border border-[#E8E8E8] rounded-xl p-5 hover:border-[#CCCCCC] transition-colors"
        >
          <p className="text-3xl font-bold">{bandCount}</p>
          <p className="text-sm text-[#888888] mt-1">{bandCount === 1 ? 'Artist' : 'Artists'}</p>
        </Link>

        <Link
          href="/dashboard/venues"
          className="bg-[#FFFFFF] border border-[#E8E8E8] rounded-xl p-5 hover:border-[#CCCCCC] transition-colors"
        >
          <p className="text-3xl font-bold">{venueCount}</p>
          <p className="text-sm text-[#888888] mt-1">{venueCount === 1 ? 'Venue' : 'Venues'}</p>
        </Link>

        <Link
          href="/dashboard/inbox"
          className={`bg-[#FFFFFF] border rounded-xl p-5 hover:border-[#CCCCCC] transition-colors ${
            inboxAlertCount > 0 ? 'border-[#FD6A2F]/30' : 'border-[#E8E8E8]'
          }`}
        >
          <p className={`text-3xl font-bold ${inboxAlertCount > 0 ? 'text-[#FD6A2F]' : ''}`}>
            {inboxAlertCount}
          </p>
          <p className="text-sm text-[#888888] mt-1">Inbox alerts</p>
        </Link>
      </div>

      {isNewUser && (
        <div className="bg-[#FFFFFF] border border-[#E8E8E8] rounded-2xl p-10 text-center mb-10">
          <h2 className="text-lg font-semibold mb-2">Get started</h2>
          <p className="text-sm text-[#888888] mb-6 max-w-sm mx-auto">
            Create an artist profile to start reaching out to venues, or claim a venue to start receiving contact requests.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/dashboard/bands/new"
              className="w-full sm:w-auto bg-[#FD6A2F] text-white font-semibold rounded-lg px-5 py-2.5 text-sm hover:bg-[#E55A22] transition-colors"
            >
              Create an artist
            </Link>
            <Link
              href="/dashboard/venues"
              className="w-full sm:w-auto border border-[#E8E8E8] text-[#252525] font-semibold rounded-lg px-5 py-2.5 text-sm hover:border-[#CCCCCC] hover:bg-[#F0F0F0] transition-colors"
            >
              Browse venues to claim
            </Link>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {incomingRequests.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-[#888888] uppercase tracking-widest">
                Needs your response
              </h2>
              <Link href="/dashboard/inbox" className="text-xs text-[#888888] hover:text-[#252525] transition-colors">
                View inbox →
              </Link>
            </div>
            <div className="space-y-3">
              {incomingRequests.slice(0, 4).map((thread) => {
                const viewerSide = getViewerSide(thread, user.id)
                if (!viewerSide) return null

                return (
                  <Link
                    key={thread.id}
                    href={`/dashboard/inbox/${thread.id}`}
                    className="block bg-[#FFFFFF] border border-yellow-200 rounded-xl p-4 hover:border-yellow-300 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{getPartnerLabel(thread, viewerSide)}</p>
                        <p className="text-xs text-[#888888] mt-0.5">
                          {formatInboxDate(thread.last_message_at ?? thread.created_at)}
                        </p>
                      </div>
                      <span className="w-2 h-2 rounded-full bg-[#FD6A2F] mt-1 shrink-0" />
                    </div>
                  </Link>
                )
              })}
            </div>
          </section>
        )}

        {recentThreads.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-[#888888] uppercase tracking-widest">
                Recent conversations
              </h2>
              <Link href="/dashboard/inbox" className="text-xs text-[#888888] hover:text-[#252525] transition-colors">
                View all →
              </Link>
            </div>
            <div className="space-y-3">
              {recentThreads.map((thread) => {
                const viewerSide = getViewerSide(thread, user.id)
                if (!viewerSide) return null

                const unread = hasUnread(thread, viewerSide)
                const bookingStatus = bookingStatusByThreadId.get(thread.id) ?? null
                const displayStatus = getThreadDisplayStatus(thread.status, bookingStatus)
                const displayStatusLabel = bookingStatus ? BOOKING_STATUS_LABELS[bookingStatus] : THREAD_STATUS_LABELS[thread.status]
                const displayStatusStyle = STATUS_STYLES[displayStatus]

                return (
                  <Link
                    key={thread.id}
                    href={`/dashboard/inbox/${thread.id}`}
                    className="block bg-[#FFFFFF] border border-[#E8E8E8] rounded-xl p-4 hover:border-[#CCCCCC] transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm truncate">{getPartnerLabel(thread, viewerSide)}</p>
                          {unread && <span className="w-2 h-2 rounded-full bg-[#FD6A2F] shrink-0" />}
                        </div>
                        <p className="text-xs text-[#888888] mt-0.5">
                          {formatInboxDate(thread.last_message_at ?? thread.updated_at)}
                        </p>
                      </div>
                      <span
                        className={`inline-flex text-xs font-medium px-2 py-0.5 rounded border ${displayStatusStyle}`}
                      >
                        {displayStatusLabel}
                      </span>
                    </div>
                  </Link>
                )
              })}
            </div>
          </section>
        )}

        {bandCount > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-[#888888] uppercase tracking-widest">
                My Artists
              </h2>
              <Link href="/dashboard/bands" className="text-xs text-[#888888] hover:text-[#252525] transition-colors">
                Manage →
              </Link>
            </div>
            <div className="space-y-2">
              {(bands ?? []).slice(0, 4).map((band) => (
                <div
                  key={band.id}
                  className="bg-[#FFFFFF] border border-[#E8E8E8] rounded-xl px-4 py-3 flex items-center justify-between gap-4"
                >
                  <p className="font-medium text-sm truncate">{band.name}</p>
                  <div className="flex items-center gap-3 shrink-0">
                    <Link
                      href={`/bands/${band.slug}`}
                      target="_blank"
                      className="text-xs text-[#888888] hover:text-[#252525] transition-colors"
                    >
                      View
                    </Link>
                    <Link
                      href={`/dashboard/bands/${band.id}/edit`}
                      className="text-xs text-[#888888] hover:text-[#252525] transition-colors"
                    >
                      Edit
                    </Link>
                  </div>
                </div>
              ))}
              <Link
                href="/dashboard/bands/new"
                className="block text-center text-xs text-[#FD6A2F] hover:underline py-2"
              >
                + Add Artist
              </Link>
            </div>
          </section>
        )}

        {pendingClaimCount > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-[#888888] uppercase tracking-widest">
                Pending claims
              </h2>
            </div>
            <div className="space-y-2">
              {(pendingClaims ?? []).map((claim) => {
                if (!claim.venues) return null
                return (
                  <div
                    key={claim.id}
                    className="bg-[#FFFFFF] border border-yellow-200 rounded-xl px-4 py-3 flex items-center justify-between gap-4"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{claim.venues.name}</p>
                      <p className="text-xs text-[#888888] mt-0.5">
                        {claim.venues.location_city}, {claim.venues.location_state}
                      </p>
                    </div>
                    <span className="text-xs font-medium text-yellow-700 bg-yellow-50 border border-yellow-200 rounded px-2 py-0.5 shrink-0">
                      Pending
                    </span>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {venueCount > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-[#888888] uppercase tracking-widest">
                My venues
              </h2>
              <Link href="/dashboard/venues" className="text-xs text-[#888888] hover:text-[#252525] transition-colors">
                Manage →
              </Link>
            </div>
            <div className="space-y-2">
              {(venues ?? []).slice(0, 4).map((venue) => (
                <div
                  key={venue.id}
                  className="bg-[#FFFFFF] border border-[#E8E8E8] rounded-xl px-4 py-3 flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{venue.name}</p>
                    <p className="text-xs text-[#888888]">
                      {venue.location_city}, {venue.location_state}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <Link
                      href={`/venues/${venue.slug}`}
                      target="_blank"
                      className="text-xs text-[#888888] hover:text-[#252525] transition-colors"
                    >
                      View
                    </Link>
                    <Link
                      href={`/dashboard/venues/${venue.id}/edit`}
                      className="text-xs text-[#888888] hover:text-[#252525] transition-colors"
                    >
                      Edit
                    </Link>
                  </div>
                </div>
              ))}
              <Link
                href="/dashboard/venues"
                className="block text-center text-xs text-[#FD6A2F] hover:underline py-2"
              >
                + Claim a venue
              </Link>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
