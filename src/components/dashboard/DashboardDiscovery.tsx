import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, ArrowUpRight, MapPin, Plus } from 'lucide-react'
import { ButtonLink } from '@/components/ui/primitives'
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
    <section aria-labelledby="dashboard-start-title" data-dashboard-create-event={createsEvent ? '' : undefined} className="dashboard-feature">
      <div className="dashboard-feature-copy">
        <h2 id="dashboard-start-title">{title}</h2>
        <p>{description}</p>
        {draft && mode === 'draft' && <strong className="text-peach">{draft.event.title}{draft.profileLabel && ` · ${draft.profileLabel}`}</strong>}
        <div className="dashboard-feature-actions">
          <ButtonLink href={href}>{createsEvent && <Plus size={17} aria-hidden="true" />}{label}<ArrowRight size={17} aria-hidden="true" /></ButtonLink>
          {hasArtists && mode !== 'draft' && !createsEvent && <Link href="/events" className="feature-secondary">Browse Events<ArrowUpRight size={16} aria-hidden="true" /></Link>}
        </div>
      </div>
      <div className="dashboard-feature-photo" aria-hidden="true">
        <Image src="/concert-hero.jpg" alt="" fill priority sizes="(max-width: 639px) 100vw, (min-width: 2000px) 840px, 50vw" className="object-cover" />
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
      <div className="workspace-section-head">
        <h2>{venues ? 'Venues to explore' : 'Artists to explore'}</h2>
        <Link href={directoryHref} className="workspace-text-link">{venues ? 'All venues' : 'All artists'}<ArrowRight size={16} aria-hidden="true" /></Link>
      </div>
      {discovery.event && <p className="mb-4 text-sm text-text-secondary">For {discovery.event.title}. Send invitations from Backstage.</p>}
      {discovery.cards.length ? (
        <div className="discovery-grid">
          {discovery.cards.map((card) => (
            <Link key={card.id} href={card.href} className="discovery-card">
              <div className="discovery-art" data-photo={!!card.imageUrl}>
                {card.imageUrl
                  ? <Image src={card.imageUrl} alt="" fill sizes="(max-width: 639px) 100vw, (min-width: 2000px) 420px, 30vw" className="object-cover" />
                  : <span aria-hidden="true" className="discovery-grooves"><i /><i /><i /></span>}
                <h3>{card.name}</h3>
              </div>
              <div className="discovery-detail">
                {card.location && <p className="flex items-start gap-1.5 font-semibold"><MapPin size={15} className="mt-0.5 shrink-0" aria-hidden="true" />{card.location}</p>}
                {card.genres.length > 0 && <p>{card.genres.join(' · ')}</p>}
                {card.reason && <p className="discovery-reason">{card.reason}</p>}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <p className="rounded-2xl border border-dashed border-border px-5 py-4 text-sm leading-6 text-text-secondary">{discovery.available ? 'Explore the directory to search by location and genre.' : 'Suggestions could not be loaded. You can still explore the directory.'}</p>
      )}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        {discovery.profileHint && <Link href={discovery.profileHint.href} className="text-xs leading-5 text-text-secondary underline decoration-sand-light underline-offset-4 hover:text-brand-tint-text">{discovery.profileHint.text}</Link>}
        {discovery.event && <Link href={`/dashboard/backstage/${discovery.event.id}`} className="inline-flex min-h-9 items-center gap-1 text-sm font-semibold text-brand-tint-text">Invite artists<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>}
      </div>
    </section>
  )
}
