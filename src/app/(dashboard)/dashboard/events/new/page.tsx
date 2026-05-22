import Link from 'next/link'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { ProfileSelectionModal } from '@/components/dashboard/ProfileSelectionModal'
import { EventCreateForm } from '@/components/events/EventCreateForm'
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

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-8">
        <Link href="/dashboard/backstage" className="text-sm text-[#888888] transition-colors hover:text-[#252525]">
          Back to Backstages
        </Link>
        <h1 className="mt-3 text-2xl font-bold text-[#252525]">Create Event</h1>
        <p className="mt-1 text-sm text-[#888888]">
          Create the Event first. TourAligner will create its private Backstage automatically.
        </p>
      </div>

      {venueIdentities.length > 0 && (requiredIdentity.requiresSelection || requiredIdentity.activeIdentity?.kind === 'band') ? (
        <ProfileSelectionModal
          title="Select a venue to create an Event"
          body="Event creation needs one venue profile. Choose the venue you want to create this Event for, or cancel to return to Dashboard."
          identities={venueIdentities}
        />
      ) : selectedVenues.length > 0 ? (
        <EventCreateForm venues={selectedVenues} genres={genres ?? []} />
      ) : (
        <div className="rounded-2xl border border-[#E8E8E8] bg-white p-10 text-center">
          <p className="text-sm text-[#888888]">Claim a venue before creating an Event.</p>
          <Link href="/dashboard/venues" className="mt-4 inline-block rounded-xl bg-[#FD6A2F] px-5 py-2.5 text-sm font-semibold text-white">
            Manage venues
          </Link>
        </div>
      )}
    </div>
  )
}
