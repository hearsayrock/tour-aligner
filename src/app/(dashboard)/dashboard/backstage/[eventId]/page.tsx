import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { CalendarRange, ClipboardList, FileText, Settings, SlidersHorizontal, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { ProfileSelectionModal } from '@/components/dashboard/ProfileSelectionModal'
import { LinkifiedText } from '@/components/contact/LinkifiedText'
import { PrivateChatRequestButton } from '@/components/private-chat/PrivateChatRequestButton'
import { Badge, Card, EmptyState, PageHeader, SectionHeading } from '@/components/ui/primitives'
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

function eventStatusTone(status: EventWithVenue['status']) {
  if (status === 'active') return 'success' as const
  if (status === 'draft') return 'warning' as const
  if (status === 'cancelled') return 'danger' as const
  return 'muted' as const
}

function membershipTone(status: EventMembershipSummary['status']) {
  if (status === 'accepted') return 'success' as const
  if (status === 'applied' || status === 'invited') return 'brand' as const
  if (status === 'removal_requested') return 'warning' as const
  if (status === 'declined' || status === 'removed') return 'muted' as const
  return 'default' as const
}

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
    return (
      <EmptyState
        title="No pinned logistics yet"
        description="Load-in, soundcheck, set times, parking, and backline notes will appear here once the venue adds them."
        className="border-dashed py-8"
      />
    )
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {rows.map(([label, value]) => (
        <div key={label} className="rounded-2xl border border-[#E8E8E8] bg-[#FCFCFC] px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#888888]">{label}</p>
          <LinkifiedText text={value ?? ''} className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#252525]" />
        </div>
      ))}
    </div>
  )
}

function MessageList({
  activeIdentity,
  messages,
}: {
  activeIdentity: ManagedIdentity
  messages: BackstageMessageSummary[]
}) {
  if (messages.length === 0) {
    return (
      <EmptyState
        title="No Backstage messages yet"
        description="Accepted artists and the venue can coordinate here once the conversation starts."
        className="border-dashed"
      />
    )
  }

  return (
    <div className="space-y-4">
      {messages.map((message) => {
        const isSystem = message.sender_kind === 'system'
        const isOwnMessage =
          activeIdentity.kind === 'venue'
            ? message.sender_kind === 'venue'
            : message.sender_kind === 'artist' && message.sender_band_id === activeIdentity.id
        const sender =
          message.sender_kind === 'venue'
            ? 'Venue'
            : message.sender_kind === 'artist'
              ? message.bands?.name ?? 'Artist'
              : 'System'
        const formattedCreatedAt = new Date(message.created_at).toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        })

        return (
          <div key={message.id} className={isSystem ? 'flex justify-center' : `flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
            {isSystem ? (
              <div className="max-w-xl rounded-full border border-[#E8E8E8] bg-[#F5F5F5] px-4 py-2 text-center text-xs text-[#666666]">
                <LinkifiedText text={message.body} className="whitespace-pre-wrap break-words leading-relaxed" />
              </div>
            ) : (
              <div className={`flex max-w-[82%] flex-col ${isOwnMessage ? 'items-end' : 'items-start'} sm:max-w-[68%]`}>
                <div className={`mb-1 flex max-w-full flex-wrap items-center gap-2 px-1 text-xs ${isOwnMessage ? 'justify-end text-right' : 'justify-start'}`}>
                  <p className="font-semibold uppercase tracking-[0.16em] text-[#888888]">{sender}</p>
                  <p className="text-[#AAAAAA]">{formattedCreatedAt}</p>
                </div>
                <div className={`rounded-2xl px-4 py-3 shadow-sm ${isOwnMessage ? 'rounded-br-md bg-[#252525]' : 'rounded-bl-md bg-[#FD6A2F]'}`}>
                  <LinkifiedText
                    text={message.body}
                    className="whitespace-pre-wrap break-words text-sm leading-relaxed text-white"
                    linkClassName="break-all font-medium text-white underline decoration-white/60 underline-offset-2"
                  />
                </div>
              </div>
            )}
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
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <PageHeader
        backHref="/dashboard/backstage"
        backLabel="Back to Backstages"
        eyebrow="Backstage workspace"
        title={event.title}
        description={`${event.venues?.name ?? 'Unknown venue'} / ${formatEventDateLong(event)}${event.venues ? ` / ${[event.venues.location_city, event.venues.location_state].filter(Boolean).join(', ')}` : ''}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Badge tone={eventStatusTone(event.status)}>
              <CalendarRange className="h-3.5 w-3.5" />
              {EVENT_STATUS_LABELS[event.status]}
            </Badge>
            <Badge tone={openNeed <= 0 ? 'success' : 'brand'}>
              <Users className="h-3.5 w-3.5" />
              {acceptedCount}/{event.needed_artist_count} accepted
            </Badge>
            {activeIdentity && (
              <PrivateChatRequestButton
                senderIdentity={activeIdentity}
                targetKind="venue"
                targetId={event.venue_id}
                targetName={event.venues?.name ?? 'Venue'}
                buttonLabel="Private chat with venue"
              />
            )}
          </div>
        }
      />

      {genreNames.length > 0 && (
        <div className="-mt-4 mb-8 flex flex-wrap gap-2">
          {genreNames.map((genre) => (
            <Badge key={genre} tone="default">{genre}</Badge>
          ))}
        </div>
      )}

      {!canEnterBackstage || !activeIdentity ? (
        <Card className="p-8">
          <h2 className="text-lg font-semibold text-[#252525]">Backstage access pending</h2>
          <p className="mt-2 text-sm text-[#777777]">
            Your current status is {viewerMembership ? MEMBERSHIP_STATUS_LABELS[viewerMembership.status].toLowerCase() : 'not joined'}.
          </p>
          <Link
            href={`/events/${event.slug}#event-description`}
            className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#E8E8E8] bg-white px-4 text-sm font-semibold text-[#252525] transition-colors hover:border-[#CCCCCC] hover:bg-[#FAFAFA]"
          >
            <FileText className="h-4 w-4 text-[#FD6A2F]" />
            View Event details
          </Link>
          {viewerMembership?.status === 'invited' && (
            <div className="mt-4">
              <MembershipActionButton membershipId={viewerMembership.id} status="accepted" label="Accept invite" />
            </div>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_390px]">
          <main className="space-y-8">
            <Card className="p-5">
              <SectionHeading title="Pinned Logistics" description="Shared show details everyone can refer back to." />
              <LogisticsDisplay event={event} />
            </Card>

            <section>
              <SectionHeading title="Backstage Chat" description="Keep artist and venue coordination in one room." />
              <MessageList activeIdentity={activeIdentity} messages={messages} />
              <div className="mt-5">
                <BackstageComposer
                  eventId={event.id}
                  bandId={isVenueLeader ? null : postingBand?.id}
                  replyingAs={isVenueLeader ? event.venues?.name ?? 'Venue' : postingBand?.name ?? 'Artist'}
                />
              </div>
            </section>
          </main>

          <aside className="space-y-6 xl:sticky xl:top-8 xl:self-start">
            <Card className="p-5">
              <SectionHeading
                title="Lineup"
                description={openNeed <= 0 ? 'Lineup target reached.' : `${openNeed} open artist spot${openNeed === 1 ? '' : 's'}.`}
              />
              <div className="mt-4 space-y-3">
                {memberships.length === 0 ? (
                  <p className="text-sm text-[#888888]">No artists yet.</p>
                ) : (
                  memberships.map((membership) => (
                    <div key={membership.id} className="rounded-2xl border border-[#E8E8E8] bg-[#FCFCFC] px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-[#252525]">{membership.bands?.name ?? 'Unknown artist'}</p>
                          <div className="mt-1">
                            <Badge tone={membershipTone(membership.status)}>
                              {MEMBERSHIP_STATUS_LABELS[membership.status]}
                            </Badge>
                          </div>
                          {membership.application_note && <p className="mt-2 text-xs leading-5 text-[#666666]">{membership.application_note}</p>}
                          {membership.invite_note && <p className="mt-2 text-xs leading-5 text-[#666666]">{membership.invite_note}</p>}
                        </div>
                      </div>
                      {isVenueLeader && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {membership.bands && (
                            <PrivateChatRequestButton
                              senderIdentity={activeIdentity}
                              targetKind="band"
                              targetId={membership.bands.id}
                              targetName={membership.bands.name}
                              buttonLabel="Private chat"
                              className="min-h-9 rounded-lg px-3 py-2"
                            />
                          )}
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
                      {!isVenueLeader && membership.id !== viewerMembership?.id && membership.bands && (
                        <div className="mt-3">
                          <PrivateChatRequestButton
                            senderIdentity={activeIdentity}
                            targetKind="band"
                            targetId={membership.bands.id}
                            targetName={membership.bands.name}
                            buttonLabel="Private chat"
                            className="min-h-9 rounded-lg px-3 py-2"
                          />
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </Card>

            {isVenueLeader && (
              <>
                <Card className="p-5">
                  <SectionHeading title="Invite Artist" description="Add another artist to this Backstage." />
                  <InviteArtistForm eventId={event.id} bands={availableInviteBands} />
                </Card>

                <Card className="overflow-hidden">
                  <details>
                    <summary className="flex min-h-14 cursor-pointer items-center justify-between gap-3 px-5 text-sm font-semibold text-[#252525]">
                      <span className="flex items-center gap-2">
                        <Settings className="h-4 w-4 text-[#FD6A2F]" />
                        Event settings
                      </span>
                      <SlidersHorizontal className="h-4 w-4 text-[#888888]" />
                    </summary>
                    <div className="border-t border-[#EEEEEE] p-5">
                      <BackstageSettingsForm event={event} genres={allGenres ?? []} selectedGenreIds={selectedGenreIds} />
                    </div>
                  </details>
                </Card>

                <Card className="overflow-hidden">
                  <details>
                    <summary className="flex min-h-14 cursor-pointer items-center justify-between gap-3 px-5 text-sm font-semibold text-[#252525]">
                      <span className="flex items-center gap-2">
                        <ClipboardList className="h-4 w-4 text-[#FD6A2F]" />
                        Edit logistics
                      </span>
                      <SlidersHorizontal className="h-4 w-4 text-[#888888]" />
                    </summary>
                    <div className="border-t border-[#EEEEEE] p-5">
                      <BackstageLogisticsForm event={event} />
                    </div>
                  </details>
                </Card>
              </>
            )}
          </aside>
        </div>
      )}
    </div>
  )
}
