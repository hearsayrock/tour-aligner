import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { ProfileSelectionModal } from '@/components/dashboard/ProfileSelectionModal'
import { EventCreateForm } from '@/components/events/EventCreateForm'
import { ButtonLink, EmptyState, PageHeader } from '@/components/ui/primitives'
import {
  ACTIVE_IDENTITY_COOKIE,
  resolveRequiredActiveIdentity,
  type ManagedIdentity,
} from '@/lib/managed-identity'

export const metadata = { title: 'Create Event' }

export default async function NewEventPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return redirect('/login')

  const [{ data: rawBands }, { data: rawVenues }, { data: genres }] = await Promise.all([
    supabase.from('bands').select('id, name').eq('user_id', user.id).eq('is_active', true).order('name'),
    supabase
      .from('venues')
      .select('id, name, capacity')
      .eq('claimed_by_user_id', user.id)
      .eq('is_active', true)
      .order('name'),
    supabase.from('genres').select('*').order('name'),
  ])
  const venues = rawVenues ?? []
  const identities: ManagedIdentity[] = [
    ...((rawBands ?? []) as Array<{ id: string; name: string }>).map((band) => ({
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
  const requiredIdentity = resolveRequiredActiveIdentity(
    cookieStore.get(ACTIVE_IDENTITY_COOKIE)?.value,
    identities
  )
  const venueIdentities = identities.filter((identity) => identity.kind === 'venue')
  const venue =
    requiredIdentity.activeIdentity?.kind === 'venue'
      ? venues.find((venue) => venue.id === requiredIdentity.activeIdentity?.id)
      : undefined

  if (venue) {
    const today = new Date()
    const twoYearsFromNow = new Date()
    twoYearsFromNow.setFullYear(today.getFullYear() + 2)
    const { data: existingEvents } = await supabase
      .from('events')
      .select('event_date, title')
      .eq('venue_id', venue.id)
      .gte('event_date', today.toISOString().slice(0, 10))
      .lte('event_date', twoYearsFromNow.toISOString().slice(0, 10))
      .order('event_date')
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <PageHeader
          backHref="/dashboard/backstage"
          backLabel="Back to Backstages"
          eyebrow="Event Studio"
          title="Create Event"
        />
        <EventCreateForm
          venues={[venue]}
          initialVenueId={venue.id}
          genres={genres ?? []}
          lockVenue
          existingEvents={existingEvents ?? []}
        />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <PageHeader
        backHref="/dashboard/backstage"
        backLabel="Back to Backstages"
        eyebrow="Event setup"
        title="Create Event"
      />

      {venueIdentities.length > 0 &&
      (requiredIdentity.requiresSelection || requiredIdentity.activeIdentity?.kind === 'band') ? (
        <ProfileSelectionModal
          title="Select a venue to create an Event"
          body="Event creation needs one venue profile. Choose the venue you want to create this Event for, or cancel to return to Dashboard."
          identities={venueIdentities}
        />
      ) : (
        <EmptyState
          title="Claim a venue first"
          description="Events need to be attached to a venue profile you manage."
          action={<ButtonLink href="/dashboard/venues">Manage venues</ButtonLink>}
        />
      )}
    </div>
  )
}
