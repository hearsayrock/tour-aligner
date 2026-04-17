import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { ClaimButton } from '@/components/venues/ClaimButton'
import { RequestContactForm } from '@/components/contact/RequestContactForm'
import type { ContactThreadStatus, ConversationSide } from '@/types/database'

const AGE_LABELS: Record<string, string> = {
  all_ages: 'All ages',
  '18_plus': '18+',
  '21_plus': '21+',
}

const SOCIAL_LINKS: { key: string; label: string }[] = [
  { key: 'website_url', label: 'Website' },
  { key: 'instagram_url', label: 'Instagram' },
]

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()
  const { data: rawVenueMeta } = await supabase
    .from('venues')
    .select('name, location_city, location_state')
    .eq('slug', slug)
    .eq('is_active', true)
    .single()
  const venue = rawVenueMeta as { name: string; location_city: string; location_state: string } | null

  if (!venue) return {}
  return {
    title: venue.name,
    description: `${venue.name} — ${venue.location_city}, ${venue.location_state}`,
  }
}

export default async function VenueDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = await createClient()

  const [{ data: rawVenue }, { data: { user } }] = await Promise.all([
    supabase.from('venues').select('*').eq('slug', slug).eq('is_active', true).single(),
    supabase.auth.getUser(),
  ])
  const venue = rawVenue as import('@/types/database').Venue | null

  if (!venue) return notFound()

  const [{ data: venueGenres }, { data: pendingClaim }] = await Promise.all([
    supabase.from('venue_genres').select('genre_id, genres(name)').eq('venue_id', venue.id),
    user
      ? supabase
          .from('venue_claims')
          .select('id')
          .eq('venue_id', venue.id)
          .eq('user_id', user.id)
          .eq('status', 'pending')
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  const genreNames = ((venueGenres ?? []) as unknown as { genres: { name: string } | null }[])
    .map((vg) => vg.genres?.name)
    .filter(Boolean) as string[]

  const isClaimed = !!venue.claimed_by_user_id
  const isOwner = !!user && user.id === venue.claimed_by_user_id
  const hasPendingClaim = !!pendingClaim
  const activeSocials = SOCIAL_LINKS.filter(({ key }) => venue[key as keyof typeof venue])

  type ExistingThread = {
    id: string
    band_id: string
    venue_id: string
    status: ContactThreadStatus
    requested_by_side: ConversationSide | null
    blocked_by_side: ConversationSide | null
  }

  // Fetch the logged-in user's bands and any existing inbox threads (skip for venue owner)
  let userBands: { id: string; name: string }[] = []
  let existingThreads: ExistingThread[] = []
  if (user && !isOwner) {
    const { data: bands } = await supabase
      .from('bands')
      .select('id, name')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('name')
    userBands = bands ?? []

    if (userBands.length > 0) {
      const { data: threads } = await supabase
        .from('contact_threads')
        .select('id, band_id, venue_id, status, requested_by_side, blocked_by_side')
        .eq('venue_id', venue.id)
        .in('band_id', userBands.map((band) => band.id))

      existingThreads = (threads ?? []) as ExistingThread[]
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-6 pt-24 pb-12">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-4xl font-bold tracking-tight mb-1">{venue.name}</h1>
            <p className="text-[#777777]">
              {venue.location_city}, {venue.location_state}
              {venue.location_address && ` · ${venue.location_address}`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            {venue.capacity && (
              <span className="text-sm text-[#888888] bg-[#FFFFFF] border border-[#E8E8E8] rounded-lg px-3 py-1.5">
                Capacity: {venue.capacity.toLocaleString()}
              </span>
            )}
            {venue.age_requirement && (
              <span className="text-sm text-[#888888] bg-[#FFFFFF] border border-[#E8E8E8] rounded-lg px-3 py-1.5">
                {AGE_LABELS[venue.age_requirement]}
              </span>
            )}
          </div>
        </div>

        {genreNames.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {genreNames.map((name) => (
              <span
                key={name}
                className="text-xs px-2.5 py-1 rounded-full border border-[#E8E8E8] text-[#777777]"
              >
                {name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Description */}
      {venue.description && (
        <section className="mb-10">
          <p className="text-[#252525] leading-relaxed">{venue.description}</p>
        </section>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-10">
        {/* Contact */}
        {(venue.booking_email || venue.phone) && (
          <section>
            <h2 className="text-xs font-semibold text-[#888888] uppercase tracking-widest mb-4">
              Booking
            </h2>
            <ul className="space-y-2 text-sm">
              {venue.booking_email && (
                <li>
                  <a
                    href={`mailto:${venue.booking_email}`}
                    className="text-[#FD6A2F] hover:underline"
                  >
                    {venue.booking_email}
                  </a>
                </li>
              )}
              {venue.phone && (
                <li className="text-[#252525]">{venue.phone}</li>
              )}
            </ul>
          </section>
        )}

        {/* Links */}
        {activeSocials.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-[#888888] uppercase tracking-widest mb-4">
              Links
            </h2>
            <ul className="space-y-2">
              {activeSocials.map(({ key, label }) => (
                <li key={key}>
                  <a
                    href={venue[key as keyof typeof venue] as string}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-[#FD6A2F] hover:underline"
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {/* Contact request */}
      {!isOwner && (
        <section className="border-t border-[#E8E8E8] pt-8 mb-8">
          <h2 className="text-xs font-semibold text-[#888888] uppercase tracking-widest mb-4">
            Request contact
          </h2>
          {user && userBands.length > 0 ? (
            <RequestContactForm
              initiatorSide="band"
              targetVenueId={venue.id}
              options={userBands}
              existingThreads={existingThreads}
            />
          ) : user && userBands.length === 0 ? (
            <p className="text-sm text-[#888888]">
              You need an artist profile to request contact.{' '}
              <Link href="/dashboard/bands/new" className="text-[#FD6A2F] hover:underline">
                Create one
              </Link>
              .
            </p>
          ) : (
            <p className="text-sm text-[#888888]">
              <Link href={`/login?redirectTo=/venues/${venue.slug}`} className="text-[#FD6A2F] hover:underline">
                Sign in
              </Link>{' '}
              to request contact.
            </p>
          )}
        </section>
      )}

      {/* Claim / Owner actions */}
      <div className="border-t border-[#E8E8E8] pt-8">
        {isOwner ? (
          <div className="flex items-center gap-4">
            <span className="text-sm text-[#00bba5]">✓ You own this venue</span>
            <a
              href={`/dashboard/venues/${venue.id}/edit`}
              className="text-sm font-medium bg-[#F5F5F5] border border-[#E8E8E8] rounded-lg px-4 py-2 hover:border-[#CCCCCC] transition-colors"
            >
              Edit venue info
            </a>
          </div>
        ) : isClaimed ? (
          <p className="text-sm text-[#888888]">This venue has been claimed.</p>
        ) : (
          <div>
            <p className="text-sm text-[#888888] mb-3">
              Is this your venue? Claim it to manage your profile and receive contact requests.
            </p>
            <ClaimButton
              venueId={venue.id}
              venueSlug={venue.slug}
              isLoggedIn={!!user}
              hasPendingClaim={hasPendingClaim}
            />
          </div>
        )}
      </div>
    </div>
  )
}
