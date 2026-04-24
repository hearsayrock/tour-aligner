import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { cookies } from 'next/headers'
import type { Metadata } from 'next'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { CoverBanner } from './CoverBanner'
import { RequestContactForm } from '@/components/contact/RequestContactForm'
import {
  ACTIVE_IDENTITY_COOKIE,
  activeIdentityLabel,
  resolveActiveIdentity,
  type ManagedIdentity,
} from '@/lib/managed-identity'

export const revalidate = 60

export async function generateStaticParams() {
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const { data } = await supabase.from('bands').select('slug').eq('is_active', true)
  return (data ?? []).map(({ slug }) => ({ slug }))
}

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const TOURING_RADIUS_LABELS: Record<string, string> = {
  local:         'Local (within ~100 mi)',
  regional:      'Regional (multi-state)',
  national:      'Nationwide',
  international: 'Worldwide',
}

// Streaming: key → DB field, label, icon circle bg, Simple Icons slug (white version)
const STREAMING: { key: string; label: string; bg: string; slug: string }[] = [
  { key: 'spotify_url',     label: 'Spotify',     bg: '#1DB954', slug: 'spotify'     },
  { key: 'apple_music_url', label: 'Apple Music', bg: '#FC3C44', slug: 'applemusic'  },
  { key: 'youtube_url',     label: 'YouTube',      bg: '#FF0000', slug: 'youtube'     },
  { key: 'soundcloud_url',  label: 'SoundCloud',  bg: '#FF3300', slug: 'soundcloud'  },
  { key: 'bandcamp_url',    label: 'Bandcamp',    bg: '#1DA0C3', slug: 'bandcamp'    },
]

const SOCIALS: { key: string; label: string; bg: string; slug: string }[] = [
  { key: 'facebook_url',  label: 'Facebook',  bg: '#1877F2', slug: 'facebook'   },
  { key: 'instagram_url', label: 'Instagram', bg: '#E1306C', slug: 'instagram'  },
  { key: 'tiktok_url',    label: 'TikTok',    bg: '#010101', slug: 'tiktok'     },
  { key: 'twitter_url',   label: 'X',         bg: '#000000', slug: 'x'          },
]

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function toSpotifyEmbed(url: string): string | null {
  const m = url.match(/spotify\.com\/(track|album|playlist|artist)\/([A-Za-z0-9]+)/)
  if (!m) return null
  return `https://open.spotify.com/embed/${m[1]}/${m[2]}?utm_source=generator&theme=0`
}

// ─────────────────────────────────────────────────────────────
// Metadata
// ─────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()
  const { data } = await supabase
    .from('bands')
    .select('name, tagline')
    .eq('slug', slug)
    .eq('is_active', true)
    .single()
  if (!data) return {}
  return { title: data.name, description: data.tagline ?? undefined }
}

// ─────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────

export default async function BandProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  const [{ data: rawBand }, { data: { user } }] = await Promise.all([
    supabase
      .from('bands')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .single(),
    supabase.auth.getUser(),
  ])

  const band = rawBand as import('@/types/database').Band | null
  if (!band) return notFound()

  const [{ data: bandGenres }, { data: rawShows }] = await Promise.all([
    supabase
      .from('band_genres')
      .select('genre_id, genres(name)')
      .eq('band_id', band.id),
    supabase
      .from('bookings')
      .select('id, show_date, venues(name, location_city, location_state)')
      .eq('band_id', band.id)
      .in('status', ['confirmed', 'cancellation_requested'])
      .gte('show_date', today)
      .order('show_date')
      .limit(8),
  ])

  type ShowRow = {
    id: string
    show_date: string
    venues: { name: string; location_city: string; location_state: string } | null
  }
  const shows = (rawShows ?? []) as unknown as ShowRow[]

  const genreNames = (
    (bandGenres ?? []) as unknown as { genres: { name: string } | null }[]
  )
    .map((bg) => bg.genres?.name)
    .filter(Boolean) as string[]

  const hasCover   = !!band.cover_photo_url
  const hasProfile = !!band.profile_photo_url
  const embedUrl   = band.featured_track_url ? toSpotifyEmbed(band.featured_track_url) : null

  const streamingLinks = STREAMING.filter(({ key }) => !!band[key as keyof typeof band])
  const socialLinks    = SOCIALS.filter(({ key })    => !!band[key as keyof typeof band])
  const isOwner = !!user && user.id === band.user_id

  let userVenues: { id: string; name: string }[] = []
  let userBands: { id: string; name: string }[] = []

  if (user && !isOwner) {
    const [{ data: venues }, { data: bands }] = await Promise.all([
      supabase
        .from('venues')
        .select('id, name')
        .eq('claimed_by_user_id', user.id)
        .eq('is_active', true)
        .order('name'),
      supabase
        .from('bands')
        .select('id, name')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('name'),
    ])

    userVenues = venues ?? []
    userBands = bands ?? []
  }
  const identities: ManagedIdentity[] = [
    ...userBands.map((userBand) => ({
      kind: 'band' as const,
      id: userBand.id,
      name: userBand.name,
      href: `/dashboard/bands/${userBand.id}/edit`,
    })),
    ...userVenues.map((venue) => ({
      kind: 'venue' as const,
      id: venue.id,
      name: venue.name,
      href: `/dashboard/venues/${venue.id}/edit`,
    })),
  ]
  const cookieStore = await cookies()
  const activeIdentity = resolveActiveIdentity(cookieStore.get(ACTIVE_IDENTITY_COOKIE)?.value, identities)
  const contactVenues = activeIdentity.kind === 'venue'
    ? userVenues.filter((venue) => venue.id === activeIdentity.id)
    : []
  const contactIdentityNotice = user && userVenues.length > 0 && activeIdentity.kind !== 'venue'
    ? {
        title: activeIdentity.kind === 'all'
          ? 'Select a venue before requesting contact'
          : 'Switch to a venue before requesting contact',
        body: activeIdentity.kind === 'all'
          ? 'This contact request needs one venue identity. Choose a venue in the Acting as menu, then request contact.'
          : `You are acting as ${activeIdentityLabel(activeIdentity)}. Switch the Acting as menu to a venue before contacting this artist.`,
      }
    : null

  return (
    <div className="pt-14">

      {/* ── Cover photo — full-bleed ── */}
      {hasCover && (
        <CoverBanner coverUrl={band.cover_photo_url!} bandName={band.name} />
      )}

      {/* ── Identity section — sits on white, below cover ── */}
      <div className="bg-white border-b border-[#EEEEEE]">
        <div className="max-w-[976px] mx-auto px-4 sm:px-6 py-6">
          <div className="flex items-center gap-5">

            {/* Profile photo */}
            {hasProfile && (
              <div className="relative w-[88px] h-[88px] rounded-full border-[3px] border-white shadow-md shrink-0 overflow-hidden bg-[#E0E0E0]">
                <Image
                  src={band.profile_photo_url!}
                  alt={band.name}
                  fill
                  className="object-cover"
                  sizes="88px"
                />
              </div>
            )}

            {/* Name + tagline + genres */}
            <div>
              <h1
                className="font-barlow font-semibold uppercase leading-none tracking-wide text-[#1A1A1A]"
                style={{ fontSize: '50px' }}
              >
                {band.name}
              </h1>
              {band.description && (
                <p className="text-sm text-[#777777] mt-1 max-w-xl line-clamp-2">
                  {band.description}
                </p>
              )}
              {genreNames.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {genreNames.map((name) => (
                    <span
                      key={name}
                      className="text-[10px] font-bold uppercase tracking-wider border border-[#F1CABD] text-[#252525] p-2 rounded"
                    >
                      {name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="max-w-[976px] mx-auto px-4 sm:px-6 py-8 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_272px] gap-8">

          {/* ────────── LEFT COLUMN ────────── */}
          <div className="space-y-8 min-w-0">

            {/* Featured Track */}
            {embedUrl && (
              <section>
                <h2
                  className="font-barlow font-bold text-[#1A1A1A] mb-3"
                  style={{ fontSize: '22px' }}
                >
                  Featured Track
                </h2>
                <iframe
                  src={embedUrl}
                  width="100%"
                  height="152"
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  loading="lazy"
                  className="border-0 rounded-xl"
                  style={{ borderRadius: '12px' }}
                />
              </section>
            )}

            {/* Upcoming Shows */}
            <section>
              <h2
                className="font-barlow font-semibold text-[#1A1A1A] mb-4"
                style={{ fontSize: '22px' }}
              >
                Upcoming Shows
              </h2>

              {shows.length > 0 ? (
                <div className="divide-y divide-[#F0F0F0]">
                  {shows.map((show) => {
                    const d     = new Date(show.show_date + 'T00:00:00')
                    const month = d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()
                    const day   = d.getDate()
                    const v     = show.venues

                    return (
                      <div
                        key={show.id}
                        className="flex items-center gap-4 py-3.5"
                      >
                        {/* Date block */}
                        <div className="w-[46px] h-[52px] rounded-lg bg-[#E8724E] flex flex-col items-center justify-center text-white shrink-0">
                          <span className="text-[9px] font-extrabold uppercase leading-none tracking-wider">{month}</span>
                          <span className="text-[22px] font-black leading-none mt-0.5">{day}</span>
                        </div>

                        {/* Venue + location */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-[#1A1A1A] truncate">
                            {v?.name ?? 'TBA'}
                          </p>
                        </div>

                        {/* City, State — right aligned */}
                        {v && (
                          <p className="text-xs text-[#888888] shrink-0 text-right">
                            {[v.location_city, v.location_state].filter(Boolean).join(', ')}
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                /* Empty state */
                <div className="border-2 border-dashed border-[#E8E8E8] rounded-2xl py-10 px-6 flex flex-col items-center text-center">
                  {/* Tour van illustration */}
                  <svg width="180" height="90" viewBox="0 0 180 90" fill="none" className="mb-5">
                    {/* Road */}
                    <rect x="0" y="76" width="180" height="3" rx="1.5" fill="#EEEEEE" />
                    {/* Dashed center line */}
                    <rect x="20" y="77" width="16" height="1" rx="0.5" fill="#DDDDDD" />
                    <rect x="52" y="77" width="16" height="1" rx="0.5" fill="#DDDDDD" />
                    <rect x="84" y="77" width="16" height="1" rx="0.5" fill="#DDDDDD" />
                    <rect x="116" y="77" width="16" height="1" rx="0.5" fill="#DDDDDD" />
                    <rect x="148" y="77" width="16" height="1" rx="0.5" fill="#DDDDDD" />

                    {/* Van body */}
                    <rect x="22" y="32" width="108" height="42" rx="4" fill="#F0F0F0" stroke="#DDDDDD" strokeWidth="1.5" />

                    {/* Cab bump (raised roof over driver) */}
                    <rect x="96" y="20" width="34" height="14" rx="3" fill="#F0F0F0" stroke="#DDDDDD" strokeWidth="1.5" />

                    {/* Windshield */}
                    <rect x="99" y="23" width="28" height="9" rx="2" fill="#D8EEF7" stroke="#CCCCCC" strokeWidth="1" />

                    {/* Side windows — two small porthole windows on the cargo area */}
                    <rect x="32" y="40" width="18" height="13" rx="2" fill="#D8EEF7" stroke="#CCCCCC" strokeWidth="1" />
                    <rect x="58" y="40" width="18" height="13" rx="2" fill="#D8EEF7" stroke="#CCCCCC" strokeWidth="1" />

                    {/* Rear door seam */}
                    <line x1="22" y1="53" x2="22" y2="74" stroke="#DDDDDD" strokeWidth="1" />

                    {/* Side body crease */}
                    <line x1="22" y1="58" x2="130" y2="58" stroke="#E4E4E4" strokeWidth="1" />

                    {/* Headlight */}
                    <rect x="126" y="48" width="5" height="8" rx="1.5" fill="#FFF5CC" stroke="#DDDDDD" strokeWidth="1" />

                    {/* Tail light */}
                    <rect x="22" y="48" width="4" height="8" rx="1.5" fill="#FFD0CC" stroke="#DDDDDD" strokeWidth="1" />

                    {/* Door handle */}
                    <rect x="88" y="55" width="8" height="2" rx="1" fill="#CCCCCC" />

                    {/* Front wheel */}
                    <circle cx="112" cy="76" r="10" fill="#E0E0E0" stroke="#CCCCCC" strokeWidth="1.5" />
                    <circle cx="112" cy="76" r="5" fill="#EBEBEB" stroke="#CCCCCC" strokeWidth="1" />
                    <circle cx="112" cy="76" r="1.5" fill="#CCCCCC" />

                    {/* Rear wheel */}
                    <circle cx="46" cy="76" r="10" fill="#E0E0E0" stroke="#CCCCCC" strokeWidth="1.5" />
                    <circle cx="46" cy="76" r="5" fill="#EBEBEB" stroke="#CCCCCC" strokeWidth="1" />
                    <circle cx="46" cy="76" r="1.5" fill="#CCCCCC" />

                    {/* Wheel well arches */}
                    <path d="M100 74 Q112 62 124 74" stroke="#CCCCCC" strokeWidth="1.5" fill="none" />
                    <path d="M34 74 Q46 62 58 74" stroke="#CCCCCC" strokeWidth="1.5" fill="none" />

                    {/* Bumper sticker vibes — tiny rectangle on back */}
                    <rect x="27" y="63" width="14" height="5" rx="1" fill="#FD6A2F" opacity="0.35" />

                    {/* Exhaust smoke puffs */}
                    <circle cx="18" cy="71" r="3" fill="#EEEEEE" />
                    <circle cx="12" cy="68" r="2.5" fill="#F3F3F3" />
                    <circle cx="7" cy="65" r="2" fill="#F7F7F7" />
                  </svg>

                  <p className="text-[17px] font-semibold text-[#444444]">The van is empty</p>
                  <p className="text-sm text-[#888888] mt-1 max-w-[200px] leading-relaxed">
                    No upcoming shows… yet.<br />Book some.
                  </p>
                  <Link
                    href="/venues"
                    className="mt-3 text-sm font-semibold text-[#FD6A2F] hover:underline"
                  >
                    Find venues →
                  </Link>
                </div>
              )}
            </section>

            {/* ── Touring info ── */}
            {(band.touring_radius || band.location_city || band.location_state) && (
              <div className="mt-[36px] bg-white border border-[#E8E8E8] rounded-[4px] p-6 grid grid-cols-2 gap-8">
                {band.touring_radius && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#AAAAAA] mb-1">
                      Travel Radius
                    </p>
                    <p className="text-sm text-[#252525]">
                      {TOURING_RADIUS_LABELS[band.touring_radius] ?? band.touring_radius}
                    </p>
                    {(band.location_city || band.location_state) && (
                      <p className="text-xs text-[#888888] mt-0.5">
                        from {[band.location_city, band.location_state].filter(Boolean).join(', ')}
                      </p>
                    )}
                  </div>
                )}
                {(band.location_city || band.location_state) && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#AAAAAA] mb-1">
                      Home Base
                    </p>
                    <p className="text-sm text-[#252525]">
                      {[band.location_city, band.location_state].filter(Boolean).join(', ')}
                    </p>
                  </div>
                )}
              </div>
            )}

          </div>

          {/* ────────── RIGHT COLUMN ────────── */}
          <div className="space-y-6">

            {/* Listen */}
            {streamingLinks.length > 0 && (
              <section>
                <p className="font-barlow font-medium text-[#888888] pb-[4px] mb-[16px] border-b border-[#ADADAD]" style={{ fontSize: '18px' }}>
                  Listen
                </p>
                <div className="space-y-1.5">
                  {streamingLinks.map(({ key, label, bg, slug }) => (
                    <a
                      key={key}
                      href={band[key as keyof typeof band] as string}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 bg-white border border-[#EEEEEE] rounded-xl px-3.5 py-2.5 hover:border-[#CCCCCC] hover:shadow-sm transition-all group"
                    >
                      {/* Colored circle icon */}
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                        style={{ backgroundColor: bg }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`https://cdn.simpleicons.org/${slug}/ffffff`}
                          alt={label}
                          width="15"
                          height="15"
                        />
                      </div>
                      <span className="text-sm font-medium text-[#252525] flex-1">{label}</span>
                      <svg
                        width="14" height="14" viewBox="0 0 24 24" fill="none"
                        stroke="#CCCCCC" strokeWidth="2.5"
                        className="group-hover:stroke-[#888888] transition-colors shrink-0"
                      >
                        <path d="M9 18l6-6-6-6" />
                      </svg>
                    </a>
                  ))}
                </div>
              </section>
            )}

            {/* Connect */}
            {socialLinks.length > 0 && (
              <section className="mt-4">
                <p className="font-barlow font-medium text-[#888888] pb-[4px] mb-[16px] border-b border-[#ADADAD]" style={{ fontSize: '18px' }}>
                  Connect
                </p>
                <div className="flex gap-2.5">
                  {socialLinks.map(({ key, label, slug }) => (
                    <a
                      key={key}
                      href={band[key as keyof typeof band] as string}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={label}
                      className="hover:opacity-60 transition-opacity"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`https://cdn.simpleicons.org/${slug}/444444`}
                        alt={label}
                        width="20"
                        height="20"
                      />
                    </a>
                  ))}
                </div>
              </section>
            )}

            {/* Book Us */}
            <section className="bg-[#F5F5F5] rounded-2xl p-5">
              <h3
                className="font-barlow font-medium uppercase text-[#1A1A1A] mb-2"
                style={{ fontSize: '22px' }}
              >
                Request Contact
              </h3>
              {isOwner ? (
                <p className="text-sm text-[#777777] leading-relaxed">
                  This is your artist profile.
                </p>
              ) : user && contactIdentityNotice ? (
                <div className="rounded-xl border border-[#F2D7A6] bg-[#FFF7E8] px-4 py-3 text-sm">
                  <p className="font-semibold text-[#8A5A12]">{contactIdentityNotice.title}</p>
                  <p className="mt-1 text-[#8A5A12]/85">{contactIdentityNotice.body}</p>
                </div>
              ) : user && contactVenues.length > 0 ? (
                <RequestContactForm
                  initiatorSide="venue"
                  targetBandId={band.id}
                  options={contactVenues}
                />
              ) : user ? (
                <p className="text-sm text-[#777777] leading-relaxed">
                  Claim a venue to start contacting artists from inside the app.{' '}
                  <Link href="/dashboard/venues" className="text-[#FD6A2F] hover:underline">
                    Manage venues
                  </Link>
                  .
                </p>
              ) : (
                <p className="text-sm text-[#777777] leading-relaxed">
                  <Link href={`/login?redirectTo=/bands/${band.slug}`} className="text-[#FD6A2F] hover:underline">
                    Sign in
                  </Link>{' '}
                  and claim a venue to request contact.
                </p>
              )}
            </section>

          </div>
        </div>

      </div>
    </div>
  )
}
