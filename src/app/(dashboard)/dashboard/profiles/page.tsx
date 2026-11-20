import Link from 'next/link'
import Image from 'next/image'
import { redirect } from 'next/navigation'
import { ArrowRight, Eye, Mic2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getServerTimingStart, logServerTiming } from '@/lib/performance'
import { Badge, ButtonLink, EmptyState, PageHeader } from '@/components/ui/primitives'

export const metadata = { title: 'Manage Profiles' }

type ManagedArtist = {
  id: string
  name: string
  slug: string
  location_city: string | null
  location_state: string | null
  profile_photo_url: string | null
  page_published: boolean
  updated_at: string
}

function locationLabel(city?: string | null, state?: string | null) {
  return [city, state].filter(Boolean).join(', ') || 'Location not set'
}

function ProfileRow({
  profilePhotoUrl,
  title,
  detail,
  studioHref,
  publicPageHref,
}: {
  profilePhotoUrl: string | null
  title: string
  detail: string
  studioHref: string
  publicPageHref: string | null
}) {
  return (
    <div className="group flex flex-col overflow-hidden rounded-ds-2xl border border-border bg-page transition-colors hover:border-border-strong sm:flex-row sm:items-stretch">
      <Link
        href={studioHref}
        className="flex min-h-[104px] min-w-0 flex-1 items-center gap-4 px-5 py-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand"
      >
        <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-brand-tint-border bg-cream text-brand-dim shadow-sm">
          {profilePhotoUrl ? (
            <Image
              src={profilePhotoUrl}
              alt={`${title} profile photo`}
              width={56}
              height={56}
              className="h-full w-full object-cover"
              unoptimized
            />
          ) : (
            <Mic2 className="h-6 w-6" />
          )}
        </span>
        <div className="min-w-0">
          <p className="break-words text-xl font-bold leading-tight text-ink">{title}</p>
          <p className="mt-0.5 text-sm text-text-secondary">{detail}</p>
          <span className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-brand-text group-hover:underline">
            Edit public page <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </Link>
      {publicPageHref && (
        <Link
          href={publicPageHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 border-t border-border bg-surface px-6 py-3 text-sm font-semibold text-cocoa-2 transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand sm:border-l sm:border-t-0"
        >
          <Eye className="h-4 w-4" />
          View public page
        </Link>
      )}
    </div>
  )
}

export default async function ManageProfilesPage() {
  const startedAt = getServerTimingStart()
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const userId = session?.user.id
  if (!userId) return redirect('/login')

  const [{ data: rawBands }, { data: venues }] = await Promise.all([
    supabase
      .from('bands')
      .select(
        'id, name, slug, location_city, location_state, profile_photo_url, updated_at, page_published'
      )
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('name'),
    supabase
      .from('venues')
      .select('id, name, slug, profile_photo_url, location_city, location_state')
      .eq('claimed_by_user_id', userId)
      .eq('is_active', true)
      .eq('is_unlisted', false)
      .order('name'),
  ])
  logServerTiming('manage profiles page', { total: getServerTimingStart() - startedAt })

  const artists = (rawBands ?? []) as ManagedArtist[]
  const hasAnyProfiles = artists.length > 0 || !!venues?.length

  return (
    <div className="workspace-page">
      <PageHeader
        title="Your Studios"
        description="Open a Studio to edit your page and review your private draft."
        actions={
          <ButtonLink href="/dashboard/bands/new">
            <Mic2 className="h-4 w-4" />
            Add Artist
          </ButtonLink>
        }
      />

      {!hasAnyProfiles ? (
        <EmptyState
          title="No managed profiles yet"
          description="Create an artist profile to start sharing your music and story."
          action={
            <ButtonLink href="/dashboard/bands/new">
              <Mic2 className="h-4 w-4" />
              Add Artist
            </ButtonLink>
          }
        />
      ) : (
        <div className="grid gap-6">
          {artists.length > 0 && (
            <section>
              <div className="mb-4 flex items-center justify-between gap-3 px-1">
                <div>
                  <h2 className="font-ds-display text-3xl font-bold text-ink">Your Artist Lineup</h2>
                  <p className="mt-1 text-sm text-text-secondary">
                    Select an artist to edit their public page.
                  </p>
                </div>
                <Badge tone="brand">
                  {artists.length} {artists.length === 1 ? 'artist' : 'artists'}
                </Badge>
              </div>
              <div className="grid gap-3 2xl:grid-cols-2">
                {artists.map((artist) => (
                  <ProfileRow
                    key={artist.id}
                    profilePhotoUrl={
                      artist.profile_photo_url
                        ? `${artist.profile_photo_url}${artist.profile_photo_url.includes('?') ? '&' : '?'}v=${encodeURIComponent(artist.updated_at)}`
                        : null
                    }
                    title={artist.name}
                    detail={
                      artist.page_published
                        ? locationLabel(artist.location_city, artist.location_state)
                        : 'Unpublished artist'
                    }
                    studioHref={`/bands/${artist.slug}?edit=1`}
                    publicPageHref={artist.page_published ? `/bands/${artist.slug}` : null}
                  />
                ))}
              </div>
            </section>
          )}
          {!!venues?.length && (
            <section className="space-y-4">
              <h2 className="font-ds-display text-3xl font-bold uppercase">Venue Studio</h2>
              {venues.map((v) => (
                <ProfileRow
                  key={v.id}
                  title={v.name}
                  detail={locationLabel(v.location_city, v.location_state)}
                  profilePhotoUrl={v.profile_photo_url}
                  studioHref={`/venues/${v.slug}?edit=1`}
                  publicPageHref={`/venues/${v.slug}`}
                />
              ))}
              <ButtonLink href="/dashboard/backstage" tone="secondary">
                Manage events
              </ButtonLink>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
