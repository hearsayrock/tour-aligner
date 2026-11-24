import Image from 'next/image'
import type { ReactNode } from 'react'
import type { StudioDoc } from '@/lib/studio/model'
import { StudioEditSection } from './StudioEditSection'

export function ArtistHome({
  doc,
  name,
  place,
  genres,
  artwork,
  facts,
  actions,
  onEdit,
}: {
  doc: StudioDoc
  name: string
  place: string
  genres: string[]
  artwork: ReactNode
  facts: ReactNode
  actions: ReactNode
  onEdit?: (panel: string) => void
}) {
  function section(panel: string, label: string, child: ReactNode) {
    return (
      <StudioEditSection label={label} onEdit={onEdit && (() => onEdit(panel))}>
        {child}
      </StudioEditSection>
    )
  }
  return (
    <section className="artist-hero">
      {artwork}
      <div className="artist-hero-body">
        <div className="artist-hero-intro">
          {section(
            'Look',
            'Change photo',
            doc.look.avatar && (
              <Image
                src={doc.look.avatar}
                width={68}
                height={68}
                unoptimized
                alt=""
                className="studio-avatar"
              />
            )
          )}
          {section(
            'Identity',
            'Edit identity',
            <div>
              <p className="studio-kicker">
                {[doc.fields.artist_type === 'solo' ? 'Solo artist' : 'Band', place]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
              <h1>{name}</h1>
            </div>
          )}
          {section(
            'Tagline',
            'Edit tagline',
            doc.fields.tagline && <p className="studio-tagline">{doc.fields.tagline}</p>
          )}
        </div>
        <div className="artist-hero-bottom">
          {section(
            'Genres',
            'Edit genres',
            <ul className="studio-chips">
              {genres.map((g) => (
                <li key={g}>{g}</li>
              ))}
            </ul>
          )}
          <div className="studio-actions">{actions}</div>
        </div>
      </div>
      {facts}
    </section>
  )
}
