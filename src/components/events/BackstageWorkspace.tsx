import Link from 'next/link'
import { Check, ClipboardList, RotateCcw, Settings, SlidersHorizontal, UserMinus, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { LinkifiedText } from '@/components/contact/LinkifiedText'
import { EventLogisticsDisplay } from '@/components/events/EventLogisticsDisplay'
import { PrivateChatRequestButton } from '@/components/private-chat/PrivateChatRequestButton'
import { Badge, Card, SectionHeading, buttonBaseClass } from '@/components/ui/primitives'
import {
  BackstageLogisticsForm,
  BackstageSettingsForm,
  InviteArtistForm,
  MembershipActionButton,
} from '@/components/events/BackstageForms'
import { MEMBERSHIP_STATUS_LABELS, getAcceptedMemberships, getOpenArtistNeed, type EventMembershipSummary } from '@/lib/events'
import type { ManagedIdentity } from '@/lib/managed-identity'
import type { Event, EventLogistics, PrivateChatThread } from '@/types/database'

function membershipTone(status: EventMembershipSummary['status']) {
  if (status === 'accepted') return 'success' as const
  if (status === 'applied' || status === 'invited') return 'brand' as const
  if (status === 'removal_requested') return 'warning' as const
  if (status === 'declined' || status === 'removed') return 'muted' as const
  return 'default' as const
}

export async function BackstageWorkspace({
  event, eventHref, venueName, memberships, selectedGenreIds, logistics, activeIdentity, viewerMembership, isVenueLeader,
}: {
  event: Event
  eventHref: string
  venueName: string
  memberships: EventMembershipSummary[]
  selectedGenreIds: string[]
  logistics: EventLogistics | null
  activeIdentity: ManagedIdentity
  viewerMembership: EventMembershipSummary | null
  isVenueLeader: boolean
}) {
  const supabase = await createClient()
  const lineupMemberships = isVenueLeader ? memberships : getAcceptedMemberships(memberships)
  const openNeed = getOpenArtistNeed(event, memberships)
  const formerMemberships = memberships.filter((membership) => membership.status === 'removed' || membership.status === 'declined')

  const [{ data: rawVenuePrivateChatsOne }, { data: rawVenuePrivateChatsTwo }] = isVenueLeader && formerMemberships.length > 0
    ? await Promise.all([
        supabase
          .from('private_chat_threads')
          .select('participant_one_kind, participant_one_id, participant_two_kind, participant_two_id, status, blocked_by_kind, blocked_by_id')
          .eq('participant_one_kind', 'venue')
          .eq('participant_one_id', event.venue_id),
        supabase
          .from('private_chat_threads')
          .select('participant_one_kind, participant_one_id, participant_two_kind, participant_two_id, status, blocked_by_kind, blocked_by_id')
          .eq('participant_two_kind', 'venue')
          .eq('participant_two_id', event.venue_id),
      ])
    : [{ data: [] }, { data: [] }]
  const blockedBandIds = new Set(
    ([...(rawVenuePrivateChatsOne ?? []), ...(rawVenuePrivateChatsTwo ?? [])] as Array<Pick<PrivateChatThread, 'status' | 'blocked_by_kind' | 'blocked_by_id'>>)
      .filter((thread) => thread.status === 'blocked' && thread.blocked_by_kind === 'band')
      .map((thread) => thread.blocked_by_id)
      .filter((bandId): bandId is string => !!bandId)
  )

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

  return (
    <section id="backstage" aria-labelledby="backstage-title" className="mt-8 scroll-mt-8 space-y-4 border-t border-[#E8E8E8] pt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="backstage-title" className="text-2xl font-bold text-[#252525]">Backstage</h2>
        <div className="flex flex-wrap gap-2">
          {!isVenueLeader && (
            <PrivateChatRequestButton
              senderIdentity={activeIdentity}
              targetKind="venue"
              targetId={event.venue_id}
              targetName={venueName}
              buttonLabel="Private chat with venue"
            />
          )}
          <Link href={eventHref + '?backstageChat=' + event.id + '#backstage'} scroll={false} className={buttonBaseClass('dark')}>
            Open Backstage chat
          </Link>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_390px]">
        <div className="space-y-8">
          <Card className="p-5">
            <SectionHeading title="Pinned Logistics" description="Shared show details everyone can refer back to." />
            <EventLogisticsDisplay logistics={logistics} />
          </Card>
        </div>

        <aside className="space-y-6">
          <Card className="p-5">
            <SectionHeading
              title="Lineup"
              description={openNeed <= 0 ? 'Lineup target reached.' : `${openNeed} open artist spot${openNeed === 1 ? '' : 's'}.`}
            />
            <div className="mt-4 space-y-3">
              {lineupMemberships.length === 0 ? (
                <p className="text-sm text-[#888888]">{isVenueLeader ? 'No artists yet.' : 'No confirmed artists yet.'}</p>
              ) : (
                lineupMemberships.map((membership) => (
                  <div key={membership.id} className="rounded-2xl border border-[#E8E8E8] bg-[#FCFCFC] px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-[#252525]">{membership.bands?.name ?? 'Unknown artist'}</p>
                      <Badge tone={membershipTone(membership.status)}>
                        {MEMBERSHIP_STATUS_LABELS[membership.status]}
                      </Badge>
                      {isVenueLeader && (
                        <>
                          {membership.bands && (
                            <PrivateChatRequestButton
                              senderIdentity={activeIdentity}
                              targetKind="band"
                              targetId={membership.bands.id}
                              targetName={membership.bands.name}
                              buttonLabel="Private chat"
                              className="!h-8 !min-h-8 !w-8 !rounded-lg !p-0"
                              iconOnly
                            />
                          )}
                          {membership.status === 'applied' && (
                            <>
                              <MembershipActionButton membershipId={membership.id} status="accepted" label="Accept" icon={<Check className="h-4 w-4" aria-hidden="true" />} compact />
                              <MembershipActionButton membershipId={membership.id} status="declined" label="Decline" icon={<X className="h-4 w-4" aria-hidden="true" />} compact />
                            </>
                          )}
                          {(membership.status === 'accepted' || membership.status === 'removal_requested') && (
                            <MembershipActionButton
                              membershipId={membership.id}
                              status="removed"
                              label={membership.status === 'removal_requested' ? 'Confirm removal' : 'Remove artist'}
                              icon={<UserMinus className="h-4 w-4" aria-hidden="true" />}
                              compact
                            />
                          )}
                          {(membership.status === 'removed' || membership.status === 'declined') && !blockedBandIds.has(membership.band_id) && (
                            <MembershipActionButton
                              membershipId={membership.id}
                              status="invited"
                              label="Re-invite artist"
                              icon={<RotateCcw className="h-4 w-4" aria-hidden="true" />}
                              eventId={event.id}
                              bandId={membership.band_id}
                              compact
                            />
                          )}
                        </>
                      )}
                      {!isVenueLeader && membership.id === viewerMembership?.id && membership.status === 'accepted' && (
                        <MembershipActionButton
                          membershipId={membership.id}
                          status="removal_requested"
                          label="Request removal"
                          icon={<UserMinus className="h-4 w-4" aria-hidden="true" />}
                          confirmation={{
                            title: 'Request removal from Backstage?',
                            body: 'The venue will need to approve your request. You can keep coordinating until they do.',
                            confirmLabel: 'Request removal',
                          }}
                          compact
                        />
                      )}
                      {!isVenueLeader && membership.id !== viewerMembership?.id && membership.bands && (
                        <PrivateChatRequestButton
                          senderIdentity={activeIdentity}
                          targetKind="band"
                          targetId={membership.bands.id}
                          targetName={membership.bands.name}
                          buttonLabel="Private chat"
                          className="!h-8 !min-h-8 !w-8 !rounded-lg !p-0"
                          iconOnly
                        />
                      )}
                    </div>
                    {isVenueLeader && membership.status === 'invited' && membership.invitation_note && (
                      <LinkifiedText text={membership.invitation_note} className="mt-2 whitespace-pre-wrap break-words text-sm text-[#666666]" />
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
                    <BackstageLogisticsForm eventId={event.id} logistics={logistics} />
                  </div>
                </details>
              </Card>
            </>
          )}
        </aside>
      </div>
    </section>
  )
}
