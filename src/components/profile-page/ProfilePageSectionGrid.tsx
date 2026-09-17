'use client'

import { ProfilePageSurface } from './ProfilePageSurface'
import type { ProfilePageLayout, ProfilePageSectionContent } from './profile-page-types'

export function ProfilePageSectionGrid<SectionId extends string>({ layout, sections }: {
  layout: ProfilePageLayout<SectionId>
  sections: readonly ProfilePageSectionContent<SectionId>[]
}) {
  const contentById = new Map(sections.map((section) => [section.sectionId, section.content]))
  return <ProfilePageSurface items={layout.sections
    .filter((item) => item.visible && contentById.has(item.sectionId))
    .sort((a, b) => a.order - b.order)} renderItem={(item, className, style) => (
      <div key={item.sectionId} data-section-id={item.sectionId} className={className} style={style}>
        {contentById.get(item.sectionId)}
      </div>
    )} />
}
