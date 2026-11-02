import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, MapPin, Mic2, Music2, Plus, Radio } from 'lucide-react'
import { ButtonLink, SectionHeading } from '@/components/ui/primitives'
import { dashboardStartingPoint, type DashboardDiscovery } from '@/lib/dashboard-discovery'
import type { buildDashboardActivity } from '@/lib/dashboard-activity'
import type { ActiveIdentity, ManagedIdentity } from '@/lib/managed-identity'

type Activity = ReturnType<typeof buildDashboardActivity>

export function DashboardStartingPoint({ activity, activeIdentity, identities }: {
  activity: Activity
  activeIdentity: ActiveIdentity
  identities: ManagedIdentity[]
}) {
  const mode = dashboardStartingPoint(activity, activeIdentity.kind)
  if (!mode) return null
  const draft = activity.actions.find((action) => action.kind === 'draft')
  const applications = activity.waiting.filter((item) => item.kind === 'application').length
  const hasArtists = identities.some((identity) => identity.kind === 'band')
  const hasVenues = identities.some((identity) => identity.kind === 'venue')
  const createsEvent = mode === 'create' || (mode === 'profiles' && !hasArtists && hasVenues)
  const title = mode === 'artist' || (mode === 'profiles' && hasArtists) ? 'Find your next stage'
    : mode === 'draft' ? 'Your next bill is taking shape'
      : createsEvent ? 'Build your next bill' : 'Start with a profile'
  const description = mode === 'artist' && applications
    ? `${applications === 1 ? 'Your application is' : `Your ${applications} applications are`} waiting on a venue response. Keep exploring venues and events while you wait.`
    : mode === 'draft' ? 'Pick up your draft, finish the event details, then invite artists to join the lineup.'
      : createsEvent ? 'Create an event, then invite artists to join the lineup.'
        : hasArtists ? 'Explore venues, check open dates, and find events looking for artists.'
          : 'Add an artist profile or claim a venue to start booking.'
  const href = mode === 'draft' && draft ? `/dashboard/backstage/${draft.event.id}`
    : createsEvent ? '/dashboard/events/new' : hasArtists ? '/dashboard/venues' : '/dashboard/profiles'
  const label = mode === 'draft' ? 'Continue draft' : createsEvent ? 'Create Event' : hasArtists ? 'Explore Venues' : 'Manage Profiles'

  return (
    <section aria-labelledby="dashboard-start-title" data-dashboard-create-event={createsEvent ? '' : undefined} className="relative isolate overflow-hidden rounded-3xl border border-[#F0D9CA] bg-[linear-gradient(115deg,#FFF8EF_0%,#FFF1E5_60%,#FBE5D4_100%)] px-6 py-7 sm:px-8 sm:py-8">
      <div className="relative z-10 flex items-center gap-6">
        <div className="min-w-0 flex-1">
          <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-[#A34A22]">
            <Music2 className="h-4 w-4" aria-hidden="true" />{mode === 'draft' ? 'Back to the bill' : 'Make your next move'}
          </p>
          <h2 id="dashboard-start-title" className="max-w-lg text-3xl font-bold leading-tight tracking-tight text-[#2E241F] sm:text-4xl">{title}</h2>
          <p className="mt-3 max-w-lg text-sm leading-6 text-[#756255]">{description}</p>
          {draft && mode === 'draft' && <p className="mt-2 text-sm font-semibold text-[#614533]">{draft.event.title}{draft.profileLabel && ` · ${draft.profileLabel}`}</p>}
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <ButtonLink href={href} className="shadow-[0_4px_12px_rgba(185,82,28,0.12)]">
              {createsEvent ? <Plus className="h-4 w-4" aria-hidden="true" /> : null}{label}<ArrowRight className="h-4 w-4" aria-hidden="true" />
            </ButtonLink>
            {hasArtists && mode !== 'draft' && !createsEvent && <Link href="/events" className="inline-flex min-h-10 items-center gap-2 px-2 text-sm font-semibold text-[#79533E] hover:text-[#A84216]">Browse Events<ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></Link>}
          </div>
        </div>
        <div aria-hidden="true" className="relative hidden h-44 w-44 shrink-0 items-center justify-center sm:flex lg:h-52 lg:w-52">
          <div className="absolute inset-0 rounded-full border border-[#DFAE8D]/35" />
          <div className="absolute inset-5 rounded-full border border-[#DFAE8D]/35" />
          <div className="absolute inset-10 rounded-full bg-white/40" />
          <div className="absolute inset-y-8 left-3 flex items-center gap-1.5 opacity-40">
            {[16, 36, 26, 62, 40, 82, 54, 96, 68, 86, 40, 64, 28, 42, 18].map((height, index) => <span key={index} style={{ height }} className="w-1.5 rounded-full bg-[#E5A074]" />)}
          </div>
          <div className="relative flex h-28 w-24 -rotate-12 items-center justify-center rounded-3xl border border-white/80 bg-[#FFF9F2]/90 text-[#C76C36] shadow-[8px_15px_28px_rgba(135,77,36,0.12)]">
            {createsEvent || mode === 'draft' ? <Radio className="h-14 w-14" strokeWidth={1.4} /> : <Mic2 className="h-14 w-14" strokeWidth={1.4} />}
          </div>
        </div>
      </div>
    </section>
  )
}

export function DashboardDiscoverySection({ discovery }: { discovery: DashboardDiscovery }) {
  if (!discovery.kind) return null
  const venues = discovery.kind === 'venues'
  const directoryHref = venues ? '/dashboard/venues' : '/dashboard/bands'
  return (
    <section aria-label={venues ? 'Venues to explore' : 'Artists to explore'}>
      <SectionHeading
        title={venues ? 'Venues to explore' : 'Artists to explore'}
        description={discovery.event ? `For ${discovery.event.title}. Send invitations from Backstage.` : undefined}
        action={<Link href={directoryHref} className="inline-flex items-center gap-1 text-sm font-semibold text-[#777777] hover:text-[#A84216]">{venues ? 'All venues' : 'All artists'}<ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></Link>}
      />
      {discovery.cards.length ? (
        <div className="grid gap-4 sm:grid-cols-3">
          {discovery.cards.map((card) => (
            <Link key={card.id} href={card.href} className="group grid grid-cols-[88px_minmax(0,1fr)] overflow-hidden rounded-2xl border border-[#E6E6E6] bg-white transition-colors hover:border-[#DBBAA6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FD6A2F] sm:block">
              <div className="relative min-h-28 overflow-hidden bg-[#EEEAE3] sm:h-28">
                {card.imageUrl ? <Image src={card.imageUrl} alt="" fill sizes="(max-width: 639px) 100vw, 320px" className="object-cover transition-transform duration-300 group-hover:scale-105" /> : (
                  <div className="absolute inset-0 flex items-center justify-center bg-[linear-gradient(135deg,#EEE8DF,#E5DBCC)]">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full border border-white/70 bg-white/35 text-xl font-semibold text-[#A38A74] sm:h-16 sm:w-16 sm:text-2xl">{card.name.trim().slice(0, 2).toUpperCase()}</span>
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 className="break-words font-semibold text-[#252525] group-hover:text-[#A84216]">{card.name}</h3>
                {card.location && <p className="mt-1 flex items-start gap-1 text-xs text-[#888888]"><MapPin className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />{card.location}</p>}
                {card.genres.length > 0 && <p className="mt-2 text-xs leading-5 text-[#777777]">{card.genres.join(' · ')}</p>}
                {card.reason && <p className="mt-2 text-xs font-medium leading-5 text-[#A34A22]">{card.reason}</p>}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <p className="rounded-2xl border border-dashed border-[#DDD8D1] px-5 py-4 text-sm leading-6 text-[#777777]">{discovery.available ? 'Explore the directory to search by location and genre.' : 'Suggestions could not be loaded. You can still explore the directory.'}</p>
      )}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        {discovery.profileHint && <Link href={discovery.profileHint.href} className="text-xs leading-5 text-[#777777] underline decoration-[#CFC7BE] underline-offset-4 hover:text-[#A84216]">{discovery.profileHint.text}</Link>}
        {discovery.event && <Link href={`/dashboard/backstage/${discovery.event.id}`} className="inline-flex min-h-9 items-center gap-1 text-sm font-semibold text-[#A84216]">Invite artists<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>}
      </div>
    </section>
  )
}
