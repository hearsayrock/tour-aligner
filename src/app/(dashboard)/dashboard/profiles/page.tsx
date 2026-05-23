import Link from 'next/link'
import { redirect } from 'next/navigation'
import { CalendarClock, MapPin, Mic2, Plus, Search } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Badge, ButtonLink, Card, EmptyState, PageHeader } from '@/components/ui/primitives'

export const metadata = { title: 'Manage Profiles' }

type ManagedArtist = {
  id: string
  name: string
  slug: string
  location_city: string | null
  location_state: string | null
}

type ManagedVenue = {
  id: string
  name: string
  slug: string
  location_city: string
  location_state: string
  capacity: number | null
}

type PendingClaimRow = {
  id: string
  created_at: string
  venues:
    | {
        id: string
        name: string
        slug: string
        location_city: string
        location_state: string
      }
    | Array<{
        id: string
        name: string
        slug: string
        location_city: string
        location_state: string
      }>
    | null
}

function locationLabel(city?: string | null, state?: string | null) {
  return [city, state].filter(Boolean).join(', ') || 'Location not set'
}

function ProfileRow({
  icon,
  title,
  detail,
  viewHref,
  editHref,
}: {
  icon: React.ReactNode
  title: string
  detail: string
  viewHref: string
  editHref: string
}) {
  return (
    <div className="flex flex-col gap-4 border-t border-[#EEEEEE] py-4 first:border-t-0 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FFF3EE] text-[#FD6A2F]">
          {icon}
        </span>
        <div className="min-w-0">
          <p className="truncate font-semibold text-[#252525]">{title}</p>
          <p className="mt-0.5 text-sm text-[#777777]">{detail}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Link href={viewHref} target="_blank" className="text-sm font-medium text-[#777777] transition-colors hover:text-[#252525]">
          View
        </Link>
        <Link href={editHref} className="rounded-lg border border-[#E2E2E2] bg-white px-3 py-1.5 text-sm font-semibold text-[#252525] transition-colors hover:border-[#CFCFCF] hover:bg-[#F6F6F6]">
          Edit
        </Link>
      </div>
    </div>
  )
}

function EmptyProfileSection({
  title,
  description,
  href,
  action,
}: {
  title: string
  description: string
  href: string
  action: string
}) {
  return (
    <div className="rounded-xl border border-dashed border-[#DDDDDD] bg-[#FAFAFA] px-5 py-6 text-center">
      <h2 className="font-semibold text-[#252525]">{title}</h2>
      <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-[#777777]">{description}</p>
      <ButtonLink href={href} tone="secondary" className="mt-4">
        <Plus className="h-4 w-4" />
        {action}
      </ButtonLink>
    </div>
  )
}

export default async function ManageProfilesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return redirect('/login')

  const [{ data: rawBands }, { data: rawVenues }, { data: rawPendingClaims }] = await Promise.all([
    supabase
      .from('bands')
      .select('id, name, slug, location_city, location_state')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('name'),
    supabase
      .from('venues')
      .select('id, name, slug, location_city, location_state, capacity')
      .eq('claimed_by_user_id', user.id)
      .eq('is_active', true)
      .order('name'),
    supabase
      .from('venue_claims')
      .select('id, created_at, venues(id, name, slug, location_city, location_state)')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false }),
  ])

  const artists = (rawBands ?? []) as ManagedArtist[]
  const venues = (rawVenues ?? []) as ManagedVenue[]
  const pendingClaims = ((rawPendingClaims ?? []) as PendingClaimRow[]).map((claim) => ({
    ...claim,
    venue: Array.isArray(claim.venues) ? (claim.venues[0] ?? null) : claim.venues,
  }))
  const hasAnyProfiles = artists.length > 0 || venues.length > 0 || pendingClaims.length > 0

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <PageHeader
        eyebrow="Profiles"
        title="Manage Profiles"
        description="Manage the artist and venue profiles tied to your account from one place."
        actions={
          <>
            <ButtonLink href="/dashboard/bands/new">
              <Mic2 className="h-4 w-4" />
              Add Artist
            </ButtonLink>
            <ButtonLink href="/dashboard/venues" tone="secondary">
              <MapPin className="h-4 w-4" />
              Claim or Add Venue
            </ButtonLink>
          </>
        }
      />

      {!hasAnyProfiles ? (
        <EmptyState
          title="No managed profiles yet"
          description="Create an artist profile or claim a venue to start managing booking work."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <ButtonLink href="/dashboard/bands/new">
                <Mic2 className="h-4 w-4" />
                Add Artist
              </ButtonLink>
              <ButtonLink href="/dashboard/venues" tone="secondary">
                <Search className="h-4 w-4" />
                Find a Venue
              </ButtonLink>
            </div>
          }
        />
      ) : (
        <div className="grid gap-6">
          <Card className="p-5">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold text-[#252525]">Artist Profiles</h2>
                <p className="mt-1 text-sm text-[#777777]">Public artist pages and booking identity settings.</p>
              </div>
              <Badge tone="muted">{artists.length}</Badge>
            </div>
            {artists.length > 0 ? (
              artists.map((artist) => (
                <ProfileRow
                  key={artist.id}
                  icon={<Mic2 className="h-5 w-5" />}
                  title={artist.name}
                  detail={locationLabel(artist.location_city, artist.location_state)}
                  viewHref={`/bands/${artist.slug}`}
                  editHref={`/dashboard/bands/${artist.id}/edit`}
                />
              ))
            ) : (
              <EmptyProfileSection
                title="No artist profiles"
                description="Add an artist profile when you need to apply to Events or show venues your booking details."
                href="/dashboard/bands/new"
                action="Add Artist"
              />
            )}
          </Card>

          <Card className="p-5">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold text-[#252525]">Venue Profiles</h2>
                <p className="mt-1 text-sm text-[#777777]">Claimed venues, profile details, and event creation access.</p>
              </div>
              <Badge tone="muted">{venues.length}</Badge>
            </div>
            {venues.length > 0 ? (
              venues.map((venue) => (
                <ProfileRow
                  key={venue.id}
                  icon={<MapPin className="h-5 w-5" />}
                  title={venue.name}
                  detail={`${locationLabel(venue.location_city, venue.location_state)}${venue.capacity ? ` / ${venue.capacity.toLocaleString()} cap` : ''}`}
                  viewHref={`/venues/${venue.slug}`}
                  editHref={`/dashboard/venues/${venue.id}/edit`}
                />
              ))
            ) : (
              <EmptyProfileSection
                title="No venue profiles"
                description="Claim a venue from the directory or add a venue that is not listed yet."
                href="/dashboard/venues"
                action="Claim or Add Venue"
              />
            )}
          </Card>

          {pendingClaims.length > 0 && (
            <Card className="p-5">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-[#252525]">Pending Venue Claims</h2>
                  <p className="mt-1 text-sm text-[#777777]">Venue access requests awaiting admin approval.</p>
                </div>
                <Badge tone="warning">{pendingClaims.length}</Badge>
              </div>
              {pendingClaims.map((claim) => (
                <div key={claim.id} className="flex flex-col gap-4 border-t border-[#EEEEEE] py-4 first:border-t-0 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FFF7E8] text-[#8A5A12]">
                      <CalendarClock className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-[#252525]">{claim.venue?.name ?? 'Venue claim'}</p>
                      <p className="mt-0.5 text-sm text-[#777777]">
                        {claim.venue ? locationLabel(claim.venue.location_city, claim.venue.location_state) : 'Awaiting review'}
                      </p>
                    </div>
                  </div>
                  <Badge tone="warning">Pending</Badge>
                </div>
              ))}
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
