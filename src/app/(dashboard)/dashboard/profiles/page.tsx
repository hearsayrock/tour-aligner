import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Mic2, Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Badge, ButtonLink, Card, EmptyState, PageHeader } from '@/components/ui/primitives'

export const metadata = { title: 'Manage Profiles' }

type ManagedArtist = {
  id: string
  name: string
  slug: string
  location_city: string | null
  location_state: string | null
}

function locationLabel(city?: string | null, state?: string | null) {
  return [city, state].filter(Boolean).join(', ') || 'Location not set'
}

function ProfileRow({
  icon,
  title,
  detail,
  viewHref,
  editHref,
}: {
  icon: React.ReactNode
  title: string
  detail: string
  viewHref: string
  editHref: string
}) {
  return (
    <div className="flex flex-col gap-4 border-t border-[#EEEEEE] py-4 first:border-t-0 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FFF3EE] text-[#FD6A2F]">
          {icon}
        </span>
        <div className="min-w-0">
          <p className="truncate font-semibold text-[#252525]">{title}</p>
          <p className="mt-0.5 text-sm text-[#777777]">{detail}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Link href={viewHref} target="_blank" className="text-sm font-medium text-[#777777] transition-colors hover:text-[#252525]">
          View
        </Link>
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
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return redirect('/login')

  const { data: rawBands } = await supabase
    .from('bands')
    .select('id, name, slug, location_city, location_state')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .order('name')

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
                  icon={<Mic2 className="h-5 w-5" />}
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
