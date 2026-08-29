import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { ProfileSelectionModal } from '@/components/dashboard/ProfileSelectionModal'
import { EventCreateForm } from '@/components/events/EventCreateForm'
import { ButtonLink, EmptyState, PageHeader } from '@/components/ui/primitives'
import { ACTIVE_IDENTITY_COOKIE, resolveRequiredActiveIdentity, type ManagedIdentity } from '@/lib/managed-identity'

export const metadata = { title: 'Create Event' }

export default async function NewEventPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return redirect('/login')

  const [{ data: rawBands }, { data: rawVenues }, { data: genres }] = await Promise.all([
    supabase
      .from('bands')
      .select('id, name')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('name'),
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
  const requiredIdentity = resolveRequiredActiveIdentity(cookieStore.get(ACTIVE_IDENTITY_COOKIE)?.value, identities)
  const venueIdentities = identities.filter((identity) => identity.kind === 'venue')
  const selectedVenues = requiredIdentity.activeIdentity?.kind === 'venue'
    ? venues.filter((venue) => venue.id === requiredIdentity.activeIdentity?.id)
    : venues.length === 1 && !requiredIdentity.hasMultipleIdentities
      ? venues
      : []
  const todayIso = new Date().toISOString().slice(0, 10)
  const twoYearsFromNow = new Date()
  twoYearsFromNow.setFullYear(twoYearsFromNow.getFullYear() + 2)
  const existingEvents = selectedVenues.length > 0
    ? (await supabase
      .from('events')
      .select('event_date, title')
      .eq('venue_id', selectedVenues[0].id)
      .gte('event_date', todayIso)
      .lte('event_date', twoYearsFromNow.toISOString().slice(0, 10))
      .order('event_date')).data ?? []
    : []

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <PageHeader
        backHref="/dashboard/backstage"
        backLabel="Back to Backstages"
        eyebrow="New Backstage"
        title="Create Event"
        description="Create the Event first. TourAligner will create its private Backstage automatically."
      />

      {venueIdentities.length > 0 && (requiredIdentity.requiresSelection || requiredIdentity.activeIdentity?.kind === 'band') ? (
        <ProfileSelectionModal
          title="Select a venue to create an Event"
          body="Event creation needs one venue profile. Choose the venue you want to create this Event for, or cancel to return to Dashboard."
          identities={venueIdentities}
        />
      ) : selectedVenues.length > 0 ? (
        <EventCreateForm
          venues={selectedVenues}
          genres={genres ?? []}
          initialVenueId={selectedVenues[0].id}
          lockVenue
          existingEvents={existingEvents}
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
