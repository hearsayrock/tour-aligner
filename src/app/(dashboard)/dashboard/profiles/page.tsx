import Link from 'next/link'
import Image from 'next/image'
import { redirect } from 'next/navigation'
import { ArrowRight, Eye, Mic2, Sparkles } from 'lucide-react'
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
  studioHref,
  publicPageHref,
}: {
  profilePhotoUrl: string | null
  title: string
  detail: string
  studioHref: string
  publicPageHref: string
}) {
  return (
    <div className="group flex flex-col gap-3 rounded-2xl border border-[#F0E5DF] bg-white p-3 shadow-[0_8px_24px_rgba(73,35,17,0.04)] transition-all hover:-translate-y-0.5 hover:border-[#FFB795] hover:shadow-[0_18px_38px_rgba(234,95,36,0.12)] sm:flex-row sm:items-center">
      <Link href={studioHref} className="flex min-h-20 min-w-0 flex-1 items-center gap-4 rounded-xl px-2 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FD6A2F]">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#FFD8C6] bg-gradient-to-br from-[#FFF6F1] to-[#FFE5D8] text-[#E95D2C] shadow-sm">
          {profilePhotoUrl ? (
            <Image src={profilePhotoUrl} alt={`${title} profile photo`} width={56} height={56} className="h-full w-full object-cover" unoptimized />
          ) : (
            <Mic2 className="h-6 w-6" />
          )}
        </span>
        <div className="min-w-0">
          <p className="truncate text-base font-bold text-[#252525]">{title}</p>
          <p className="mt-0.5 text-sm text-[#777777]">{detail}</p>
          <span className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-[#D95525] opacity-80 transition-opacity group-hover:opacity-100">
            Open Artist Studio <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </Link>
      <div className="flex shrink-0 items-center sm:pr-1">
        <Link href={publicPageHref} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#E8D4C9] bg-[#FFF9F6] px-3.5 py-2 text-sm font-semibold text-[#6A3928] transition-colors hover:border-[#F49A73] hover:bg-[#FFF0E9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FD6A2F] focus-visible:ring-offset-2">
          <Eye className="h-4 w-4" />
          View Artists Public Page
        </Link>
      </div>
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
        title="Your artists are ready for the spotlight."
        description="Shape the public profiles that introduce your music to venues and fans."
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
          <section className="relative overflow-hidden rounded-3xl bg-[#262321] px-6 py-7 text-white shadow-[0_20px_46px_rgba(45,29,20,0.16)] sm:px-8 sm:py-8">
            <div className="absolute -right-16 -top-24 h-56 w-56 rounded-full border-[32px] border-[#FE7440]/25" />
            <div className="absolute bottom-0 right-28 h-20 w-20 rounded-full bg-[#FFC6AC]/10 blur-2xl" />
            <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="max-w-2xl">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.13em] text-[#FFD4C1]">
                  <Sparkles className="h-3.5 w-3.5" /> Artist Studio
                </span>
                <h2 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">Make every first impression count.</h2>
                <p className="mt-2 text-sm leading-6 text-[#D9D0CC] sm:text-base">Click on the artist to fine tune your public page in Artist Studio!</p>
              </div>
              <div className="flex shrink-0 items-center gap-3 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur-sm">
                <span className="text-3xl font-bold text-[#FF895D]">{artists.length}</span>
                <span className="text-sm font-medium leading-5 text-[#F4EFEC]">artist {artists.length === 1 ? 'profile' : 'profiles'}<br />in your lineup</span>
              </div>
            </div>
          </section>

          <Card className="overflow-hidden p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3 px-1">
              <div>
                <h2 className="font-bold text-[#252525]">Your Artist Lineup</h2>
                <p className="mt-1 text-sm text-[#777777]">Select an artist to enter their studio.</p>
              </div>
              <Badge tone="brand">{artists.length} {artists.length === 1 ? 'artist' : 'artists'}</Badge>
            </div>
            <div className="grid gap-3">
              {artists.map((artist) => (
                <ProfileRow
                  key={artist.id}
                  profilePhotoUrl={artist.profile_photo_url ? `${artist.profile_photo_url}${artist.profile_photo_url.includes('?') ? '&' : '?'}v=${encodeURIComponent(artist.updated_at)}` : null}
                  title={artist.name}
                  detail={locationLabel(artist.location_city, artist.location_state)}
                  studioHref={`/dashboard/bands/${artist.id}/edit`}
                  publicPageHref={`/bands/${artist.slug}`}
                />
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
