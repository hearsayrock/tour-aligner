import type { CSSProperties, ReactNode } from 'react'
import { ProfilePageSectionGrid } from './ProfilePageSectionGrid'
export { ProfilePageSectionGrid } from './ProfilePageSectionGrid'
import {
  type ProfilePageLayout,
  type ProfilePageSectionContent,
} from '@/components/profile-page/profile-page-types'

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
