import type { CSSProperties, ReactNode } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import type { EventPageSectionId } from '@/components/events/event-page-config'
import type { ProfilePageSectionContent } from '@/components/profile-page/profile-page-types'

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

export function EventPageHero({ event, actions }: { event: EventOverviewData; actions?: ReactNode }) {
  return (
    <header className="relative overflow-hidden border-b-4 bg-[#191619] text-white" style={{ borderColor: event.accent }}>
      {event.cover && (
        <Image src={event.cover} alt="" fill sizes="100vw" unoptimized className="object-cover object-center" />
      )}
      <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/50 to-black/85" />
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse at top left, ' + event.accent + '55, transparent 65%)' }}
      />
      <div className="artist-page-hero-inner relative mx-auto max-w-7xl px-6 py-12 sm:py-16 lg:px-8 lg:py-20">
        {actions && <div className="mb-7 flex flex-wrap items-center gap-3">{actions}</div>}
        <div className="artist-page-hero-main max-w-4xl">
          <h1 className="break-words font-[var(--font-barlow)] text-4xl font-black leading-tight sm:text-6xl">{event.title}</h1>
          <p className="mt-3 text-base font-semibold text-white/95 sm:text-lg">{event.venue} · {event.date}</p>
          {event.location && <p className="mt-1 text-sm text-white/85">{event.location}</p>}
          {event.genres.length > 0 && (
            <div className="artist-page-genres mt-4 flex flex-wrap gap-2">
              {event.genres.map((genre) => (
                <span key={genre} className="rounded-full border border-white/30 bg-black/30 px-3 py-1 text-xs font-medium">{genre}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

function EventPane({ title, id, children }: { title: string; id?: string; children: ReactNode }) {
  return (
    <section id={id} className="h-full scroll-mt-8 rounded-[28px] border border-[#E8E8E8] bg-white p-6 shadow-sm">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-[#666666]">{title}</h2>
      <div className="mt-3 text-sm leading-relaxed text-[#252525]">{children}</div>
    </section>
  )
}

export function createEventPageSections(event: EventOverviewData, preview = false): ProfilePageSectionContent<EventPageSectionId>[] {
  const sections: ProfilePageSectionContent<EventPageSectionId>[] = [
    {
      sectionId: 'description',
      content: <EventPane title="Event description" id={preview ? undefined : 'event-description'}>
        <p className="whitespace-pre-wrap break-words">{event.description}</p>
      </EventPane>,
    },
    {
      sectionId: 'capacity',
      content: <EventPane title="Capacity"><p className="text-xl font-semibold">{event.capacity.toLocaleString('en-US')} attendees</p></EventPane>,
    },
  ]

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
                    <Link href={'/bands/' + artist.slug} className="block rounded-xl border border-[#E8E8E8] bg-[#FCFCFC] px-4 py-3 font-semibold hover:border-[#CCCCCC]">
                      {artist.name}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[#666666]">
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
          {event.artistNeed ?? 'This pane appears when the event is accepting artists.'}
        </p>
      </EventPane>,
    })
  }

  return sections
}
