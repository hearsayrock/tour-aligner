import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { ProfileSelectionModal } from '@/components/dashboard/ProfileSelectionModal'
import { LinkifiedText } from '@/components/contact/LinkifiedText'
import {
  BackstageComposer,
  BackstageLogisticsForm,
  BackstageSettingsForm,
  InviteArtistForm,
  MembershipActionButton,
} from '@/components/events/BackstageForms'
import {
  EVENT_STATUS_LABELS,
  MEMBERSHIP_STATUS_LABELS,
  formatEventDateLong,
  getAcceptedMemberships,
  getOpenArtistNeed,
  type BackstageMessageSummary,
  type EventMembershipSummary,
  type EventWithVenue,
} from '@/lib/events'
import { ACTIVE_IDENTITY_COOKIE, resolveRequiredActiveIdentity, type ManagedIdentity } from '@/lib/managed-identity'
import type { EventGenre, Genre } from '@/types/database'

export const metadata = { title: 'Backstage' }

function LogisticsDisplay({ event }: { event: EventWithVenue }) {
  const rows = [
    ['Load-in', event.logistics_load_in],
    ['Soundcheck', event.logistics_soundcheck],
    ['Set times', event.logistics_set_times],
    ['Backline / gear', event.logistics_backline],
    ['Artists should bring', event.logistics_artist_should_bring],
    ['Parking / access', event.logistics_parking_access],
    ['General notes', event.logistics_notes],
  ].filter(([, value]) => !!value)

  if (rows.length === 0) {
    return <p className="text-sm text-[#888888]">No pinned logistics yet.</p>
  }

  return (
    <div className="space-y-3">
      {rows.map(([label, value]) => (
        <div key={label} className="rounded-xl border border-[#E8E8E8] bg-[#FCFCFC] px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#888888]">{label}</p>
          <LinkifiedText text={value ?? ''} className="mt-1 whitespace-pre-wrap text-sm text-[#252525]" />
        </div>
      ))}
    </div>
  )
}

function MessageList({ messages }: { messages: BackstageMessageSummary[] }) {
  if (messages.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[#E8E8E8] bg-white px-6 py-10 text-center text-sm text-[#888888]">
        No Backstage messages yet.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {messages.map((message) => {
        const isSystem = message.sender_kind === 'system'
        const sender =
          message.sender_kind === 'venue'
            ? 'Venue'
            : message.sender_kind === 'artist'
              ? message.bands?.name ?? 'Artist'
              : 'System'

        return (
          <div key={message.id} className={isSystem ? 'flex justify-center' : ''}>
            <div className={isSystem ? 'max-w-xl rounded-full border border-[#E8E8E8] bg-[#F5F5F5] px-4 py-2 text-xs text-[#666666]' : 'rounded-2xl border border-[#E8E8E8] bg-white px-4 py-3'}>
              {!isSystem && (
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-widest text-[#888888]">{sender}</p>
                  <p className="text-xs text-[#AAAAAA]">
                    {new Date(message.created_at).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              )}
              <LinkifiedText text={message.body} className="whitespace-pre-wrap text-sm leading-relaxed text-[#252525]" />
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default async function BackstageDetailPage({
  params,
}: {
  params: Promise<{ eventId: string }>
}) {
  const { eventId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return redirect('/login')

  const [
    { data: rawEvent },
    { data: rawGenres },
    { data: rawMemberships },
    { data: rawMessages },
    { data: rawUserBands },
    { data: rawUserVenues },
  ] = await Promise.all([
    supabase
      .from('events')
      .select('*, venues(id, name, slug, location_city, location_state, claimed_by_user_id)')
      .eq('id', eventId)
      .single(),
    supabase.from('event_genres').select('event_id, genre_id, genres(id, name)').eq('event_id', eventId),
    supabase
      .from('event_artist_memberships')
      .select('*, bands(id, name, slug, user_id)')
      .eq('event_id', eventId)
      .order('updated_at', { ascending: false }),
    supabase
      .from('backstage_messages')
      .select('*, profiles(full_name), bands:sender_band_id(name)')
      .eq('event_id', eventId)
      .order('created_at', { ascending: true }),
    supabase.from('bands').select('id, name').eq('user_id', user.id).eq('is_active', true).order('name'),
    supabase.from('venues').select('id, name').eq('claimed_by_user_id', user.id).eq('is_active', true).order('name'),
  ])

  const event = rawEvent as unknown as EventWithVenue | null
  if (!event) return notFound()

  const memberships = (rawMemberships ?? []) as unknown as EventMembershipSummary[]
  const userBands = (rawUserBands ?? []) as Array<{ id: string; name: string }>
  const userVenues = (rawUserVenues ?? []) as Array<{ id: string; name: string }>
  const identities: ManagedIdentity[] = [
    ...userBands.map((band) => ({
      kind: 'band' as const,
      id: band.id,
      name: band.name,
      href: `/dashboard/bands/${band.id}/edit`,
    })),
    ...userVenues.map((venue) => ({
      kind: 'venue' as const,
      id: venue.id,
      name: venue.name,
      href: `/dashboard/venues/${venue.id}/edit`,
    })),
  ]
  const cookieStore = await cookies()
  const requiredIdentity = resolveRequiredActiveIdentity(cookieStore.get(ACTIVE_IDENTITY_COOKIE)?.value, identities)
  const visibleMembershipBandIds = new Set(
    memberships
      .filter((membership) => !['declined', 'removed'].includes(membership.status))
      .map((membership) => membership.band_id)
  )
  const backstageIdentities = identities.filter((identity) => {
    if (identity.kind === 'venue') {
      return event.venue_id === identity.id && event.venues?.claimed_by_user_id === user.id
    }

    return visibleMembershipBandIds.has(identity.id)
  })

  function renderProfileSelection(title: string, body: string) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8">
          <Link href="/dashboard/backstage" className="text-sm text-[#888888] hover:text-[#252525]">
            Back to Backstages
          </Link>
          <h1 className="mt-3 text-2xl font-bold text-[#252525]">Backstage</h1>
          <p className="mt-1 text-sm text-[#888888]">Choose which profile you want to use for this Backstage.</p>
        </div>
        <ProfileSelectionModal
          title={title}
          body={body}
          identities={backstageIdentities}
        />
      </div>
    )
  }

  if (requiredIdentity.requiresSelection) {
    if (backstageIdentities.length === 0) return notFound()

    return renderProfileSelection(
      'Select a profile to view Backstage',
      'This Backstage is tied to specific artist and venue profiles. Choose one of the related profiles to continue.'
    )
  }

  const activeIdentity = requiredIdentity.activeIdentity
  const viewerMembership = activeIdentity?.kind === 'band'
    ? memberships.find((membership) => membership.band_id === activeIdentity.id && membership.bands?.user_id === user.id) ?? null
    : null
  const isVenueLeader =
    activeIdentity?.kind === 'venue' && event.venue_id === activeIdentity.id && event.venues?.claimed_by_user_id === user.id
  const canEnterBackstage =
    isVenueLeader || viewerMembership?.status === 'accepted' || viewerMembership?.status === 'removal_requested'

  if (!isVenueLeader && !viewerMembership) {
    if (backstageIdentities.length === 0) return notFound()

    return renderProfileSelection(
      'Switch profile to view Backstage',
      'The selected profile is not tied to this Backstage. Choose a related artist or venue profile to continue.'
    )
  }

  const eventGenres = (rawGenres ?? []) as unknown as Array<EventGenre & { genres: Genre | null }>
  const selectedGenreIds = eventGenres.map((entry) => entry.genre_id)
  const genreNames = eventGenres.map((entry) => entry.genres?.name).filter(Boolean) as string[]
  const messages = (rawMessages ?? []) as unknown as BackstageMessageSummary[]
  const acceptedCount = getAcceptedMemberships(memberships).length
  const openNeed = getOpenArtistNeed(event, memberships)

  const [{ data: allGenres }, { data: inviteBands }] = isVenueLeader
    ? await Promise.all([
        supabase.from('genres').select('*').order('name'),
        supabase.from('bands').select('id, name').eq('is_active', true).order('name').limit(200),
      ])
    : [{ data: [] }, { data: [] }]

  const existingBandIds = new Set(memberships.map((membership) => membership.band_id))
  const availableInviteBands = ((inviteBands ?? []) as Array<{ id: string; name: string }>).filter(
    (band) => !existingBandIds.has(band.id)
  )
  const postingBand = viewerMembership?.status === 'accepted' || viewerMembership?.status === 'removal_requested'
    ? viewerMembership.bands
    : null

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8">
        <Link href="/dashboard/backstage" className="text-sm text-[#888888] hover:text-[#252525]">
          Back to Backstages
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[#252525]">{event.title}</h1>
            <p className="mt-1 text-sm text-[#777777]">
              {event.venues?.name ?? 'Unknown venue'} · {formatEventDateLong(event)}
            </p>
            <p className="mt-1 text-sm text-[#888888]">
              {event.venues ? [event.venues.location_city, event.venues.location_state].filter(Boolean).join(', ') : ''}
            </p>
          </div>
          <div className="rounded-2xl border border-[#E8E8E8] bg-white px-4 py-3 text-right text-sm">
            <p className="font-semibold text-[#252525]">{EVENT_STATUS_LABELS[event.status]}</p>
            <p className={openNeed <= 0 ? 'mt-1 text-[#8A5A12]' : 'mt-1 text-[#777777]'}>
              {acceptedCount}/{event.needed_artist_count} artists accepted
            </p>
            {openNeed <= 0 && <p className="mt-1 text-xs text-[#8A5A12]">Needed count reached</p>}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {genreNames.map((genre) => (
            <span key={genre} className="rounded-full border border-[#E8E8E8] bg-white px-3 py-1 text-xs font-medium text-[#555555]">
              {genre}
            </span>
          ))}
        </div>
      </div>

      {!canEnterBackstage ? (
        <div className="rounded-2xl border border-[#E8E8E8] bg-white p-8">
          <h2 className="text-lg font-semibold text-[#252525]">Backstage access pending</h2>
          <p className="mt-2 text-sm text-[#777777]">
            Your current status is {viewerMembership ? MEMBERSHIP_STATUS_LABELS[viewerMembership.status].toLowerCase() : 'not joined'}.
          </p>
          {viewerMembership?.status === 'invited' && (
            <div className="mt-4">
              <MembershipActionButton membershipId={viewerMembership.id} status="accepted" label="Accept invite" />
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <main className="space-y-8">
            <section className="rounded-2xl border border-[#E8E8E8] bg-white p-5">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-[#888888]">Pinned logistics</h2>
              <div className="mt-4">
                <LogisticsDisplay event={event} />
              </div>
            </section>

            <section>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-widest text-[#888888]">Backstage chat</h2>
              </div>
              <MessageList messages={messages} />
              <div className="mt-5">
                <BackstageComposer
                  eventId={event.id}
                  bandId={isVenueLeader ? null : postingBand?.id}
                  replyingAs={isVenueLeader ? event.venues?.name ?? 'Venue' : postingBand?.name ?? 'Artist'}
                />
              </div>
            </section>
          </main>

          <aside className="space-y-6">
            <section className="rounded-2xl border border-[#E8E8E8] bg-white p-5">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-[#888888]">Lineup</h2>
              <div className="mt-4 space-y-3">
                {memberships.length === 0 ? (
                  <p className="text-sm text-[#888888]">No artists yet.</p>
                ) : (
                  memberships.map((membership) => (
                    <div key={membership.id} className="rounded-xl border border-[#E8E8E8] bg-[#FCFCFC] px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-[#252525]">{membership.bands?.name ?? 'Unknown artist'}</p>
                          <p className="mt-1 text-xs text-[#888888]">{MEMBERSHIP_STATUS_LABELS[membership.status]}</p>
                          {membership.application_note && <p className="mt-2 text-xs text-[#666666]">{membership.application_note}</p>}
                          {membership.invite_note && <p className="mt-2 text-xs text-[#666666]">{membership.invite_note}</p>}
                        </div>
                      </div>
                      {isVenueLeader && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {membership.status === 'applied' && (
                            <>
                              <MembershipActionButton membershipId={membership.id} status="accepted" label="Accept" />
                              <MembershipActionButton membershipId={membership.id} status="declined" label="Decline" />
                            </>
                          )}
                          {(membership.status === 'accepted' || membership.status === 'removal_requested') && (
                            <MembershipActionButton membershipId={membership.id} status="removed" label="Remove" />
                          )}
                        </div>
                      )}
                      {!isVenueLeader && membership.id === viewerMembership?.id && membership.status === 'accepted' && (
                        <div className="mt-3">
                          <MembershipActionButton membershipId={membership.id} status="removal_requested" label="Request removal" />
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </section>

            {isVenueLeader && (
              <>
                <section className="rounded-2xl border border-[#E8E8E8] bg-white p-5">
                  <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-[#888888]">Invite artist</h2>
                  <InviteArtistForm eventId={event.id} bands={availableInviteBands} />
                </section>

                <section className="rounded-2xl border border-[#E8E8E8] bg-white p-5">
                  <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-[#888888]">Event settings</h2>
                  <BackstageSettingsForm event={event} genres={allGenres ?? []} selectedGenreIds={selectedGenreIds} />
                </section>

                <section className="rounded-2xl border border-[#E8E8E8] bg-white p-5">
                  <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-[#888888]">Edit logistics</h2>
                  <BackstageLogisticsForm event={event} />
                </section>
              </>
            )}
          </aside>
        </div>
      )}
    </div>
  )
}
