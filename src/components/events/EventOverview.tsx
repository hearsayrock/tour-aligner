import type { CSSProperties, ReactNode } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import type { EventPageSectionId } from '@/components/events/event-page-config'
import type { ProfilePageLayout, ProfilePageSectionContent } from '@/components/profile-page/profile-page-types'

export type EventOverviewData = {
  title: string
  description: string
  date: string
  venue: string
  location: string
  accent: string
  cover: string | null
  genres: string[]
  capacity: number
  artistNeed: string | null
  lineup: { id: string; name: string; slug: string }[] | null
}

export function eventFrameStyle(color: string, background: string | null, opacity: number): CSSProperties {
  const overlay = 'color-mix(in srgb, ' + color + ' ' + (100 - opacity) + '%, transparent)'
  return {
    backgroundColor: color,
    ...(background && opacity > 0 ? {
      backgroundImage: 'linear-gradient(' + overlay + ', ' + overlay + '), url(' + JSON.stringify(background) + ')',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundAttachment: 'fixed',
    } : {}),
  }
}

export function EventPageHero({ event, layout, actions }: {
  event: EventOverviewData
  layout: ProfilePageLayout<EventPageSectionId>
  actions?: ReactNode
}) {
  const showGenres = !layout.sections.some((section) => section.sectionId === 'genres' && section.visible)
  return (
    <header data-theme="cream" className="border-b-[1.5px] border-edge bg-page text-ink">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-strong py-4">
          <Link href="/" className="inline-flex min-h-12 items-center">
            <Image src="/touraligner/brand/touraligner-logo-dark.svg" alt="TourAligner" width={126} height={35} />
          </Link>
          {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
        </div>
        <div className="artist-page-hero-inner grid items-center gap-6 py-8 sm:py-12 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-12">
          <div className="artist-page-hero-main min-w-0">
            {event.date && <p className="font-ds-mono text-xs font-semibold tracking-widest uppercase text-brand-text sm:text-sm">{event.date}</p>}
            <h1 className="mt-3 font-ds-display text-[clamp(3.5rem,8vw,7.5rem)] leading-[0.9] font-extrabold tracking-tight uppercase [overflow-wrap:anywhere]">{event.title}</h1>
            <div className="mt-6 border-l-4 pl-4" style={{ borderColor: event.accent }}>
              <p className="text-lg font-bold sm:text-xl">{event.venue}</p>
              {event.location && <p className="text-sm text-text-secondary">{event.location}</p>}
            </div>
            {showGenres && event.genres.length > 0 && (
              <ul className="artist-page-genres mt-5 flex flex-wrap gap-2">
                {event.genres.map((genre) => <li key={genre} className="rounded-full border border-edge px-3 py-1 text-xs font-medium">{genre}</li>)}
              </ul>
            )}
          </div>
          <div className="relative aspect-[2.4] overflow-hidden rounded-ds-2xl border-[1.5px] border-edge bg-cocoa shadow-hard sm:aspect-[2.8] lg:aspect-[1.4]">
            <Image src={event.cover || '/touraligner/samples/desert.svg'} alt="" fill priority unoptimized
              sizes="(min-width: 1024px) 44vw, 95vw" className={event.cover ? 'object-contain' : 'object-cover'} />
          </div>
        </div>
      </div>
    </header>
  )
}

function EventPane({ title, id, children }: { title: string; id?: string; children: ReactNode }) {
  return (
    <section id={id} className="h-full scroll-mt-8 rounded-ds-2xl border border-border bg-surface p-6">
      <h2 className="font-ds-display text-2xl leading-none font-extrabold uppercase text-ink">{title}</h2>
      <div className="mt-3 text-sm leading-relaxed text-ink">{children}</div>
    </section>
  )
}

export function createEventPageSections(event: EventOverviewData, preview = false): ProfilePageSectionContent<EventPageSectionId>[] {
  const sections: ProfilePageSectionContent<EventPageSectionId>[] = [
    {
      sectionId: 'description',
      content: <EventPane title="Event description" id={preview ? undefined : 'event-description'}>
        <p className="whitespace-pre-wrap break-words">{event.description || (preview ? 'Add a description for the show.' : '')}</p>
      </EventPane>,
    },
    {
      sectionId: 'capacity',
      content: <EventPane title="Capacity">
        <p className="text-xl font-semibold">{event.capacity > 0 ? event.capacity.toLocaleString('en-US') + ' attendees' : 'Set attendee capacity.'}</p>
      </EventPane>,
    },
    {
      sectionId: 'details',
      content: <EventPane title="Event details">
        <p className="font-semibold">{event.date || 'Set the date and start time.'}</p>
        <p>{event.venue}</p>
      </EventPane>,
    },
  ]

  if (event.genres.length || preview) {
    sections.push({
      sectionId: 'genres',
      content: <EventPane title="Genres">
        {event.genres.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {event.genres.map((genre) => (
              <li key={genre} className="rounded-full border border-border px-3 py-1 font-medium">{genre}</li>
            ))}
          </ul>
        ) : <p>Choose the genres on the bill.</p>}
      </EventPane>,
    })
  }

  if (event.lineup || preview) {
    sections.push({
      sectionId: 'lineup',
      content: (
        <EventPane title="Lineup">
          {event.lineup?.length ? (
            <ul className="space-y-2">
              {event.lineup.map((artist) => (
                <li key={artist.id}>
                  {preview ? <span className="font-semibold">{artist.name}</span> : (
                    <Link href={'/bands/' + artist.slug} className="block rounded-xl border border-border bg-field px-4 py-3 font-semibold hover:border-edge">
                      {artist.name}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-text-secondary">
              {preview && !event.lineup ? 'This pane appears after you publish the lineup in Backstage.' : 'Lineup has not been announced yet.'}
            </p>
          )}
        </EventPane>
      ),
    })
  }

  if (event.artistNeed !== null || preview) {
    sections.push({
      sectionId: 'artist-call',
      content: <EventPane title="Artists needed">
        <p className="whitespace-pre-wrap break-words">
          {event.artistNeed === null
            ? 'This pane appears when the event is accepting artists.'
            : event.artistNeed || (preview ? 'Describe the artists you need for the show.' : '')}
        </p>
      </EventPane>,
    })
  }

  return sections
}
