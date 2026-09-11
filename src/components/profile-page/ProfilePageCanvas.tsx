import type { CSSProperties, ReactNode } from 'react'
import {
  type ProfilePageLayout,
  type ProfilePageSectionContent,
} from '@/components/profile-page/profile-page-types'

const SPAN_CLASSES = {
  4: 'lg:col-span-4',
  6: 'lg:col-span-6',
  8: 'lg:col-span-8',
  12: 'lg:col-span-12',
} as const

export function ProfilePageSectionGrid<SectionId extends string>({
  layout,
  sections,
}: {
  layout: ProfilePageLayout<SectionId>
  sections: readonly ProfilePageSectionContent<SectionId>[]
}) {
  const contentById = new Map(sections.map((section) => [section.sectionId, section.content]))

  return (
    <div className="artist-page-grid mx-auto grid max-w-7xl grid-cols-1 gap-8 px-6 py-10 lg:grid-cols-12 lg:px-8 lg:py-12">
      {layout.sections
        .filter((item) => item.visible && contentById.has(item.sectionId))
        .sort((a, b) => a.order - b.order)
        .map((item) => (
          <div key={item.sectionId} className={`min-w-0 ${SPAN_CLASSES[item.span]}`}>
            {contentById.get(item.sectionId)}
          </div>
        ))}
    </div>
  )
}

export function ProfilePageCanvas<SectionId extends string>({
  layout,
  hero,
  sections,
  className,
  style,
}: {
  layout: ProfilePageLayout<SectionId>
  hero: ReactNode
  sections: readonly ProfilePageSectionContent<SectionId>[]
  className?: string
  style?: CSSProperties
}) {
  return (
    <div
      className={`profile-page-frame ${className ?? ''}`}
      data-hero-height={layout.hero.height}
      data-hero-alignment={layout.hero.alignment}
      style={style}
    >
      {hero}
      <ProfilePageSectionGrid layout={layout} sections={sections} />
    </div>
  )
}
