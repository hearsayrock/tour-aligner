import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { ProfileSelectionModal } from '@/components/dashboard/ProfileSelectionModal'
import { EventAppearanceEditor } from '@/components/events/EventAppearanceEditor'
import { createNewEventPageLayout, DEFAULT_EVENT_BACKGROUND_COLOR, DEFAULT_EVENT_BACKGROUND_OPACITY } from '@/components/events/event-page-config'
import { getVenueProfileAppearance, parseVenueProfileTheme } from '@/components/profile-page/venue/venue-page-config'
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
      .select('id, name, capacity, location_city, location_state, profile_theme')
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
  const venue = requiredIdentity.activeIdentity?.kind === 'venue'
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
    const { accent } = getVenueProfileAppearance(parseVenueProfileTheme(venue.profile_theme))
    const capacity = venue.capacity ?? 100
    return (
      <EventAppearanceEditor
        key={venue.id}
        eventHref="/dashboard/backstage"
        venueId={venue.id}
        event={{
          title: '',
          description: '',
          date: '',
          venue: venue.name,
          location: [venue.location_city, venue.location_state].filter(Boolean).join(', '),
          accent,
          cover: null,
          genres: [],
          capacity,
          artistNeed: '',
          lineup: null,
        }}
        initialDetails={{
          eventDate: '',
          startTime: '20:00',
          genreIds: [],
          artistNeedDescription: '',
          attendeeCapacity: capacity,
          neededArtistCount: 3,
        }}
        layout={createNewEventPageLayout()}
        backgroundColor={DEFAULT_EVENT_BACKGROUND_COLOR}
        backgroundOpacity={DEFAULT_EVENT_BACKGROUND_OPACITY}
        inheritedAccent={accent}
        availableGenres={genres ?? []}
        existingEvents={existingEvents ?? []}
      />
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

      {venueIdentities.length > 0 && (requiredIdentity.requiresSelection || requiredIdentity.activeIdentity?.kind === 'band') ? (
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
