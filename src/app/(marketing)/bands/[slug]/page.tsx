import { notFound } from 'next/navigation'
import Image from 'next/image'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'

const TOURING_RADIUS_LABELS = {
  local: 'Local',
  regional: 'Regional',
  national: 'National',
  international: 'International',
}

const SOCIAL_LINKS: { key: string; label: string }[] = [
  { key: 'website_url', label: 'Website' },
  { key: 'spotify_url', label: 'Spotify' },
  { key: 'apple_music_url', label: 'Apple Music' },
  { key: 'youtube_url', label: 'YouTube' },
  { key: 'soundcloud_url', label: 'SoundCloud' },
  { key: 'bandcamp_url', label: 'Bandcamp' },
  { key: 'instagram_url', label: 'Instagram' },
  { key: 'tiktok_url', label: 'TikTok' },
  { key: 'facebook_url', label: 'Facebook' },
  { key: 'twitter_url', label: 'Twitter / X' },
]

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()
  const { data: band } = await supabase
    .from('bands')
    .select('name, tagline')
    .eq('slug', slug)
    .eq('is_active', true)
    .single()

  if (!band) return {}
  return {
    title: band.name,
    description: band.tagline ?? undefined,
  }
}

export default async function BandProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = await createClient()

  const today = new Date().toISOString().split('T')[0]

  const { data: band } = await supabase
    .from('bands')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .single()

  if (!band) return notFound()

  const [{ data: bandGenres }, { data: showDates }] = await Promise.all([
    supabase
      .from('band_genres')
      .select('genre_id, genres(name)')
      .eq('band_id', band.id),
    supabase
      .from('band_show_dates')
      .select('*')
      .eq('band_id', band.id)
      .gte('show_date', today)
      .order('show_date'),
  ])

  const genreNames = ((bandGenres ?? []) as unknown as { genres: { name: string } | null }[])
    .map((bg) => bg.genres?.name)
    .filter(Boolean) as string[]

  const activeSocials = SOCIAL_LINKS.filter(
    ({ key }) => band[key as keyof typeof band]
  )

  const hasCover = !!band.cover_photo_url
  const hasProfile = !!band.profile_photo_url

  return (
    <div className="max-w-3xl mx-auto pb-12">
      {/* Cover photo */}
      {hasCover ? (
        <div className="relative w-full aspect-[3/1] bg-[#EEEEEE] mt-14">
          <Image
            src={band.cover_photo_url!}
            alt={`${band.name} cover photo`}
            fill
            priority
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 768px"
          />
        </div>
      ) : (
        /* Spacer so content clears the fixed nav when no cover */
        <div className="pt-24" />
      )}

      <div className="px-6">
        {/* Profile photo + name row */}
        <div className={`flex items-end gap-5 ${hasCover ? '-mt-12 mb-4' : 'mb-8'}`}>
          {hasProfile && (
            <div className="relative w-24 h-24 rounded-full overflow-hidden border-4 border-white shrink-0 shadow-md bg-[#EEEEEE]">
              <Image
                src={band.profile_photo_url!}
                alt={band.name}
                fill
                className="object-cover"
                sizes="96px"
              />
            </div>
          )}
          {hasCover && (
            <div className={`pb-1 ${hasProfile ? '' : 'mt-4'}`}>
              <h1 className="text-4xl font-bold tracking-tight leading-tight">{band.name}</h1>
            </div>
          )}
        </div>

        {/* Header — name (if no cover), tagline, metadata */}
        <div className="mb-10">
          {!hasCover && (
            <div className="flex items-center gap-4 mb-2">
              <h1 className="text-4xl font-bold tracking-tight">{band.name}</h1>
            </div>
          )}
          {band.tagline && (
            <p className="text-lg text-[#777777] mb-3">{band.tagline}</p>
          )}

          {/* Metadata pills row */}
          <div className="flex flex-wrap items-center gap-2 mt-2">
            {(band.location_city || band.location_state) && (
              <span className="text-sm text-[#888888]">
                {[band.location_city, band.location_state].filter(Boolean).join(', ')}
              </span>
            )}
            {band.touring_radius && (
              <span className="text-sm text-[#888888] before:content-['·'] before:mr-2">
                {TOURING_RADIUS_LABELS[band.touring_radius as keyof typeof TOURING_RADIUS_LABELS]} touring
              </span>
            )}
            {band.artist_type && (
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-[#F5F5F5] border border-[#E8E8E8] text-[#555555]">
                {band.artist_type === 'solo' ? 'Solo artist' : 'Band'}
              </span>
            )}
            {band.set_length_min && (
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-[#F5F5F5] border border-[#E8E8E8] text-[#555555]">
                {band.set_length_min} min set
              </span>
            )}
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

        {/* Bio */}
        {band.description && (
          <section className="mb-10">
            <p className="text-[#252525] leading-relaxed whitespace-pre-line">
              {band.description}
            </p>
          </section>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
          {/* Members */}
          {band.members && band.members.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold text-[#888888] uppercase tracking-widest mb-4">
                Members
              </h2>
              <ul className="space-y-1.5">
                {band.members.map((member: string, i: number) => (
                  <li key={i} className="text-sm text-[#252525]">
                    {member}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Social links */}
          {activeSocials.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold text-[#888888] uppercase tracking-widest mb-4">
                Links
              </h2>
              <ul className="space-y-2">
                {activeSocials.map(({ key, label }) => (
                  <li key={key}>
                    <a
                      href={band[key as keyof typeof band] as string}
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

        {/* Upcoming shows */}
        {showDates && showDates.length > 0 && (
          <section className="mt-10">
            <h2 className="text-xs font-semibold text-[#888888] uppercase tracking-widest mb-4">
              Upcoming Shows
            </h2>
            <div className="space-y-2">
              {showDates.map((show) => {
                const date = new Date(show.show_date + 'T00:00:00')
                const formatted = date.toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })
                return (
                  <div
                    key={show.id}
                    className="bg-[#FFFFFF] border border-[#E8E8E8] rounded-xl px-5 py-4 flex items-center justify-between gap-4"
                  >
                    <div>
                      <p className="text-sm font-medium">{show.venue_name}</p>
                      <p className="text-sm text-[#888888]">
                        {show.city}, {show.state} · {formatted}
                      </p>
                    </div>
                    {show.ticket_url && (
                      <a
                        href={show.ticket_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-semibold bg-[#FD6A2F] text-white rounded-lg px-3 py-1.5 hover:bg-[#E55A22] transition-colors shrink-0"
                      >
                        Tickets
                      </a>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
