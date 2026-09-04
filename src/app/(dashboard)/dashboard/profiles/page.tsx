import Link from 'next/link'
import Image from 'next/image'
import { redirect } from 'next/navigation'
import { Mic2, Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getServerTimingStart, logServerTiming } from '@/lib/performance'
import { Badge, ButtonLink, Card, EmptyState, PageHeader } from '@/components/ui/primitives'

export const metadata = { title: 'Manage Profiles' }

type ManagedArtist = {
  id: string
  name: string
  slug: string
  location_city: string | null
  location_state: string | null
  profile_photo_url: string | null
  updated_at: string
}

function locationLabel(city?: string | null, state?: string | null) {
  return [city, state].filter(Boolean).join(', ') || 'Location not set'
}

function ProfileRow({
  profilePhotoUrl,
  title,
  detail,
  viewHref,
  editHref,
}: {
  profilePhotoUrl: string | null
  title: string
  detail: string
  viewHref: string
  editHref: string
}) {
  return (
    <div className="flex flex-col gap-4 border-t border-[#EEEEEE] py-4 first:border-t-0 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
      <Link href={viewHref} target="_blank" rel="noopener noreferrer" className="group flex min-h-16 min-w-0 flex-1 items-center gap-3 rounded-xl px-3 py-2 transition-all hover:bg-[#FFF5F0] hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FD6A2F]">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#F1E7E1] bg-[#FFF3EE] text-[#FD6A2F]">
          {profilePhotoUrl ? (
            <Image src={profilePhotoUrl} alt={`${title} profile photo`} width={48} height={48} className="h-full w-full object-cover" unoptimized />
          ) : (
            <Mic2 className="h-5 w-5" />
          )}
        </span>
        <div className="min-w-0">
          <p className="truncate font-semibold text-[#252525]">{title}</p>
          <p className="mt-0.5 text-sm text-[#777777]">{detail}</p>
        </div>
      </Link>
      <div className="flex shrink-0 items-center gap-2 sm:pl-3">
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
  const startedAt = getServerTimingStart()
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const userId = session?.user.id
  if (!userId) return redirect('/login')

  const { data: rawBands } = await supabase
    .from('bands')
    .select('id, name, slug, location_city, location_state, profile_photo_url, updated_at')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('name')
  logServerTiming('manage profiles page', { total: getServerTimingStart() - startedAt })

  const artists = (rawBands ?? []) as ManagedArtist[]
  const hasAnyProfiles = artists.length > 0

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <PageHeader
        eyebrow="Profiles"
        title="My Artist Profiles"
        description="Build, publish, and share the public profiles for your music projects."
        actions={<ButtonLink href="/dashboard/bands/new"><Mic2 className="h-4 w-4" />Add Artist</ButtonLink>}
      />

      {!hasAnyProfiles ? (
        <EmptyState
          title="No managed profiles yet"
          description="Create an artist profile to start sharing your music and story."
          action={<ButtonLink href="/dashboard/bands/new"><Mic2 className="h-4 w-4" />Add Artist</ButtonLink>}
        />
      ) : (
        <div className="grid gap-6">
          <Card className="p-5">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold text-[#252525]">Artist Profiles</h2>
                <p className="mt-1 text-sm text-[#777777]">Public artist pages you can personalize and share.</p>
              </div>
              <Badge tone="muted">{artists.length}</Badge>
            </div>
            {artists.length > 0 ? (
              artists.map((artist) => (
                <ProfileRow
                  key={artist.id}
                  profilePhotoUrl={artist.profile_photo_url ? `${artist.profile_photo_url}${artist.profile_photo_url.includes('?') ? '&' : '?'}v=${encodeURIComponent(artist.updated_at)}` : null}
                  title={artist.name}
                  detail={locationLabel(artist.location_city, artist.location_state)}
                  viewHref={`/bands/${artist.slug}`}
                  editHref={`/dashboard/bands/${artist.id}/edit`}
                />
              ))
            ) : (
              <EmptyProfileSection
                title="No artist profiles"
                description="Create a public artist page to share your music, identity, and links."
                href="/dashboard/bands/new"
                action="Add Artist"
              />
            )}
          </Card>
        </div>
      )}
    </div>
  )
}
