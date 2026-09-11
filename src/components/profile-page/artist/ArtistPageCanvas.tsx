import type { ComponentType, CSSProperties, ReactNode } from 'react'
import {
  CalendarDays,
  CheckCircle2,
  ExternalLink,
  Globe,
  Instagram,
  LayoutDashboard,
  MapPin,
  PencilLine,
  Radio,
  Route,
  Users,
} from 'lucide-react'
import { ProfilePageCanvas } from '@/components/profile-page/ProfilePageCanvas'
import type { ProfilePageSectionContent } from '@/components/profile-page/profile-page-types'
import {
  getArtistProfileAppearance,
  parseArtistProfileTheme,
  type ArtistPageSectionId,
} from '@/components/profile-page/artist/artist-page-config'
import { ArtistPageHero } from '@/components/profile-page/artist/ArtistPageHero'
import { ArtistPageVisualEditor } from '@/components/profile-page/artist/ArtistPageVisualEditor'
import { saveArtistPageCustomization } from '@/app/actions/artist-page'
import { Badge, ButtonLink } from '@/components/ui/primitives'
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

export type ArtistPageCanvasProps = {
  band: Band
  genreNames: string[]
  shows: ArtistPageShow[]
  lyrics: ArtistPageLyric[]
  isOwner: boolean
  isEditing: boolean
  hasViewer: boolean
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

type ArtistFrameStyle = CSSProperties & {
  '--profile-accent': string
  '--profile-button-radius': string
}

function toSpotifyEmbed(url: string): string | null {
  const match = url.match(/spotify\.com\/(track|album|playlist|artist)\/([A-Za-z0-9]+)/)
  if (!match) return null
  return `https://open.spotify.com/embed/${match[1]}/${match[2]}?utm_source=generator&theme=0`
}

function formatLocation(band: Pick<Band, 'location_city' | 'location_state'>) {
  return [band.location_city, band.location_state].filter(Boolean).join(', ')
}

function versionedImageUrl(url: string | null, version: string): string | null {
  if (!url) return null
  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}v=${encodeURIComponent(version)}`
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
    <section className="h-full rounded-[28px] border border-[#E6DFD3] bg-white p-6 shadow-[0_18px_42px_rgba(17,17,17,0.05)] sm:p-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--profile-accent)]">{eyebrow}</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-[#111111]">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

export function ArtistPageCanvas({
  band,
  genreNames,
  shows,
  lyrics,
  isOwner,
  isEditing,
  hasViewer,
}: ArtistPageCanvasProps) {
  const embedUrl = band.featured_track_url ? toSpotifyEmbed(band.featured_track_url) : null
  const streamingLinks = STREAMING.filter(({ key }) => !!band[key])
  const socialLinks = SOCIALS.filter(({ key }) => !!band[key])
  const location = formatLocation(band)
  const coverImage = versionedImageUrl(band.cover_photo_url, band.updated_at)
  const heroImage = coverImage ?? '/concert-hero.jpg'
  const profileImage = versionedImageUrl(band.profile_photo_url, band.updated_at)
  const artistType = band.artist_type ? ARTIST_TYPE_LABELS[band.artist_type] : null
  const touringRadius = band.touring_radius ? TOURING_RADIUS_LABELS[band.touring_radius] : null
  const theme = parseArtistProfileTheme(band.profile_theme)
  const pageBackground = theme.background === 'night' ? '#17151B' : theme.background === 'mist' ? '#EDF7F6' : '#F7F4EE'
  const wallpaperImage = versionedImageUrl(band.profile_background_url, band.updated_at)
  const wallpaperBase = theme.background === 'night' ? '23,21,27' : theme.background === 'mist' ? '237,247,246' : '247,244,238'
  const wallpaperOverlayOpacity = 1 - (theme.wallpaperOpacity / 100)
  const wallpaperStyle: ArtistFrameStyle = {
    ...(wallpaperImage
      ? { backgroundImage: `linear-gradient(rgba(${wallpaperBase},${wallpaperOverlayOpacity}), rgba(${wallpaperBase},${wallpaperOverlayOpacity})), url("${wallpaperImage}")`, backgroundSize: 'cover', backgroundAttachment: 'fixed' as const }
      : { backgroundColor: pageBackground }),
    '--profile-accent': theme.accent,
    '--profile-button-radius': theme.buttonStyle === 'pill' ? '9999px' : theme.buttonStyle === 'square' ? '0.375rem' : '1rem',
  }

  const hero = (
    <ArtistPageHero
      band={band}
      genreNames={genreNames}
      isOwner={isOwner}
      isEditing={isEditing}
      appearance={getArtistProfileAppearance(theme)}
      coverImage={heroImage}
      profileImage={profileImage}
    />
  )

  const sections: ProfilePageSectionContent<ArtistPageSectionId>[] = [
    {
      sectionId: 'overview',
      content: (
        <SectionCard eyebrow="Overview" title="Artist profile">
          <div className="grid gap-5 sm:grid-cols-2">
            {location && <DetailRow icon={MapPin} label="Home base" value={location} />}
            {touringRadius && <DetailRow icon={Route} label="Touring radius" value={touringRadius} />}
            {artistType && <DetailRow icon={Users} label="Artist type" value={artistType} />}
            {band.set_length_min && <DetailRow icon={Radio} label="Set length" value={`${band.set_length_min} minutes`} />}
          </div>
        </SectionCard>
      ),
    },
    ...(embedUrl ? [{
      sectionId: 'featured-track' as const,
      content: (
        <SectionCard eyebrow="Listen" title="Featured track">
          <iframe src={embedUrl} width="100%" height="152" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy" className="rounded-2xl border-0" />
        </SectionCard>
      ),
    }] : []),
    ...(lyrics.length > 0 ? [{
      sectionId: 'lyrics' as const,
      content: (
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
    ...(streamingLinks.length > 0 ? [{
      sectionId: 'streaming-links' as const,
      content: (
        <section className="h-full rounded-[28px] border border-[#E6DFD3] bg-white p-5 shadow-[0_18px_42px_rgba(17,17,17,0.05)]">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--profile-accent)]">Listen</p>
          <div className="mt-4 space-y-2">
            {streamingLinks.map(({ key, label, slug }) => (
              <a key={key} href={band[key] as string} target="_blank" rel="noopener noreferrer" className="artist-page-link-button flex min-h-12 items-center justify-between gap-3 border border-[#EEEEEE] bg-[#FAFAFA] px-4 text-sm font-semibold text-[#252525] transition-all hover:border-[#D4D4D4] hover:bg-white">
                <span className="flex min-w-0 items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`https://cdn.simpleicons.org/${slug}/FD6A2F`} alt="" width="16" height="16" className="shrink-0" />
                  <span className="truncate">{label}</span>
                </span>
                <ExternalLink className="h-4 w-4 shrink-0 text-[#A0A0A0]" />
              </a>
            ))}
          </div>
        </section>
      ),
    }] : []),
    ...(socialLinks.length > 0 ? [{
      sectionId: 'social-links' as const,
      content: (
        <section className="h-full rounded-[28px] border border-[#E6DFD3] bg-white p-5 shadow-[0_18px_42px_rgba(17,17,17,0.05)]">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--profile-accent)]">Connect</p>
          <div className="mt-4 space-y-2">
            {socialLinks.map((social) => (
              <a key={social.key} href={band[social.key] as string} target="_blank" rel="noopener noreferrer" className="artist-page-link-button flex min-h-12 items-center justify-between gap-3 border border-[#EEEEEE] bg-[#FAFAFA] px-4 text-sm font-semibold text-[#252525] transition-all hover:border-[#D4D4D4] hover:bg-white">
                <span className="flex min-w-0 items-center gap-3">
                  {'icon' in social ? <social.icon className="h-4 w-4 shrink-0 text-[var(--profile-accent)]" /> : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={`https://cdn.simpleicons.org/${social.slug}/FD6A2F`} alt="" width="16" height="16" className="shrink-0" />
                  )}
                  <span className="truncate">{social.label}</span>
                </span>
                <ExternalLink className="h-4 w-4 shrink-0 text-[#A0A0A0]" />
              </a>
            ))}
          </div>
        </section>
      ),
    }] : []),
    {
      sectionId: 'profile-management',
      content: (
        <section className="h-full rounded-[28px] border border-[#E6DFD3] bg-white p-5 shadow-[0_18px_42px_rgba(17,17,17,0.05)]">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--profile-accent)]">Connect</p>
          <div className="mt-4">
            {isOwner ? (
              <div>
                <Badge tone="success"><CheckCircle2 className="h-3.5 w-3.5" />This profile manages the artist page</Badge>
                <p className="mt-3 text-sm leading-6 text-[#666666]">Manage artist details, links, photos, and booking context from the dashboard.</p>
                <ButtonLink href={`/dashboard/bands/${band.id}/edit`} tone="dark" className="mt-5 w-full"><PencilLine className="h-4 w-4" />Edit artist content</ButtonLink>
                {!isEditing && <ButtonLink href={`/bands/${band.slug}?edit=1`} tone="secondary" className="mt-2 w-full"><LayoutDashboard className="h-4 w-4" />Arrange this page</ButtonLink>}
              </div>
            ) : (
              <p className="text-sm leading-6 text-[#777777]">This is a public, read-only artist profile. Follow the artist&apos;s links to listen, connect, and stay up to date.</p>
            )}
          </div>
        </section>
      ),
    },
  ]

  const frameClassName = hasViewer ? '' : 'pt-16'
  if (isOwner && isEditing) {
    const saveAction = saveArtistPageCustomization.bind(null, band.id)
    return (
      <ArtistPageVisualEditor
        band={band}
        genreNames={genreNames}
        sections={sections}
        initialTheme={theme}
        initialCoverImage={coverImage}
        initialProfileImage={profileImage}
        initialWallpaperImage={wallpaperImage}
        exitHref={`/bands/${band.slug}`}
        editDetailsHref={`/dashboard/bands/${band.id}/edit`}
        saveAction={saveAction}
      />
    )
  }

  return (
    <ProfilePageCanvas
      layout={theme.layout}
      hero={hero}
      sections={sections}
      className={frameClassName}
      style={wallpaperStyle}
    />
  )
}
