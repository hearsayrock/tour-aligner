import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { ActivityHeartbeat } from '@/components/auth/ActivityHeartbeat'
import { InboxRealtime } from '@/components/contact/InboxRealtime'
import { DashboardNav } from '@/components/dashboard/DashboardNav'
import { Navbar } from '@/components/marketing/Navbar'
import { isStagingEnvironment } from '@/lib/deployment-environment'
import { ACTIVE_IDENTITY_COOKIE, resolveActiveIdentity, type ManagedIdentity } from '@/lib/managed-identity'

/**
 * Renders DashboardNav for logged-in users and Navbar for logged-out users.
 * Use this in all layouts so the nav is always consistent.
 */
export async function AppNav() {
  const showStagingBadge = isStagingEnvironment()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return <Navbar />

  const [
    { data: rawProfile },
    { count: userPendingClaimCount },
    { data: rawBands },
    { data: rawVenues },
  ] = await Promise.all([
    supabase.from('profiles').select('is_admin').eq('id', user.id).single(),
    supabase.from('venue_claims').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'pending'),
    supabase.from('bands').select('id, name, slug').eq('user_id', user.id).eq('is_active', true).order('name'),
    supabase.from('venues').select('id, name, slug').eq('claimed_by_user_id', user.id).eq('is_active', true).order('name'),
  ])

  const profile = rawProfile as { is_admin: boolean } | null
  const bands = (rawBands ?? []) as Array<{ id: string; name: string; slug: string }>
  const venues = (rawVenues ?? []) as Array<{ id: string; name: string; slug: string }>
  const bandIds = bands.map((b) => b.id)
  const venueIds = venues.map((v) => v.id)
  const identities: ManagedIdentity[] = [
    ...bands.map((band) => ({
      kind: 'band' as const,
      id: band.id,
      name: band.name,
      href: `/dashboard/bands/${band.id}/edit`,
    })),
    ...venues.map((venue) => ({
      kind: 'venue' as const,
      id: venue.id,
      name: venue.name,
      href: `/dashboard/venues/${venue.id}/edit`,
    })),
  ]
  const cookieStore = await cookies()
  const activeIdentity = resolveActiveIdentity(cookieStore.get(ACTIVE_IDENTITY_COOKIE)?.value, identities)

  const adminClaimsResult = profile?.is_admin
    ? await supabase.from('venue_claims').select('id', { count: 'exact', head: true }).eq('status', 'pending')
    : { count: 0 }
  const [{ count: invitedMembershipCount }, { data: venueEventIds }, { data: bookingThreads }, { data: privateThreads }] = await Promise.all([
    bandIds.length
      ? supabase
          .from('event_artist_memberships')
          .select('id', { count: 'exact', head: true })
          .in('band_id', bandIds)
          .eq('status', 'invited')
      : Promise.resolve({ count: 0 }),
    venueIds.length
      ? supabase
          .from('events')
          .select('id')
          .in('venue_id', venueIds)
          .in('status', ['draft', 'active'])
      : Promise.resolve({ data: [] }),
    supabase
      .from('contact_threads')
      .select('band_id, venue_id, status, requested_by_side, last_message_at, band_last_read_at, venue_last_read_at'),
    supabase
      .from('private_chat_threads')
      .select(`
        participant_one_kind,
        participant_one_id,
        participant_two_kind,
        participant_two_id,
        status,
        requested_by_kind,
        requested_by_id,
        last_message_at,
        participant_one_last_read_at,
        participant_two_last_read_at
      `),
  ])
  const eventIds = (venueEventIds ?? []).map((event) => event.id)
  const { count: venueApplicationCount } = eventIds.length
    ? await supabase
        .from('event_artist_memberships')
        .select('id', { count: 'exact', head: true })
        .in('event_id', eventIds)
        .eq('status', 'applied')
    : { count: 0 }

  const hasBookingInboxAttention = (bookingThreads ?? []).some((thread) => {
    const threadBandId = thread.band_id
    const threadVenueId = thread.venue_id
    const matchesBand = bandIds.includes(threadBandId)
    const matchesVenue = venueIds.includes(threadVenueId)

    const bandNeedsAttention = matchesBand && (
      (thread.status === 'pending' && thread.requested_by_side !== 'band') ||
      (!!thread.last_message_at && (!thread.band_last_read_at || new Date(thread.last_message_at).getTime() > new Date(thread.band_last_read_at).getTime()))
    )

    const venueNeedsAttention = matchesVenue && (
      (thread.status === 'pending' && thread.requested_by_side !== 'venue') ||
      (!!thread.last_message_at && (!thread.venue_last_read_at || new Date(thread.last_message_at).getTime() > new Date(thread.venue_last_read_at).getTime()))
    )

    return bandNeedsAttention || venueNeedsAttention
  })

  const hasPrivateInboxAttention = (privateThreads ?? []).some((thread) => {
    const participantOneNeedsAttention =
      ((thread.participant_one_kind === 'band' && bandIds.includes(thread.participant_one_id)) ||
        (thread.participant_one_kind === 'venue' && venueIds.includes(thread.participant_one_id))) &&
      (
        (thread.status === 'pending' &&
          !(thread.requested_by_kind === thread.participant_one_kind && thread.requested_by_id === thread.participant_one_id)) ||
        (!!thread.last_message_at &&
          (!thread.participant_one_last_read_at ||
            new Date(thread.last_message_at).getTime() > new Date(thread.participant_one_last_read_at).getTime()))
      )

    const participantTwoNeedsAttention =
      ((thread.participant_two_kind === 'band' && bandIds.includes(thread.participant_two_id)) ||
        (thread.participant_two_kind === 'venue' && venueIds.includes(thread.participant_two_id))) &&
      (
        (thread.status === 'pending' &&
          !(thread.requested_by_kind === thread.participant_two_kind && thread.requested_by_id === thread.participant_two_id)) ||
        (!!thread.last_message_at &&
          (!thread.participant_two_last_read_at ||
            new Date(thread.last_message_at).getTime() > new Date(thread.participant_two_last_read_at).getTime()))
      )

    return participantOneNeedsAttention || participantTwoNeedsAttention
  })

  const notifications = {
    inbox:         hasBookingInboxAttention || hasPrivateInboxAttention,
    backstage:     (invitedMembershipCount ?? 0) > 0 || (venueApplicationCount ?? 0) > 0,
    pendingClaims: (userPendingClaimCount ?? 0) > 0,
    adminClaims:   (adminClaimsResult.count ?? 0) > 0,
  }

  return (
    <>
      <ActivityHeartbeat />
      <InboxRealtime />
      <DashboardNav
        showStagingBadge={showStagingBadge}
        isAdmin={profile?.is_admin ?? false}
        phaseOne
        notifications={notifications}
        hasVenues={venueIds.length > 0}
        activeIdentity={activeIdentity}
        identities={identities}
      />
    </>
  )
}
