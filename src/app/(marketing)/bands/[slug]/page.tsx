import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
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
  MapPin,
  Mic2,
  PencilLine,
  Radio,
  Route,
  Users,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Badge, ButtonLink } from '@/components/ui/primitives'
import type { Band } from '@/types/database'

export const revalidate = 60

export async function generateStaticParams() {
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const { data } = await supabase.from('bands').select('slug').eq('is_active', true)
  return (data ?? []).map(({ slug }) => ({ slug }))
}

const TOURING_RADIUS_LABELS: Record<string, string> = {
  local: 'Local',
  regional: 'Regional',
  national: 'Nationwide',
  international: 'Worldwide',
}

const ARTIST_TYPE_LABELS: Record<string, string> = {
  solo: 'Solo artist',
  band: 'Band',
}

const STREAMING = [
  { key: 'spotify_url', label: 'Spotify', slug: 'spotify' },
  { key: 'apple_music_url', label: 'Apple Music', slug: 'applemusic' },
  { key: 'youtube_url', label: 'YouTube', slug: 'youtube' },
  { key: 'soundcloud_url', label: 'SoundCloud', slug: 'soundcloud' },
  { key: 'bandcamp_url', label: 'Bandcamp', slug: 'bandcamp' },
] as const

const SOCIALS = [
  { key: 'website_url', label: 'Website', icon: Globe },
  { key: 'instagram_url', label: 'Instagram', icon: Instagram },
  { key: 'facebook_url', label: 'Facebook', slug: 'facebook' },
  { key: 'tiktok_url', label: 'TikTok', slug: 'tiktok' },
  { key: 'twitter_url', label: 'X', slug: 'x' },
] as const

function toSpotifyEmbed(url: string): string | null {
  const match = url.match(/spotify\.com\/(track|album|playlist|artist)\/([A-Za-z0-9]+)/)
  if (!match) return null
  return `https://open.spotify.com/embed/${match[1]}/${match[2]}?utm_source=generator&theme=0`
}

function formatLocation(band: Pick<Band, 'location_city' | 'location_state'>) {
  return [band.location_city, band.location_state].filter(Boolean).join(', ')
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

function SectionCard({
  eyebrow,
  title,
  children,
  action,
}: {
  eyebrow: string
  title: string
  children: ReactNode
  action?: ReactNode
}) {
  return (
    <section className="rounded-[28px] border border-[#E6DFD3] bg-white p-6 shadow-[0_18px_42px_rgba(17,17,17,0.05)] sm:p-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#A24A22]">{eyebrow}</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-[#111111]">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

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

  const band = rawBand as Band | null
  if (!band) return notFound()

  const [{ data: bandGenres }, { data: rawShows }, { data: rawLyrics }] = await Promise.all([
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
    supabase
      .from('band_lyrics')
      .select('id, title, body, sort_order')
      .eq('band_id', band.id)
      .order('sort_order')
      .order('created_at'),
  ])

  type ShowRow = {
    id: string
    show_date: string
    venues: { name: string; location_city: string; location_state: string } | null
  }
  const shows = (rawShows ?? []) as unknown as ShowRow[]
  const lyrics = (rawLyrics ?? []) as { id: string; title: string; body: string; sort_order: number }[]

  const genreNames = (
    (bandGenres ?? []) as unknown as { genres: { name: string } | null }[]
  )
    .map((bg) => bg.genres?.name)
    .filter(Boolean) as string[]

  const embedUrl = band.featured_track_url ? toSpotifyEmbed(band.featured_track_url) : null
  const streamingLinks = STREAMING.filter(({ key }) => !!band[key])
  const socialLinks = SOCIALS.filter(({ key }) => !!band[key])
  const isOwner = user?.id === band.user_id

  const location = formatLocation(band)
  const heroImage = band.cover_photo_url ?? '/concert-hero.jpg'
  const primaryGenre = genreNames[0] ?? 'Artist'
  const artistType = band.artist_type ? ARTIST_TYPE_LABELS[band.artist_type] : null
  const touringRadius = band.touring_radius ? TOURING_RADIUS_LABELS[band.touring_radius] : null

  return (
    <div className={`bg-[#F7F4EE] ${user ? '' : 'pt-16'}`}>
      <section className="relative overflow-hidden border-b border-[#1F1F1F] bg-[#111111] text-white">
        <Image
          src={heroImage}
          alt=""
          fill
          priority
          className="object-cover object-center opacity-45"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,8,8,0.42)_0%,rgba(8,8,8,0.82)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_14%,_rgba(253,106,47,0.24),_transparent_28%),radial-gradient(circle_at_82%_18%,_rgba(14,116,144,0.18),_transparent_24%)]" />

        <div className="relative mx-auto max-w-7xl px-6 py-12 sm:py-16 lg:px-8 lg:py-20">
          <Link
            href="/"
            className="inline-flex min-h-9 items-center gap-2 text-sm font-semibold text-white/72 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Tour Aligner
          </Link>

          <div className="mt-9 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
            <div className="max-w-4xl">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="brand" className="border-white/15 bg-white/10 text-white">
                  <Mic2 className="h-3.5 w-3.5 text-[#F6B293]" />
                  {primaryGenre}
                </Badge>
                {artistType && <Badge tone="muted">{artistType}</Badge>}
                {isOwner && (
                  <Badge tone="success">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Managed by this profile
                  </Badge>
                )}
              </div>

              <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-end">
                {band.profile_photo_url && (
                  <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-3xl border border-white/20 bg-white/10 shadow-[0_18px_40px_rgba(0,0,0,0.24)] sm:h-28 sm:w-28">
                    <Image
                      src={band.profile_photo_url}
                      alt={`${band.name} profile photo`}
                      fill
                      className="object-cover"
                      sizes="112px"
                    />
                  </div>
                )}
                <div className="min-w-0">
                  <h1 className="font-[var(--font-barlow)] text-5xl font-black uppercase leading-[0.92] tracking-normal text-white sm:text-6xl lg:text-7xl">
                    {band.name}
                  </h1>
                  {band.tagline && (
                    <p className="mt-4 max-w-2xl text-base leading-7 text-white/78 sm:text-lg">
                      {band.tagline}
                    </p>
                  )}
                </div>
              </div>

              {location && (
                <p className="mt-5 flex max-w-2xl items-start gap-2 text-base leading-7 text-white/78 sm:text-lg">
                  <MapPin className="mt-1 h-5 w-5 shrink-0 text-[#F6B293]" />
                  <span>{location}</span>
                </p>
              )}

              {band.description && (
                <p className="mt-6 max-w-3xl text-base leading-8 text-white/82 sm:text-lg">
                  {band.description}
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
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#F6B293]">Artist facts</p>
              <div className="mt-5 grid gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/54">Home base</p>
                  <p className="mt-1 text-xl font-semibold text-white">{location || 'Not listed'}</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.07] px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/54">Touring</p>
                    <p className="mt-1 text-sm font-semibold text-white">{touringRadius ?? 'Not listed'}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.07] px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/54">Set length</p>
                    <p className="mt-1 text-sm font-semibold text-white">
                      {band.set_length_min ? `${band.set_length_min} min` : 'Not listed'}
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
          <SectionCard eyebrow="Overview" title="Artist profile">
            <div className="grid gap-5 sm:grid-cols-2">
              {location && <DetailRow icon={MapPin} label="Home base" value={location} />}
              {touringRadius && <DetailRow icon={Route} label="Touring radius" value={touringRadius} />}
              {artistType && <DetailRow icon={Users} label="Artist type" value={artistType} />}
              {band.set_length_min && <DetailRow icon={Radio} label="Set length" value={`${band.set_length_min} minutes`} />}
            </div>
          </SectionCard>

          {embedUrl && (
            <SectionCard eyebrow="Listen" title="Featured track">
              <iframe
                src={embedUrl}
                width="100%"
                height="152"
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                loading="lazy"
                className="rounded-2xl border-0"
              />
            </SectionCard>
          )}

          {lyrics.length > 0 && (
            <SectionCard eyebrow="Words" title="Lyrics">
              <div className="space-y-6">
                {lyrics.map((lyric) => (
                  <article key={lyric.id}>
                    <h3 className="text-lg font-semibold text-[#252525]">{lyric.title}</h3>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[#555555]">{lyric.body}</p>
                  </article>
                ))}
              </div>
            </SectionCard>
          )}

          <SectionCard eyebrow="Shows" title="Upcoming shows">
            {shows.length > 0 ? (
              <div className="divide-y divide-[#EEEEEE]">
                {shows.map((show) => {
                  const date = new Date(`${show.show_date}T00:00:00`)
                  const month = date.toLocaleDateString('en-US', { month: 'short' })
                  const day = date.toLocaleDateString('en-US', { day: 'numeric' })
                  const venue = show.venues

                  return (
                    <div key={show.id} className="grid gap-4 py-4 sm:grid-cols-[72px_minmax(0,1fr)_auto] sm:items-center">
                      <div className="flex h-16 w-16 flex-col items-center justify-center rounded-2xl border border-[#FFD5C4] bg-[#FFF3EE] text-[#A84216]">
                        <span className="text-xs font-semibold uppercase tracking-[0.14em]">{month}</span>
                        <span className="text-2xl font-bold leading-none">{day}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-[#252525]">{venue?.name ?? 'TBA'}</p>
                        {venue && (
                          <p className="mt-1 text-sm text-[#777777]">
                            {[venue.location_city, venue.location_state].filter(Boolean).join(', ')}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-[#E4DED4] bg-[#FCFBF8] px-6 py-10 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FFF3EE] text-[#FD6A2F]">
                  <CalendarDays className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-[#252525]">No upcoming shows listed</h3>
                <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#777777]">
                  Confirmed future dates will appear here once this artist starts locking in shows.
                </p>
              </div>
            )}
          </SectionCard>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          {streamingLinks.length > 0 && (
            <section className="rounded-[28px] border border-[#E6DFD3] bg-white p-5 shadow-[0_18px_42px_rgba(17,17,17,0.05)]">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#A24A22]">Listen</p>
              <div className="mt-4 space-y-2">
                {streamingLinks.map(({ key, label, slug }) => (
                  <a
                    key={key}
                    href={band[key] as string}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex min-h-12 items-center justify-between gap-3 rounded-2xl border border-[#EEEEEE] bg-[#FAFAFA] px-4 text-sm font-semibold text-[#252525] transition-all hover:border-[#D4D4D4] hover:bg-white"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`https://cdn.simpleicons.org/${slug}/FD6A2F`}
                        alt=""
                        width="16"
                        height="16"
                        className="shrink-0"
                      />
                      <span className="truncate">{label}</span>
                    </span>
                    <ExternalLink className="h-4 w-4 shrink-0 text-[#A0A0A0]" />
                  </a>
                ))}
              </div>
            </section>
          )}

          {socialLinks.length > 0 && (
            <section className="rounded-[28px] border border-[#E6DFD3] bg-white p-5 shadow-[0_18px_42px_rgba(17,17,17,0.05)]">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#A24A22]">Connect</p>
              <div className="mt-4 space-y-2">
                {socialLinks.map((link) => {
                  return (
                    <a
                      key={link.key}
                      href={band[link.key] as string}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex min-h-12 items-center justify-between gap-3 rounded-2xl border border-[#EEEEEE] bg-[#FAFAFA] px-4 text-sm font-semibold text-[#252525] transition-all hover:border-[#D4D4D4] hover:bg-white"
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        {'icon' in link ? (
                          <link.icon className="h-4 w-4 shrink-0 text-[#FD6A2F]" />
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={`https://cdn.simpleicons.org/${link.slug}/FD6A2F`}
                            alt=""
                            width="16"
                            height="16"
                            className="shrink-0"
                          />
                        )}
                        <span className="truncate">{link.label}</span>
                      </span>
                      <ExternalLink className="h-4 w-4 shrink-0 text-[#A0A0A0]" />
                    </a>
                  )
                })}
              </div>
            </section>
          )}

          <section className="rounded-[28px] border border-[#E6DFD3] bg-white p-5 shadow-[0_18px_42px_rgba(17,17,17,0.05)]">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#A24A22]">Connect</p>
            <div className="mt-4">
              {isOwner ? (
                <div>
                  <Badge tone="success">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    This profile manages the artist page
                  </Badge>
                  <p className="mt-3 text-sm leading-6 text-[#666666]">
                    Manage artist details, links, photos, and booking context from the dashboard.
                  </p>
                  <ButtonLink href={`/dashboard/bands/${band.id}/edit`} tone="dark" className="mt-5 w-full">
                    <PencilLine className="h-4 w-4" />
                    Edit artist profile
                  </ButtonLink>
                </div>
              ) : (
                <p className="text-sm leading-6 text-[#777777]">
                  This is a public, read-only artist profile. Follow the artist&apos;s links to listen, connect, and stay up to date.
                </p>
              )}
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}
