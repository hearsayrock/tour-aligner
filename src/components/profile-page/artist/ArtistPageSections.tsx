import type { ComponentType, ReactNode } from 'react'
import { ArtistLyrics } from './ArtistLyrics'
import {
  CalendarDays,
  ExternalLink,
  Globe,
  Instagram,
  MapPin,
  Radio,
  Route,
  Users,
} from 'lucide-react'
import type { ProfilePageSectionContent } from '@/components/profile-page/profile-page-types'
import type { ArtistPageSectionId } from '@/components/profile-page/artist/artist-page-config'
import type { Band } from '@/types/database'

export type ArtistPageShow = {
  id: string
  show_date: string
  venues: { name: string; location_city: string; location_state: string } | null
}

export type ArtistPageLyric = {
  id: string
  title: string
  body: string
  sort_order: number
}

export type ArtistContentSection = 'identity' | 'details' | 'music' | 'links' | 'lyrics' | 'members'

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
      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--profile-accent)_10%,white)] text-[var(--profile-accent)]">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8A8A8A]">{label}</p>
        <div className="mt-1 text-sm leading-6 text-[#2A2A2A]">{value}</div>
      </div>
    </div>
  )
}

function SectionCard({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) {
  return (
    <section className="h-full rounded-[28px] border border-[#E6DFD3] bg-white p-6 shadow-[0_18px_42px_rgba(17,17,17,0.05)] sm:p-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--profile-accent)]">{eyebrow}</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-[#111111]">{title}</h2>
        </div>
      </div>
      {children}
    </section>
  )
}

export function createArtistPageSections({
  band,
  shows,
  lyrics,
  onEditContent,
}: {
  band: Band
  shows: ArtistPageShow[]
  lyrics: ArtistPageLyric[]
  onEditContent?: (section: ArtistContentSection, pageSectionId?: 'streaming-links' | 'social-links') => void
}): ProfilePageSectionContent<ArtistPageSectionId>[] {
  const embedUrl = band.featured_track_url ? toSpotifyEmbed(band.featured_track_url) : null
  const streamingLinks = STREAMING.filter(({ key }) => !!band[key])
  const socialLinks = SOCIALS.filter(({ key }) => !!band[key])
  const location = formatLocation(band)
  const artistType = band.artist_type ? ARTIST_TYPE_LABELS[band.artist_type] : null
  const touringRadius = band.touring_radius ? TOURING_RADIUS_LABELS[band.touring_radius] : null

  return [
    {
      sectionId: 'overview',
      content: (
        <SectionCard eyebrow="Overview" title="Artist profile">
          <div className="grid gap-5 sm:grid-cols-2">
            {location && <DetailRow icon={MapPin} label="Home base" value={location} />}
            {touringRadius && <DetailRow icon={Route} label="Touring radius" value={touringRadius} />}
            {artistType && <DetailRow icon={Users} label="Artist type" value={artistType} />}
            {band.set_length_min && <DetailRow icon={Radio} label="Set length" value={`${band.set_length_min} minutes`} />}
            {!location && !touringRadius && !artistType && !band.set_length_min && (
              <p className="text-sm leading-6 text-[#777777]">Add a home base and performance details to help venues understand the artist.</p>
            )}
          </div>
        </SectionCard>
      ),
    },
    ...(embedUrl || onEditContent ? [{
      sectionId: 'featured-track' as const,
      content: (
        <SectionCard eyebrow="Listen" title="Featured track">
          {embedUrl ? <iframe src={embedUrl} width="100%" height="152" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy" className="rounded-2xl border-0" /> : <div className="min-h-32" />}
        </SectionCard>
      ),
    }] : []),
    ...(lyrics.length > 0 || onEditContent ? [{
      sectionId: 'lyrics' as const,
      content: (
        <ArtistLyrics lyrics={lyrics} />
      ),
    }] : []),
    ...((band.members ?? []).length > 0 || onEditContent ? [{
      sectionId: 'members' as const,
      content: (
        <SectionCard eyebrow="On stage" title="Members">
          <div className="flex flex-wrap gap-2" style={onEditContent ? { minHeight: 80 } : undefined}>
            {(band.members ?? []).map((member) => <span key={member} className="rounded-full border border-[#E3DDD7] bg-[#FAF8F5] px-4 py-2 text-sm font-semibold text-[#4E4945]">{member}</span>)}
          </div>
        </SectionCard>
      ),
    }] : []),
    {
      sectionId: 'shows',
      content: (
        <SectionCard eyebrow="Shows" title="Upcoming shows">
          {shows.length > 0 ? (
            <div className="divide-y divide-[#EEEEEE]">
              {shows.map((show) => {
                const date = new Date(`${show.show_date}T00:00:00`)
                const month = date.toLocaleDateString('en-US', { month: 'short' })
                const day = date.toLocaleDateString('en-US', { day: 'numeric' })
                return (
                  <div key={show.id} className="grid gap-4 py-4 sm:grid-cols-[72px_minmax(0,1fr)_auto] sm:items-center">
                    <div className="flex h-16 w-16 flex-col items-center justify-center rounded-2xl border border-[#FFD5C4] bg-[#FFF3EE] text-[#A84216]">
                      <span className="text-xs font-semibold uppercase tracking-[0.14em]">{month}</span>
                      <span className="text-2xl font-bold leading-none">{day}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-[#252525]">{show.venues?.name ?? 'TBA'}</p>
                      {show.venues && <p className="mt-1 text-sm text-[#777777]">{[show.venues.location_city, show.venues.location_state].filter(Boolean).join(', ')}</p>}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-[#E4DED4] bg-[#FCFBF8] px-6 py-10 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FFF3EE] text-[#FD6A2F]"><CalendarDays className="h-5 w-5" /></div>
              <h3 className="mt-4 text-lg font-semibold text-[#252525]">No upcoming shows listed</h3>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#777777]">Confirmed future dates will appear here once this artist starts locking in shows.</p>
            </div>
          )}
        </SectionCard>
      ),
    },
    ...(streamingLinks.length > 0 || socialLinks.length > 0 || onEditContent ? [{
      sectionId: 'streaming-links' as const,
      content: (
        <section className="h-full rounded-[28px] border border-[#E6DFD3] bg-white p-5 shadow-[0_18px_42px_rgba(17,17,17,0.05)]">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--profile-accent)]">Links</p>
          <div className="mt-4 space-y-2" style={onEditContent ? { minHeight: 80 } : undefined}>
            {[...streamingLinks, ...socialLinks].map((link) => (
              <a key={link.key} href={band[link.key] as string} target="_blank" rel="noopener noreferrer" className="artist-page-link-button flex min-h-12 items-center justify-between gap-3 border border-[#EEEEEE] bg-[#FAFAFA] px-4 text-sm font-semibold text-[#252525] transition-all hover:border-[#D4D4D4] hover:bg-white">
                <span className="flex min-w-0 items-center gap-3">
                  {'icon' in link ? <link.icon className="h-4 w-4 shrink-0 text-[var(--profile-accent)]" /> : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={`https://cdn.simpleicons.org/${link.slug}/FD6A2F`} alt="" width="16" height="16" className="shrink-0" />
                  )}
                  <span className="truncate">{link.label}</span>
                </span>
                <ExternalLink className="h-4 w-4 shrink-0 text-[#A0A0A0]" />
              </a>
            ))}
          </div>
        </section>
      ),
    }] : []),
  ]
}
