import { notFound } from 'next/navigation'
import Link from 'next/link'
import { cookies } from 'next/headers'
import type { Metadata } from 'next'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { CheckCircle2, PencilLine } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { ClaimButton } from '@/components/venues/ClaimButton'
import { PublicVenueBookingPanel } from '@/components/venues/PublicVenueBookingPanel'
import { PrivateChatRequestButton } from '@/components/private-chat/PrivateChatRequestButton'
import { Badge, ButtonLink } from '@/components/ui/primitives'
import { VenuePageCanvas } from '@/components/profile-page/venue/VenuePageCanvas'
import { parseProfilePageBlock } from '@/components/profile-page/blocks/profile-page-blocks'
import { VENUE_PAGE_BLOCK_TYPES } from '@/components/profile-page/venue/venue-page-config'
import { getVenueCalendarRange } from '@/lib/venue-calendar'
import { buildVenueDateGenreFocusMap } from '@/lib/venue-booking-date'
import { ACTIVE_IDENTITY_COOKIE, activeIdentityLabel, resolveActiveIdentity, type ManagedIdentity } from '@/lib/managed-identity'
import type { Genre, ProfilePageBlock, Venue, VenueBookingDate } from '@/types/database'

export const revalidate = 60

export async function generateStaticParams() {
  const supabase = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  const { data } = await supabase.from('venues').select('slug').eq('is_active', true).eq('is_unlisted', false)
  return (data ?? []).map(({ slug }) => ({ slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params; const supabase = await createClient()
  const { data } = await supabase.from('venues').select('name, location_city, location_state').eq('slug', slug).eq('is_active', true).eq('is_unlisted', false).single()
  return data ? { title: data.name, description: `${data.name} - ${data.location_city}, ${data.location_state}` } : {}
}

export default async function VenueDetailPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ selectedDate?: string; edit?: string }> }) {
  const { slug } = await params; const { selectedDate: selectedDateParam, edit } = await searchParams; const supabase = await createClient(); const todayIso = new Date().toISOString().slice(0, 10); const calendarRange = getVenueCalendarRange(todayIso, 6)
  const [{ data: rawVenue }, { data: { user } }] = await Promise.all([supabase.from('venues').select('*').eq('slug', slug).eq('is_active', true).eq('is_unlisted', false).single(), supabase.auth.getUser()])
  const venue = rawVenue ? structuredClone(rawVenue) as Venue : null
  if (!venue) return notFound()
  const isOwner = user?.id === venue.claimed_by_user_id
  const [{ data: venueGenres }, { data: pendingClaim }, { data: rawBookingDates }, { data: rawBookings }, { data: rawBlocks }, { data: rawGenres }] = await Promise.all([
    supabase.from('venue_genres').select('genre_id, genres(name)').eq('venue_id', venue.id),
    user ? supabase.from('venue_claims').select('id').eq('venue_id', venue.id).eq('user_id', user.id).eq('status', 'pending').maybeSingle() : Promise.resolve({ data: null }),
    supabase.from('venue_booking_dates').select('id, show_date, bill_cap, is_closed_to_more_bands, is_unavailable, show_type, genre_focus').eq('venue_id', venue.id).gte('show_date', calendarRange.rangeStart).lte('show_date', calendarRange.rangeEnd).order('show_date'),
    supabase.from('bookings').select('venue_booking_date_id, status, bands:band_id ( band_genres ( genres ( name ) ) )').eq('venue_id', venue.id).in('status', ['confirmed', 'cancellation_requested']),
    supabase.from('profile_page_blocks').select('*').eq('venue_id', venue.id).order('created_at'),
    isOwner && edit === '1' ? supabase.from('genres').select('id, name').order('name') : Promise.resolve({ data: [] as Pick<Genre, 'id' | 'name'>[] }),
  ])
  const genreNames = ((venueGenres ?? []) as unknown as { genres: { name: string } | null }[]).map((entry) => entry.genres?.name).filter(Boolean) as string[]
  const blocks = (structuredClone(rawBlocks ?? []) as ProfilePageBlock[]).flatMap((row) => { const block = parseProfilePageBlock(row); return block && VENUE_PAGE_BLOCK_TYPES.includes(block.blockType) ? [block] : [] })
  const bookingDates = (rawBookingDates ?? []) as Array<Pick<VenueBookingDate, 'id' | 'show_date' | 'bill_cap' | 'is_closed_to_more_bands' | 'is_unavailable' | 'show_type' | 'genre_focus'>>
  const bookings = (rawBookings ?? []) as Array<{ venue_booking_date_id: string; status: 'confirmed' | 'cancellation_requested' | 'cancelled'; bands?: { band_genres?: Array<{ genres?: { name: string | null } | null }> | null } | null }>
  const automatedGenreFocusByBookingDateId = Object.fromEntries(buildVenueDateGenreFocusMap(bookings))
  const initialSelectedDate = selectedDateParam && /^\d{4}-\d{2}-\d{2}$/.test(selectedDateParam) && bookingDates.some((entry) => entry.show_date === selectedDateParam) ? selectedDateParam : todayIso

  let userBands: { id: string; name: string; genres?: string[] }[] = []; let userVenues: { id: string; name: string; slug: string }[] = []
  if (user) {
    const [{ data: bands }, { data: venues }] = await Promise.all([supabase.from('bands').select('id, name, band_genres ( genres ( name ) )').eq('user_id', user.id).eq('is_active', true).order('name'), supabase.from('venues').select('id, name, slug').eq('claimed_by_user_id', user.id).eq('is_active', true).order('name')])
    userBands = ((bands ?? []) as unknown as Array<{ id: string; name: string; band_genres?: Array<{ genres?: Array<{ name: string | null }> | { name: string | null } | null }> | null }>).map((band) => ({ id: band.id, name: band.name, genres: (band.band_genres ?? []).flatMap((entry) => Array.isArray(entry.genres) ? entry.genres : entry.genres ? [entry.genres] : []).map((genre) => genre.name?.trim() ?? null).filter((value): value is string => !!value) }))
    userVenues = venues ?? []
  }
  const identities: ManagedIdentity[] = [...userBands.map((band) => ({ kind: 'band' as const, id: band.id, name: band.name, href: `/dashboard/bands/${band.id}/edit` })), ...userVenues.map((item) => ({ kind: 'venue' as const, id: item.id, name: item.name, href: `/venues/${item.slug}?edit=1` }))]
  const activeIdentity = resolveActiveIdentity((await cookies()).get(ACTIVE_IDENTITY_COOKIE)?.value, identities)
  const contactBands = activeIdentity.kind === 'band' ? userBands.filter((band) => band.id === activeIdentity.id) : []
  const contactIdentityNotice = user && userBands.length > 0 && activeIdentity.kind !== 'band' ? { title: activeIdentity.kind === 'all' ? 'Select an artist before requesting contact' : 'Switch to an artist before requesting contact', body: activeIdentity.kind === 'all' ? 'This contact request needs one artist identity. Choose an artist in the Acting as menu, then request contact.' : `You are acting as ${activeIdentityLabel(activeIdentity)}. Switch the Acting as menu to an artist before contacting this venue.` } : null
  const privateChatIdentityNotice = user && identities.length > 0 && activeIdentity.kind === 'all' ? { title: 'Select a profile before starting a private chat', body: 'Choose the artist or venue profile you want to use in the Acting as menu, then start the private chat.' } : null
  let existingThreadInfo: { threadId: string; confirmedUpcomingDate: string | null } | null = null
  if (contactBands.length > 0) {
    const { data: thread } = await supabase.from('contact_threads').select('id, bookings(show_date, status)').eq('venue_id', venue.id).eq('band_id', contactBands[0].id).maybeSingle()
    if (thread) { const upcoming = ((thread.bookings ?? []) as Array<{ show_date: string; status: string }>).filter((booking) => booking.status === 'confirmed' && booking.show_date >= todayIso).sort((a, b) => a.show_date.localeCompare(b.show_date)); existingThreadInfo = { threadId: thread.id, confirmedUpcomingDate: upcoming[0]?.show_date ?? null } }
  }
  const availabilityContent = !isOwner ? <PublicVenueBookingPanel todayIso={todayIso} bookingDates={bookingDates} bookings={bookings} automatedGenreFocusByBookingDateId={automatedGenreFocusByBookingDateId} defaultBillCap={venue.default_bill_cap} venueId={venue.id} venueSlug={venue.slug} userBands={contactBands} isSignedIn={!!user} initialSelectedDate={initialSelectedDate} identityNotice={contactIdentityNotice} existingThread={existingThreadInfo} activeBandName={contactBands[0]?.name ?? null} /> : undefined
  const privateChatContent = !isOwner ? <section className="h-full rounded-[28px] border border-[#E6DFD3] bg-white p-5 shadow-[0_18px_42px_rgba(17,17,17,0.05)]"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--profile-accent)]">Private chat</p><div className="mt-4">{user && privateChatIdentityNotice ? <div className="rounded-xl border border-[#F2D7A6] bg-[#FFF7E8] px-4 py-3 text-sm"><p className="font-semibold text-[#8A5A12]">{privateChatIdentityNotice.title}</p><p className="mt-1 text-[#8A5A12]/85">{privateChatIdentityNotice.body}</p></div> : user && activeIdentity.kind !== 'all' ? <PrivateChatRequestButton senderIdentity={activeIdentity} targetKind="venue" targetId={venue.id} targetName={venue.name} buttonLabel="Start private chat" className="w-full" /> : user ? <p className="text-sm leading-6 text-[#777777]">Create or claim an artist or venue profile to start a private chat.</p> : <p className="text-sm leading-6 text-[#777777]"><Link href={`/login?redirectTo=/venues/${venue.slug}`} className="font-semibold text-[var(--profile-accent)] hover:underline">Sign in</Link>{' '}and choose a profile to start a private chat.</p>}</div></section> : undefined
  const profileManagementContent = <section className="h-full rounded-[28px] border border-[#E6DFD3] bg-white p-5 shadow-[0_18px_42px_rgba(17,17,17,0.05)]">{isOwner ? <><Badge tone="success"><CheckCircle2 className="h-3.5 w-3.5" />This profile manages the venue</Badge><p className="mt-3 text-sm leading-6 text-[#666666]">Edit public content and design directly on this page. Availability remains in Calendar Workspace.</p><ButtonLink href={`/venues/${venue.slug}?edit=1`} tone="dark" className="mt-5 w-full"><PencilLine className="h-4 w-4" />Edit venue page</ButtonLink></> : venue.claimed_by_user_id ? <><Badge tone="muted">Claimed venue</Badge><p className="mt-3 text-sm leading-6 text-[#666666]">This venue is already managed on TourAligner.</p></> : <><Badge tone="brand">Unclaimed venue</Badge><p className="mt-3 text-sm leading-6 text-[#666666]">Claim this profile to manage venue details and receive contact requests.</p><div className="mt-5"><ClaimButton venueId={venue.id} venueSlug={venue.slug} isLoggedIn={!!user} hasPendingClaim={!!pendingClaim} /></div></>}</section>
  return <VenuePageCanvas venue={venue} genreNames={genreNames} selectedGenreIds={(venueGenres ?? []).map((entry) => entry.genre_id)} availableGenres={structuredClone(rawGenres ?? []) as Pick<Genre, 'id' | 'name'>[]} blocks={blocks} isOwner={isOwner} isEditing={isOwner && edit === '1'} hasViewer={!!user} availabilityContent={availabilityContent} privateChatContent={privateChatContent} profileManagementContent={profileManagementContent} />
}
