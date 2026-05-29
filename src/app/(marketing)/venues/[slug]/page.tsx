import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { cookies } from 'next/headers'
import type { ComponentType, ReactNode } from 'react'
import type { Metadata } from 'next'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ExternalLink,
  Globe,
  Instagram,
  Mail,
  MapPin,
  Music2,
  PencilLine,
  Phone,
  ShieldCheck,
  Users,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { ClaimButton } from '@/components/venues/ClaimButton'
import { PublicVenueBookingPanel } from '@/components/venues/PublicVenueBookingPanel'
import { PrivateChatRequestButton } from '@/components/private-chat/PrivateChatRequestButton'
import { Badge, ButtonLink } from '@/components/ui/primitives'
import { getVenueCalendarRange } from '@/lib/venue-calendar'
import { buildVenueDateGenreFocusMap } from '@/lib/venue-booking-date'
import {
  ACTIVE_IDENTITY_COOKIE,
  activeIdentityLabel,
  resolveActiveIdentity,
  type ManagedIdentity,
} from '@/lib/managed-identity'
import type { Venue, VenueBookingDate } from '@/types/database'

export const revalidate = 60

export async function generateStaticParams() {
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const { data } = await supabase
    .from('venues')
    .select('slug')
    .eq('is_active', true)
    .eq('is_unlisted', false)
  return (data ?? []).map(({ slug }) => ({ slug }))
}

const AGE_LABELS: Record<string, string> = {
  all_ages: 'All ages',
  '18_plus': '18+',
  '21_plus': '21+',
}

const SOCIAL_LINKS = [
  { key: 'website_url', label: 'Website', icon: Globe },
  { key: 'instagram_url', label: 'Instagram', icon: Instagram },
] as const

function formatVenueLocation(
  venue: Pick<Venue, 'location_city' | 'location_state' | 'location_address'>
) {
  return [
    [venue.location_city, venue.location_state].filter(Boolean).join(', '),
    venue.location_address,
  ].filter(Boolean).join(' / ')
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>
  label: string
  value: ReactNode
}) {
  return (
    <div className="flex gap-3">
      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#FFF3EE] text-[#FD6A2F]">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8A8A8A]">{label}</p>
        <div className="mt-1 text-sm leading-6 text-[#2A2A2A]">{value}</div>
      </div>
    </div>
  )
}

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
    .eq('is_unlisted', false)
    .single()
  const venue = rawVenueMeta as { name: string; location_city: string; location_state: string } | null

  if (!venue) return {}
  return {
    title: venue.name,
    description: `${venue.name} - ${venue.location_city}, ${venue.location_state}`,
  }
}

export default async function VenueDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ selectedDate?: string }>
}) {
  const { slug } = await params
  const { selectedDate: selectedDateParam } = await searchParams
  const supabase = await createClient()
  const todayIso = new Date().toISOString().slice(0, 10)
  const calendarRange = getVenueCalendarRange(todayIso, 6)

  const [{ data: rawVenue }, { data: { user } }] = await Promise.all([
    supabase.from('venues').select('*').eq('slug', slug).eq('is_active', true).eq('is_unlisted', false).single(),
    supabase.auth.getUser(),
  ])
  const venue = rawVenue as Venue | null

  if (!venue) return notFound()

  const [{ data: venueGenres }, { data: pendingClaim }, { data: rawBookingDates }, { data: rawBookings }] = await Promise.all([
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
    supabase
      .from('venue_booking_dates')
      .select('id, show_date, bill_cap, is_closed_to_more_bands, is_unavailable, show_type, genre_focus')
      .eq('venue_id', venue.id)
      .gte('show_date', calendarRange.rangeStart)
      .lte('show_date', calendarRange.rangeEnd)
      .order('show_date'),
    supabase
      .from('bookings')
      .select('venue_booking_date_id, status, bands:band_id ( band_genres ( genres ( name ) ) )')
      .eq('venue_id', venue.id)
      .in('status', ['confirmed', 'cancellation_requested'])
  ])

  const genreNames = ((venueGenres ?? []) as unknown as { genres: { name: string } | null }[])
    .map((vg) => vg.genres?.name)
    .filter(Boolean) as string[]

  const isClaimed = !!venue.claimed_by_user_id
  const isOwner = !!user && user.id === venue.claimed_by_user_id
  const hasPendingClaim = !!pendingClaim
  const activeSocials = SOCIAL_LINKS.filter(({ key }) => venue[key])
  const bookingDates = (rawBookingDates ?? []) as Array<{
    id: string
    show_date: string
    bill_cap: number
    is_closed_to_more_bands: boolean
    is_unavailable: boolean
    show_type: VenueBookingDate['show_type']
    genre_focus: string | null
  }>
  const bookings = (rawBookings ?? []) as Array<{
    venue_booking_date_id: string
    status: 'confirmed' | 'cancellation_requested' | 'cancelled'
    bands?:
      | {
          band_genres?: Array<{ genres?: { name: string | null } | null }> | null
        }
      | null
  }>
  const automatedGenreFocusByBookingDateId = Object.fromEntries(buildVenueDateGenreFocusMap(bookings))
  const initialSelectedDate =
    selectedDateParam &&
    /^\d{4}-\d{2}-\d{2}$/.test(selectedDateParam) &&
    bookingDates.some((entry) => entry.show_date === selectedDateParam)
      ? selectedDateParam
      : todayIso

  let userBands: { id: string; name: string; genres?: string[] }[] = []
  let userVenues: { id: string; name: string }[] = []
  if (user && !isOwner) {
    const [{ data: bands }, { data: venues }] = await Promise.all([
      supabase
        .from('bands')
        .select('id, name, band_genres ( genres ( name ) )')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('name'),
      supabase
        .from('venues')
        .select('id, name')
        .eq('claimed_by_user_id', user.id)
        .eq('is_active', true)
        .order('name'),
    ])
    userBands =
      ((bands ?? []) as unknown as Array<{
        id: string
        name: string
        band_genres?: Array<{ genres?: Array<{ name: string | null }> | { name: string | null } | null }> | null
      }>).map((band) => ({
        id: band.id,
        name: band.name,
        genres: (band.band_genres ?? [])
          .flatMap((entry) => (Array.isArray(entry.genres) ? entry.genres : entry.genres ? [entry.genres] : []))
          .map((genre) => genre.name?.trim() ?? null)
          .filter((value): value is string => !!value),
      }))
    userVenues = venues ?? []
  }
  const identities: ManagedIdentity[] = [
    ...userBands.map((band) => ({
      kind: 'band' as const,
      id: band.id,
      name: band.name,
      href: `/dashboard/bands/${band.id}/edit`,
    })),
    ...userVenues.map((userVenue) => ({
      kind: 'venue' as const,
      id: userVenue.id,
      name: userVenue.name,
      href: `/dashboard/venues/${userVenue.id}/edit`,
    })),
  ]
  const cookieStore = await cookies()
  const activeIdentity = resolveActiveIdentity(cookieStore.get(ACTIVE_IDENTITY_COOKIE)?.value, identities)
  const contactBands = activeIdentity.kind === 'band'
    ? userBands.filter((band) => band.id === activeIdentity.id)
    : []
  const contactIdentityNotice = user && userBands.length > 0 && activeIdentity.kind !== 'band'
    ? {
        title: activeIdentity.kind === 'all'
          ? 'Select an artist before requesting contact'
          : 'Switch to an artist before requesting contact',
        body: activeIdentity.kind === 'all'
          ? 'This contact request needs one artist identity. Choose an artist in the Acting as menu, then request contact.'
          : `You are acting as ${activeIdentityLabel(activeIdentity)}. Switch the Acting as menu to an artist before contacting this venue.`,
      }
    : null
  const privateChatIdentityNotice = user && identities.length > 0 && activeIdentity.kind === 'all'
    ? {
        title: 'Select a profile before starting a private chat',
        body: 'Choose the artist or venue profile you want to use in the Acting as menu, then start the private chat.',
      }
    : null

  let existingThreadInfo: { threadId: string; confirmedUpcomingDate: string | null } | null = null
  if (contactBands.length > 0) {
    const { data: threadRow } = await supabase
      .from('contact_threads')
      .select('id, bookings(show_date, status)')
      .eq('venue_id', venue.id)
      .eq('band_id', contactBands[0].id)
      .maybeSingle()

    if (threadRow) {
      const upcomingConfirmed = ((threadRow.bookings ?? []) as Array<{ show_date: string; status: string }>)
        .filter((b) => b.status === 'confirmed' && b.show_date >= todayIso)
        .sort((a, b) => a.show_date.localeCompare(b.show_date))

      existingThreadInfo = {
        threadId: threadRow.id,
        confirmedUpcomingDate: upcomingConfirmed[0]?.show_date ?? null,
      }
    }
  }

  const locationLine = formatVenueLocation(venue)
  const primaryGenre = genreNames[0] ?? 'Live music'
  const claimStatusLabel = isOwner ? 'Managed by you' : isClaimed ? 'Claimed venue' : 'Unclaimed venue'
  const claimStatusTone = isOwner ? 'success' : isClaimed ? 'muted' : 'brand'

  return (
    <div className={`bg-[#F7F4EE] ${user ? '' : 'pt-16'}`}>
      <section className="relative overflow-hidden border-b border-[#1F1F1F] bg-[#111111] text-white">
        <Image
          src="/concert-hero.jpg"
          alt=""
          fill
          priority
          className="object-cover object-center opacity-45"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,8,8,0.44)_0%,rgba(8,8,8,0.78)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,_rgba(253,106,47,0.24),_transparent_28%),radial-gradient(circle_at_82%_18%,_rgba(14,116,144,0.18),_transparent_24%)]" />

        <div className="relative mx-auto max-w-7xl px-6 py-12 sm:py-16 lg:px-8 lg:py-20">
          <Link
            href="/venues"
            className="inline-flex min-h-9 items-center gap-2 text-sm font-semibold text-white/72 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Venue directory
          </Link>

          <div className="mt-9 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
            <div className="max-w-4xl">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="brand" className="border-white/15 bg-white/10 text-white">
                  <Music2 className="h-3.5 w-3.5 text-[#F6B293]" />
                  {primaryGenre}
                </Badge>
                <Badge tone={claimStatusTone}>
                  {claimStatusLabel}
                </Badge>
              </div>

              <h1 className="mt-5 font-[var(--font-barlow)] text-5xl font-black uppercase leading-[0.92] tracking-normal text-white sm:text-6xl lg:text-7xl">
                {venue.name}
              </h1>

              <p className="mt-5 flex max-w-2xl items-start gap-2 text-base leading-7 text-white/78 sm:text-lg">
                <MapPin className="mt-1 h-5 w-5 shrink-0 text-[#F6B293]" />
                <span>{locationLine}</span>
              </p>

              {venue.description && (
                <p className="mt-6 max-w-3xl text-base leading-8 text-white/82 sm:text-lg">
                  {venue.description}
                </p>
              )}

              {genreNames.length > 0 && (
                <div className="mt-7 flex flex-wrap gap-2">
                  {genreNames.map((name) => (
                    <span
                      key={name}
                      className="inline-flex min-h-8 items-center rounded-full border border-white/12 bg-white/10 px-3 text-xs font-semibold text-white/84 backdrop-blur"
                    >
                      {name}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-[28px] border border-white/12 bg-black/36 p-5 shadow-[0_22px_54px_rgba(0,0,0,0.24)] backdrop-blur-md">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#F6B293]">Venue facts</p>
              <div className="mt-5 grid gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/54">Capacity</p>
                  <p className="mt-1 text-2xl font-semibold text-white">
                    {venue.capacity ? venue.capacity.toLocaleString() : 'Not listed'}
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.07] px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/54">Age policy</p>
                    <p className="mt-1 text-sm font-semibold text-white">
                      {venue.age_requirement ? AGE_LABELS[venue.age_requirement] : 'Not listed'}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.07] px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/54">Default bill</p>
                    <p className="mt-1 text-sm font-semibold text-white">
                      {venue.default_bill_cap} act{venue.default_bill_cap === 1 ? '' : 's'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-8 px-6 py-10 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-8 lg:py-12">
        <div className="min-w-0 space-y-8">
          <section className="rounded-[28px] border border-[#E6DFD3] bg-white p-6 shadow-[0_18px_42px_rgba(17,17,17,0.05)] sm:p-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#A24A22]">Overview</p>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight text-[#111111]">Room profile</h2>
              </div>
              <ButtonLink href="/events" tone="secondary">
                <CalendarDays className="h-4 w-4" />
                Browse Events
              </ButtonLink>
            </div>

            <div className="mt-7 grid gap-5 sm:grid-cols-2">
              <DetailRow icon={MapPin} label="Location" value={locationLine} />
              {venue.capacity && (
                <DetailRow icon={Users} label="Capacity" value={`${venue.capacity.toLocaleString()} cap`} />
              )}
              {venue.age_requirement && (
                <DetailRow icon={ShieldCheck} label="Age policy" value={AGE_LABELS[venue.age_requirement]} />
              )}
              <DetailRow icon={Music2} label="Bill target" value={`${venue.default_bill_cap} act${venue.default_bill_cap === 1 ? '' : 's'} by default`} />
            </div>
          </section>

          {!isOwner && (
            <PublicVenueBookingPanel
              todayIso={todayIso}
              bookingDates={bookingDates}
              bookings={bookings}
              automatedGenreFocusByBookingDateId={automatedGenreFocusByBookingDateId}
              defaultBillCap={venue.default_bill_cap}
              venueId={venue.id}
              venueSlug={venue.slug}
              userBands={contactBands}
              isSignedIn={!!user}
              initialSelectedDate={initialSelectedDate}
              identityNotice={contactIdentityNotice}
              existingThread={existingThreadInfo}
              activeBandName={contactBands[0]?.name ?? null}
            />
          )}
        </div>

        <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          {!isOwner && (
            <section className="rounded-[28px] border border-[#E6DFD3] bg-white p-5 shadow-[0_18px_42px_rgba(17,17,17,0.05)]">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#A24A22]">Private chat</p>
              <div className="mt-4">
                {user && privateChatIdentityNotice ? (
                  <div className="rounded-xl border border-[#F2D7A6] bg-[#FFF7E8] px-4 py-3 text-sm">
                    <p className="font-semibold text-[#8A5A12]">{privateChatIdentityNotice.title}</p>
                    <p className="mt-1 text-[#8A5A12]/85">{privateChatIdentityNotice.body}</p>
                  </div>
                ) : user && activeIdentity.kind !== 'all' ? (
                  <PrivateChatRequestButton
                    senderIdentity={activeIdentity}
                    targetKind="venue"
                    targetId={venue.id}
                    targetName={venue.name}
                    buttonLabel="Start private chat"
                    className="w-full"
                  />
                ) : user ? (
                  <p className="text-sm leading-6 text-[#777777]">
                    Create or claim an artist or venue profile to start a private chat.
                  </p>
                ) : (
                  <p className="text-sm leading-6 text-[#777777]">
                    <Link href={`/login?redirectTo=/venues/${venue.slug}`} className="font-semibold text-[#FD6A2F] hover:underline">
                      Sign in
                    </Link>{' '}
                    and choose a profile to start a private chat.
                  </p>
                )}
              </div>
            </section>
          )}

          <section className="rounded-[28px] border border-[#E6DFD3] bg-white p-5 shadow-[0_18px_42px_rgba(17,17,17,0.05)]">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#A24A22]">Booking details</p>
            <div className="mt-5 space-y-4">
              {venue.booking_email && (
                <DetailRow
                  icon={Mail}
                  label="Booking email"
                  value={
                    <a href={`mailto:${venue.booking_email}`} className="font-medium text-[#FD6A2F] hover:underline">
                      {venue.booking_email}
                    </a>
                  }
                />
              )}
              {venue.phone && <DetailRow icon={Phone} label="Phone" value={venue.phone} />}
              {!venue.booking_email && !venue.phone && (
                <p className="text-sm leading-6 text-[#777777]">Booking contact details have not been listed yet.</p>
              )}
            </div>
          </section>

          {activeSocials.length > 0 && (
            <section className="rounded-[28px] border border-[#E6DFD3] bg-white p-5 shadow-[0_18px_42px_rgba(17,17,17,0.05)]">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#A24A22]">Links</p>
              <div className="mt-4 space-y-2">
                {activeSocials.map(({ key, label, icon: Icon }) => (
                  <a
                    key={key}
                    href={venue[key] as string}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex min-h-12 items-center justify-between gap-3 rounded-2xl border border-[#EEEEEE] bg-[#FAFAFA] px-4 text-sm font-semibold text-[#252525] transition-all hover:border-[#D4D4D4] hover:bg-white"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <Icon className="h-4 w-4 shrink-0 text-[#FD6A2F]" />
                      <span className="truncate">{label}</span>
                    </span>
                    <ExternalLink className="h-4 w-4 shrink-0 text-[#A0A0A0]" />
                  </a>
                ))}
              </div>
            </section>
          )}

          <section className="rounded-[28px] border border-[#E6DFD3] bg-white p-5 shadow-[0_18px_42px_rgba(17,17,17,0.05)]">
            {isOwner ? (
              <div>
                <Badge tone="success">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  You own this venue
                </Badge>
                <p className="mt-3 text-sm leading-6 text-[#666666]">
                  Manage profile details, contact information, and booking availability from the dashboard.
                </p>
                <ButtonLink href={`/dashboard/venues/${venue.id}/edit`} tone="dark" className="mt-5 w-full">
                  <PencilLine className="h-4 w-4" />
                  Edit venue info
                </ButtonLink>
              </div>
            ) : isClaimed ? (
              <div>
                <Badge tone="muted">Claimed venue</Badge>
                <p className="mt-3 text-sm leading-6 text-[#666666]">This venue is already managed on TourAligner.</p>
              </div>
            ) : (
              <div>
                <Badge tone="brand">Unclaimed venue</Badge>
                <p className="mt-3 text-sm leading-6 text-[#666666]">
                  Claim this profile to manage venue details and receive contact requests.
                </p>
                <div className="mt-5">
                  <ClaimButton
                    venueId={venue.id}
                    venueSlug={venue.slug}
                    isLoggedIn={!!user}
                    hasPendingClaim={hasPendingClaim}
                  />
                </div>
              </div>
            )}
          </section>
        </aside>
      </div>
    </div>
  )
}
